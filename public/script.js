// On page load, restore ongoing download if exists
window.addEventListener('DOMContentLoaded', () => {
    const savedState = localStorage.getItem('downloadState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            // Restore UI state
            document.getElementById('url').value = state.url || '';
            document.getElementById('filename').value = state.filename || '';

            // If there's an active jobId, reconnect to it
            if (state.jobId) {
                console.log('Restoring download progress for job:', state.jobId);
                restoreDownload(state.jobId);
            }
        } catch (e) {
            console.error('Failed to restore download state:', e);
            localStorage.removeItem('downloadState');
        }
    }
});

// Function to restore an ongoing download
function restoreDownload(jobId) {
    const downloadBtn = document.getElementById('downloadBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    const statusMessage = document.getElementById('statusMessage');

    // Show progress UI
    downloadBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressText.textContent = 'Reconnecting...';

    let hasReceivedData = false;

    // Set timeout to detect if connection failed (job doesn't exist anymore)
    const connectionTimeout = setTimeout(() => {
        if (!hasReceivedData) {
            console.log('Connection timeout - job may no longer exist');
            statusMessage.textContent = 'Previous download session not found. Starting fresh.';
            statusMessage.className = 'status-message';
            downloadBtn.disabled = false;
            progressContainer.style.display = 'none';
            localStorage.removeItem('downloadState');
        }
    }, 3000); // 3 second timeout

    // Subscribe to events
    subscribeToProgress(jobId, {
        onDownloading: (data) => {
            hasReceivedData = true;
            clearTimeout(connectionTimeout);

            const percent = data.progress;
            progressFill.style.width = `${percent}%`;
            progressPercent.textContent = `${percent}%`;

            if (data.phase === 'video') {
                progressText.textContent = 'Downloading Video...';
            } else if (data.phase === 'audio') {
                progressText.textContent = 'Downloading Audio...';
            } else {
                progressText.textContent = 'Downloading...';
            }
        },
        onMerging: () => {
            hasReceivedData = true;
            clearTimeout(connectionTimeout);

            progressText.textContent = 'Merging video and audio...';
            progressFill.style.width = '100%';
        },
        onCompleted: (filename) => {
            hasReceivedData = true;
            clearTimeout(connectionTimeout);

            progressText.textContent = 'Download Complete!';
            progressFill.style.width = '100%';

            downloadFile(filename);

            statusMessage.textContent = 'Success!';
            statusMessage.className = 'status-message success';
            downloadBtn.disabled = false;

            // Clear saved state
            localStorage.removeItem('downloadState');
        },
        onError: (message) => {
            clearTimeout(connectionTimeout);

            statusMessage.textContent = `Error: ${message}`;
            statusMessage.className = 'status-message error';
            downloadBtn.disabled = false;
            progressContainer.style.display = 'none';

            // Clear saved state
            localStorage.removeItem('downloadState');
        },
        onConnectionError: () => {
            // Job not found on server - clean up and reset UI
            clearTimeout(connectionTimeout);

            console.log('Job not found on server, clearing saved state');
            statusMessage.textContent = 'Previous download session expired. Please start a new download.';
            statusMessage.className = 'status-message';
            downloadBtn.disabled = false;
            progressContainer.style.display = 'none';

            // Clear saved state
            localStorage.removeItem('downloadState');
        }
    });
}

// Reusable function to subscribe to progress events
function subscribeToProgress(jobId, callbacks) {
    const eventSource = new EventSource(`/events/${jobId}`);
    let errorCount = 0;

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.status === 'downloading' && callbacks.onDownloading) {
            callbacks.onDownloading(data);
        } else if (data.status === 'merging' && callbacks.onMerging) {
            callbacks.onMerging(data);
        } else if (data.status === 'completed' && callbacks.onCompleted) {
            eventSource.close();
            callbacks.onCompleted(data.filename);
        } else if (data.status === 'error' && callbacks.onError) {
            eventSource.close();
            callbacks.onError(data.message);
        }
    };

    eventSource.onerror = (event) => {
        errorCount++;
        eventSource.close();

        // Check if this is a connection error (job not found)
        // EventSource will trigger onerror immediately if it gets 404 or similar
        if (errorCount === 1 && event.target.readyState === EventSource.CLOSED) {
            // Likely a 404 or job not found - use onConnectionError if available
            if (callbacks.onConnectionError) {
                callbacks.onConnectionError();
            } else if (callbacks.onError) {
                callbacks.onError('Job not found on server.');
            }
        } else {
            // Regular connection error
            if (callbacks.onError) {
                callbacks.onError('Connection lost. The download may have completed or failed.');
            }
        }
    };

    return eventSource;
}

document.getElementById('downloadBtn').addEventListener('click', async () => {
    const urlInput = document.getElementById('url');
    const filenameInput = document.getElementById('filename');
    const statusMessage = document.getElementById('statusMessage');
    const downloadBtn = document.getElementById('downloadBtn');

    // Progress elements
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');

    const url = urlInput.value.trim();
    const filename = filenameInput.value.trim();

    if (!url) {
        statusMessage.textContent = 'Please enter a valid YouTube URL.';
        statusMessage.className = 'status-message error';
        return;
    }

    // Reset UI
    statusMessage.textContent = '';
    statusMessage.className = 'status-message';
    downloadBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    progressText.textContent = 'Initializing...';

    try {
        // Start Job
        const response = await fetch('/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, filename })
        });

        if (!response.ok) {
            let errorMessage = 'Failed to start download';
            try {
                const errorData = await response.json();
                // For 429 errors, show the detailed message from server
                if (response.status === 429) {
                    errorMessage = errorData.message || 'Too many concurrent downloads. Please try again later.';
                } else {
                    errorMessage = errorData.error || errorMessage;
                }
            } catch (e) {
                // If JSON parse fails, read text (it might be an HTML error page)
                const text = await response.text();
                console.error('Non-JSON response:', text);
                errorMessage = `Server Error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }



        let jobId;
        try {
            const data = await response.json();
            jobId = data.jobId;
        } catch (e) {
            const text = await response.text();
            console.error('Invalid JSON response:', text);
            throw new Error('Server returned invalid response (not JSON). See console for details.');
        }

        // Save state to localStorage for recovery after page refresh
        localStorage.setItem('downloadState', JSON.stringify({
            jobId: jobId,
            url: url,
            filename: filename
        }));

        // Subscribe to progress using the reusable function
        subscribeToProgress(jobId, {
            onDownloading: (data) => {
                const percent = data.progress;
                progressFill.style.width = `${percent}%`;
                progressPercent.textContent = `${percent}%`;

                if (data.phase === 'video') {
                    progressText.textContent = 'Downloading Video...';
                } else if (data.phase === 'audio') {
                    progressText.textContent = 'Downloading Audio...';
                } else {
                    progressText.textContent = 'Downloading...';
                }
            },
            onMerging: () => {
                progressText.textContent = 'Merging video and audio...';
                progressFill.style.width = '100%';
            },
            onCompleted: (filename) => {
                progressText.textContent = 'Download Complete!';
                progressFill.style.width = '100%';

                downloadFile(filename);

                statusMessage.textContent = 'Success!';
                statusMessage.className = 'status-message success';
                downloadBtn.disabled = false;

                // Clear saved state
                localStorage.removeItem('downloadState');
            },
            onError: (message) => {
                statusMessage.textContent = `Error: ${message}`;
                statusMessage.className = 'status-message error';
                downloadBtn.disabled = false;
                progressContainer.style.display = 'none';

                // Clear saved state
                localStorage.removeItem('downloadState');
            }
        });

    } catch (error) {
        console.error(error);
        statusMessage.textContent = `Error: ${error.message}`;
        statusMessage.className = 'status-message error';
        downloadBtn.disabled = false;
        progressContainer.style.display = 'none';

        // Clear saved state on error
        localStorage.removeItem('downloadState');
    }
});

function downloadFile(filename) {
    const link = document.createElement('a');
    link.href = `/file/${filename}`;
    link.download = filename; // This might be redundant as server sets filename, but good practice
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
