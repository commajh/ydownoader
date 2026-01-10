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
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                // If JSON parse fails, read text (it might be an HTML error page)
                const text = await response.text();
                console.error('Non-JSON response:', text);
                errorMessage = `Server Error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const { jobId } = await response.json();

        // Subscribe to events
        const eventSource = new EventSource(`/events/${jobId}`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.status === 'downloading') {
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
            } else if (data.status === 'merging') {
                progressText.textContent = 'Merging video and audio...';
                progressFill.style.width = '100%';
            } else if (data.status === 'completed') {
                progressText.textContent = 'Download Complete!';
                progressFill.style.width = '100%';

                eventSource.close();
                downloadFile(data.filename);

                statusMessage.textContent = 'Success!';
                statusMessage.className = 'status-message success';
                downloadBtn.disabled = false;

                // Optional: hide progress bar after delay
                // setTimeout(() => progressContainer.style.display = 'none', 3000);
            } else if (data.status === 'error') {
                eventSource.close();
                throw new Error(data.message);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            // Don't throw here immediately, wait for specific error message or timeout
            // But if connection dies, we might assume failure
        };

    } catch (error) {
        console.error(error);
        statusMessage.textContent = `Error: ${error.message}`;
        statusMessage.className = 'status-message error';
        downloadBtn.disabled = false;
        progressContainer.style.display = 'none';
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
