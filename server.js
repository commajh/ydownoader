const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
// const ffmpegPath = require('ffmpeg-static'); // Removing reliance on ffmpeg-static for Linux
const os = require('os');

// Determine ffmpeg path relative to platform
let ffmpegBinary = 'ffmpeg';
if (process.platform === 'win32') {
    // On Windows, use the static binary if available, or assume it's in path
    try {
        ffmpegBinary = require('ffmpeg-static');
    } catch (e) {
        console.log('ffmpeg-static not found, assuming global ffmpeg');
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Body:', JSON.stringify(req.body).substring(0, 200)); // Log body (truncated)

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
        '--ffmpeg-location', ffmpegPath,
        '-f', 'bestvideo+bestaudio/best',
        '--merge-output-format', 'mp4', // This triggers the merge
        '--postprocessor-args', 'merger:-c:v copy -c:a aac', // Force video copy and Audio to AAC (most compatible open standard)
        '-o', outputTemplate,
        '--newline', // Important for parsing line-by-line
        url
    ];

    // Determine yt-dlp path based on platform
    let ytDlpPath = 'yt-dlp'; // Default to global command (Docker/Linux)
    if (process.platform === 'win32') {
        const localVenvPath = path.join(__dirname, '.venv', 'Scripts', 'yt-dlp.exe');
        if (fs.existsSync(localVenvPath)) {
            ytDlpPath = localVenvPath;
        }
    }

    const process = spawn(ytDlpPath, args);

    process.on('error', (err) => {
        console.error('Failed to start yt-dlp process:', err);
        broadcastProgress(jobId, { status: 'error', message: 'Internal Server Error: Failed to start downloader' });
        jobs.delete(jobId);
    });

    process.stdout.on('data', (data) => {
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

    process.stderr.on('data', (data) => {
        // console.error(`stderr: ${data}`); // Optional: keep logs clean
    });

    process.on('close', (code) => {
        console.log(`Job ${jobId} finished with code ${code}`);
        if (code === 0) {
            broadcastProgress(jobId, { status: 'completed', filename: `${finalFilename}.mp4` });
        } else {
            broadcastProgress(jobId, { status: 'error', message: 'Download failed' });
        }

        // Remove job after a delay to allow last event to send
        setTimeout(() => jobs.delete(jobId), 10000);
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
            // Cleanup after send - DISABLED
            // fs.unlink(filePath, () => { });
        });
    } else {
        res.status(404).send('File not found');
    }
});

// Render and Docker require binding to 0.0.0.0 to be accessible
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at:`);
    console.log(`- Local:   http://localhost:${PORT}`);
    // console.log(`- Network: http://${localIp}:${PORT}`); // Network IP hidden per user request
});
