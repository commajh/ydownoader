const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
// const ffmpegPath = require('ffmpeg-static'); // Removing reliance on ffmpeg-static for Linux
const os = require('os');

// Determine ffmpeg path relative to platform
let ffmpegBinary = null; // Default: let yt-dlp find it in PATH (Linux/Docker)
if (process.platform === 'win32') {
    // On Windows, use the static binary if available, or assume it's in path
    try {
        ffmpegBinary = require('ffmpeg-static');
    } catch (e) {
        console.log('ffmpeg-static not found, assuming global ffmpeg');
        // If not found, we can try 'ffmpeg' but usually on Windows we want the full path if possible
        // forcing null will let yt-dlp try to find it in PATH
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Maximum concurrent download jobs allowed
const MAX_CONCURRENT_JOBS = 5;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    const bodyStr = req.body ? JSON.stringify(req.body) : '';
    console.log('Body:', bodyStr.substring(0, 200)); // Log body (truncated)

    // Capture response status
    const originalSend = res.send;
    res.send = function (body) {
        console.log(`[${new Date().toISOString()}] Response Status: ${res.statusCode}`);
        if (res.statusCode >= 400) {
            console.error('Response Body:', body);
        }
        originalSend.apply(res, arguments);
    };
    next();
});

// Store active jobs: jobId -> { parsedProgress: number, clients: Response[] }
const jobs = new Map();

function broadcastProgress(jobId, data) {
    const job = jobs.get(jobId);
    if (!job) return;

    // Cleanup finished clients
    job.clients = job.clients.filter(res => !res.destroyed);

    job.clients.forEach(res => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

app.post('/download', (req, res) => {
    const { url, filename } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Check concurrent job limit
    const activeJobs = jobs.size;
    if (activeJobs >= MAX_CONCURRENT_JOBS) {
        console.log(`Job limit reached: ${activeJobs}/${MAX_CONCURRENT_JOBS} active jobs`);
        return res.status(429).json({
            error: 'Too many concurrent downloads',
            message: `Maximum ${MAX_CONCURRENT_JOBS} concurrent downloads allowed. Please try again later.`,
            activeJobs: activeJobs
        });
    }

    const jobId = crypto.randomUUID();
    const finalFilename = filename ? filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_') : `video_${jobId}`;
    const outputTemplate = path.join(__dirname, 'downloads', `${finalFilename}.%(ext)s`);

    // Ensure downloads directory exists
    const downloadsDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir);
    }

    // Initialize job
    jobs.set(jobId, { clients: [], phase: 'initializing' }); // phase: initializing, video, audio, merging

    console.log(`Starting job ${jobId} for: ${url}`);

    // Run yt-dlp asynchronously
    const args = [
        '--ffmpeg-location', ffmpegBinary,
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best', // Prefer mp4/m4a for better iOS compatibility
        '--merge-output-format', 'mp4', // This triggers the merge
        // Re-encode video to H.264 (libx264) for iPhone compatibility
        // Use AAC audio codec, add faststart flag for web/mobile streaming
        '--postprocessor-args', 'merger:-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k -movflags +faststart',
        '-o', outputTemplate,
        '--newline', // Important for parsing line-by-line
        url
    ];

    // Check if we should keep intermediate files (optional, currently disabled)
    // args.push('-k');

    // Determine yt-dlp path based on platform
    let ytDlpPath = 'yt-dlp'; // Default to global command (Docker/Linux)
    if (process.platform === 'win32') {
        const localVenvPath = path.join(__dirname, '.venv', 'Scripts', 'yt-dlp.exe');
        if (fs.existsSync(localVenvPath)) {
            ytDlpPath = localVenvPath;
        }
    }

    const ytDlpProcess = spawn(ytDlpPath, args);

    ytDlpProcess.on('error', (err) => {
        console.error('Failed to start yt-dlp process:', err);
        broadcastProgress(jobId, { status: 'error', message: 'Internal Server Error: Failed to start downloader' });
        jobs.delete(jobId);
    });

    ytDlpProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            const job = jobs.get(jobId);
            if (!job) return;

            // Detect phase change based on Destination
            // Usually Video is first, Audio second
            if (line.includes('[download] Destination:')) {
                if (job.phase === 'initializing' || job.phase === 'video') {
                    // If we were initializing, this is video.
                    // If we were audio (unlikely to go back), stay.
                    // Simple heuristic: 1st dest = video, 2nd dest = audio
                    if (job.phase === 'initializing') job.phase = 'video';
                    else if (job.phase === 'video') job.phase = 'audio';
                }
            }

            // Parse progress: [download]  45.0% of 10.00MiB at  2.00MiB/s ETA 00:05
            if (line.includes('[download]')) {
                const percentMatch = line.match(/(\d+\.\d+)%/);
                if (percentMatch) {
                    const percent = parseFloat(percentMatch[1]);
                    // If we haven't detected destination yet but getting progress, assume video
                    if (job.phase === 'initializing') job.phase = 'video';

                    broadcastProgress(jobId, { status: 'downloading', phase: job.phase, progress: percent });
                } else if (line.includes('100%')) {
                    broadcastProgress(jobId, { status: 'downloading', phase: job.phase, progress: 100 });
                }
            } else if (line.includes('[Merger]')) {
                job.phase = 'merging';
                broadcastProgress(jobId, { status: 'merging', phase: 'merging', progress: 100 });
            }
        }
    });

    ytDlpProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`); // Enabled for debugging
    });

    ytDlpProcess.on('close', (code) => {
        console.log(`Job ${jobId} finished with code ${code}`);
        if (code === 0) {
            broadcastProgress(jobId, { status: 'completed', filename: `${finalFilename}.mp4` });
        } else {
            broadcastProgress(jobId, { status: 'error', message: 'Download failed' });
        }

        // Remove job after a delay to allow last event to send
        setTimeout(() => {
            jobs.delete(jobId);
            console.log(`Job ${jobId} removed. Active jobs: ${jobs.size}/${MAX_CONCURRENT_JOBS}`);
        }, 10000);
    });

    // Return current status immediately
    res.json({ jobId });
});

app.get('/events/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    // SSE Setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    job.clients.push(res);

    req.on('close', () => {
        // Client disconnected
        // cleanup handled in broadcast
    });
});

app.get('/file/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'downloads', filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) console.error(err);
            if (err) console.error(err);
            // Cleanup after send
            fs.unlink(filePath, () => {
                console.log(`Deleted file: ${filePath}`);
            });
        });
    } else {
        res.status(404).send('File not found');
    }
});

// Bind to 0.0.0.0 to allow access from other devices on the network
app.listen(PORT, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                localIp = alias.address;
            }
        }
    }
    console.log(`Server running at:`);
    console.log(`- Local:   http://localhost:${PORT}`);
    console.log(`- Network: http://${localIp}:${PORT}`);
    console.log(`\nUse the Network URL to access from iPad or other devices on the same Wi-Fi`);
});
