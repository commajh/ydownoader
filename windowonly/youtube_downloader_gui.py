#!/usr/bin/env python3
"""
YouTube Downloader - GUI Version
Windows standalone script with graphical interface
Requires: pip install yt-dlp
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import threading
import os
import sys
from pathlib import Path
import queue
import shutil
import subprocess

# Import yt-dlp as a module
try:
    import yt_dlp
except ImportError:
    # If running as script, show error dialog
    try:
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror(
            "Missing Dependency",
            "yt-dlp module not found!\n\nPlease install it with:\npip install yt-dlp"
        )
        root.destroy()
    except:
        print("ERROR: yt-dlp module not found!")
        print("Please install it with: pip install yt-dlp")
    sys.exit(1)

# Import imageio-ffmpeg for bundled ffmpeg binary
try:
    import imageio_ffmpeg
    FFMPEG_BINARY = imageio_ffmpeg.get_ffmpeg_exe()
    print(f"Using bundled ffmpeg: {FFMPEG_BINARY}")
except ImportError:
    print("WARNING: imageio-ffmpeg not found. Will try to use system ffmpeg.")
    FFMPEG_BINARY = None

class YouTubeDownloaderGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("YouTube Downloader")
        self.root.geometry("700x500")
        self.root.resizable(False, False)
        
        # Queue for thread-safe GUI updates
        self.message_queue = queue.Queue()
        
        # Variables
        self.is_downloading = False
        self.stop_requested = False
        
        # Setup UI
        self.setup_ui()
        
        # Start queue checker
        self.check_queue()

        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
    
    def setup_ui(self):
        """Setup the GUI layout"""
        # Main container with padding
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Title
        title = ttk.Label(main_frame, text="YouTube Downloader", font=('Arial', 16, 'bold'))
        title.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # URL Input
        ttk.Label(main_frame, text="YouTube URL:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.url_entry = ttk.Entry(main_frame, width=60)
        self.url_entry.grid(row=1, column=1, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        
        # Output Path
        ttk.Label(main_frame, text="Save to:").grid(row=2, column=0, sticky=tk.W, pady=5)
        self.path_entry = ttk.Entry(main_frame, width=50)
        default_path = str(Path.home() / "Downloads" / "YouTube")
        self.path_entry.insert(0, default_path)
        self.path_entry.grid(row=2, column=1, sticky=(tk.W, tk.E), pady=5)
        
        browse_btn = ttk.Button(main_frame, text="Browse...", command=self.browse_folder)
        browse_btn.grid(row=2, column=2, padx=(5, 0), pady=5)
        
        # Filename (optional)
        ttk.Label(main_frame, text="Filename (optional):").grid(row=3, column=0, sticky=tk.W, pady=5)
        self.filename_entry = ttk.Entry(main_frame, width=60)
        self.filename_entry.grid(row=3, column=1, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        
        # Quality Selection
        ttk.Label(main_frame, text="Quality:").grid(row=4, column=0, sticky=tk.W, pady=5)
        self.quality_var = tk.StringVar(value="720p")
        self.quality_combo = ttk.Combobox(main_frame, textvariable=self.quality_var, state="readonly")
        self.quality_combo['values'] = ("Best Quality", "4K (2160p)", "1080p", "720p", "480p", "Audio Only (MP3)")
        self.quality_combo.grid(row=4, column=1, sticky=tk.W, pady=5)

        # Download Button
        self.download_btn = ttk.Button(main_frame, text="Download", command=self.start_download, style='Accent.TButton')
        self.download_btn.grid(row=5, column=0, columnspan=3, pady=20)
        
        # Progress Bar
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate', length=600)
        self.progress.grid(row=6, column=0, columnspan=3, pady=(0, 10))
        
        # Status Label
        self.status_label = ttk.Label(main_frame, text="Ready", foreground="gray")
        self.status_label.grid(row=7, column=0, columnspan=3)
        
        # Log Output
        ttk.Label(main_frame, text="Download Log:").grid(row=8, column=0, columnspan=3, sticky=tk.W, pady=(20, 5))
        self.log_text = scrolledtext.ScrolledText(main_frame, width=80, height=10, state='disabled')
        self.log_text.grid(row=9, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
    
    def browse_folder(self):
        """Open folder browser dialog"""
        folder = filedialog.askdirectory(initialdir=self.path_entry.get())
        if folder:
            self.path_entry.delete(0, tk.END)
            self.path_entry.insert(0, folder)
    
    def log(self, message):
        """Add message to log - thread safe"""
        self.message_queue.put(('log', message))
    
    def update_status(self, message, color="gray"):
        """Update status label - thread safe"""
        self.message_queue.put(('status', (message, color)))
    
    def check_queue(self):
        """Check message queue and update GUI"""
        try:
            while True:
                msg_type, data = self.message_queue.get_nowait()
                
                if msg_type == 'log':
                    self.log_text.config(state='normal')
                    self.log_text.insert(tk.END, data + '\n')
                    self.log_text.see(tk.END)
                    self.log_text.config(state='disabled')
                
                elif msg_type == 'status':
                    message, color = data
                    self.status_label.config(text=message, foreground=color)
                
                elif msg_type == 'download_complete':
                    self.on_download_complete(data)
                
        except queue.Empty:
            pass
        
        # Schedule next check
        self.root.after(100, self.check_queue)
    
    def kill_ffmpeg(self):
        """Terminate any running ffmpeg processes on Windows"""
        if os.name == 'nt':
            pass

    def on_close(self):
        """Handle window closing event"""
        if self.is_downloading:
            if not messagebox.askyesno("Exit", "A download is currently in progress. Do you want to stop it and exit?"):
                return
            
            self.stop_requested = True
            self.kill_ffmpeg()
            self.log("Stopping all tasks and exiting...")
            
        self.root.destroy()
        sys.exit(0)

    def start_download(self):
        """Start download in background thread"""
        if self.is_downloading:
            messagebox.showwarning("Download in Progress", "Please wait for current download to complete.")
            return
        
        self.stop_requested = False
        
        url_input = self.url_entry.get().strip()
        output_path = self.path_entry.get().strip()
        filename_input = self.filename_entry.get().strip()
        quality = self.quality_var.get()
        
        if not url_input:
            messagebox.showerror("Error", "Please enter a YouTube URL!")
            return
        
        # Parse multiple URLs
        import re
        urls = [u.strip() for u in re.split(r'[;,]', url_input) if u.strip()]
        
        if not urls:
            messagebox.showerror("Error", "Please enter a valid YouTube URL!")
            return
        
        # Parse multiple filenames
        filenames = []
        if filename_input:
            filenames = [f.strip() for f in re.split(r'[;,]', filename_input)]
        
        if not output_path:
            messagebox.showerror("Error", "Please select an output directory!")
            return
        
        # Start download thread
        self.is_downloading = True
        self.download_btn.config(state='disabled')
        self.progress.start(10)
        self.update_status(f"Checking ffmpeg...", "blue")
        
        # Check ffmpeg first
        ffmpeg_available = False
        
        # Try imageio-ffmpeg (bundled)
        try:
            import imageio_ffmpeg
            ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
            self.log(f"✓ Using bundled ffmpeg: {ffmpeg_path}")
            ffmpeg_available = True
        except ImportError:
            # Fallback to system ffmpeg
            if shutil.which('ffmpeg') is not None:
                self.log("✓ Using system ffmpeg")
                ffmpeg_available = True
        
        if not ffmpeg_available:
            self.is_downloading = False
            self.download_btn.config(state='normal')
            self.progress.stop()
            
            error_msg = (
                "ffmpeg not found!\n\n"
                "ffmpeg is required to merge and encode videos.\n\n"
                "Easy installation (recommended):\n"
                "  pip install imageio-ffmpeg\n\n"
                "Or install ffmpeg manually:\n\n"
                "1. Using winget (Windows 10/11):\n"
                "   winget install --id=Gyan.FFmpeg -e\n\n"
                "2. Using chocolatey:\n"
                "   choco install ffmpeg\n\n"
                "3. Manual: Download from\n"
                "   github.com/BtbN/FFmpeg-Builds/releases"
            )
            messagebox.showerror("ffmpeg Required", error_msg)
            return
        
        self.update_status(f"Starting batch download of {len(urls)} videos...", "blue")
        self.log(f"Starting batch download: {len(urls)} videos")
        self.log(f"Selected Quality: {quality}")
        
        thread = threading.Thread(target=self.download_worker, args=(urls, output_path, filenames, quality))
        thread.daemon = True
        thread.start()
    
    def download_worker(self, urls, output_path, filenames, quality="Best Quality"):
        """Worker thread for downloading"""
        
        class GUILogger:
            """Custom logger that sends messages to GUI"""
            def __init__(self, log_callback):
                self.log_callback = log_callback
            
            def debug(self, msg):
                # Only log important debug messages
                if 'Downloading' in msg or 'Merging' in msg:
                    self.log_callback(msg)
            
            def warning(self, msg):
                self.log_callback(f"WARNING: {msg}")
            
            def error(self, msg):
                self.log_callback(f"ERROR: {msg}")
        
        def progress_hook(d):
            """Progress callback"""
            if self.stop_requested:
                raise Exception("STOP_REQUESTED")

            if d['status'] == 'downloading':
                if 'total_bytes' in d or 'total_bytes_estimate' in d:
                    total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                    downloaded = d.get('downloaded_bytes', 0)
                    
                    if total > 0:
                        percent = (downloaded / total) * 100
                        speed = d.get('speed', 0)
                        eta = d.get('eta', 0)
                        
                        speed_str = f"{speed/1024/1024:.2f} MB/s" if speed else "N/A"
                        eta_str = f"{eta}s" if eta else "N/A"
                        
                        self.log(f"Progress: {percent:.1f}% | Speed: {speed_str} | ETA: {eta_str}")
            elif d['status'] == 'finished':
                self.log(f"✓ Download finished: {d.get('filename', 'unknown')}")
                self.log("Processing video...")
        
        try:
            # Ensure output directory exists
            output_path = Path(output_path)
            output_path.mkdir(parents=True, exist_ok=True)
            
            self.log(f"Output directory: {output_path}")
            self.log("-" * 60)
            
            total_count = len(urls)
            success_count = 0
            
            # Common yt-dlp options (Initialize BEFORE using it in if/else blocks)
            base_opts = {
                'logger': GUILogger(self.log),
                'progress_hooks': [progress_hook],
            }

            # Determine format and options based on quality
            if quality == "Audio Only (MP3)":
                format_spec = 'bestaudio/best'
                # For audio, we use FFmpegExtractAudio
                base_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
            else:
                # Video formats
                if quality == "4K (2160p)":
                    format_spec = 'bestvideo[height=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height=2160]+bestaudio/best'
                elif quality == "1080p":
                    format_spec = 'bestvideo[height=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height=1080]+bestaudio/best'
                elif quality == "720p":
                    format_spec = 'bestvideo[height=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height=720]+bestaudio/best'
                elif quality == "480p":
                    format_spec = 'bestvideo[height=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height=480]+bestaudio/best'
                else:  # Best Quality (Default)
                    format_spec = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best'
                
                # For video, enforce MP4 merge and H.264/AAC for compatibility
                base_opts['merge_output_format'] = 'mp4'
                base_opts['postprocessor_args'] = {
                     'merger': ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                               '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart']
                }

            base_opts['format'] = format_spec

            
            # Set ffmpeg location if using bundled version
            if FFMPEG_BINARY:
                base_opts['ffmpeg_location'] = FFMPEG_BINARY
            
            for i, url in enumerate(urls, 1):
                if self.stop_requested:
                    break
                try:
                    self.update_status(f"Processing {i}/{total_count}: {url}", "blue")
                    self.log(f"\n[{i}/{total_count}] Processing: {url}")
                    
                    # Prepare filename logic for each URL
                    # Map filename by index if available (enumerate is 1-based, list is 0-based)
                    list_index = i - 1
                    current_filename = None
                    if list_index < len(filenames) and filenames[list_index]:
                        current_filename = filenames[list_index]
                    
                    if current_filename:
                        safe_filename = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in current_filename)
                        output_template = str(output_path / f"{safe_filename}.%(ext)s")
                    else:
                        output_template = str(output_path / "%(title)s.%(ext)s")
                    
                    current_opts = base_opts.copy()
                    current_opts['outtmpl'] = output_template
                    
                    # Download using yt-dlp Python API
                    with yt_dlp.YoutubeDL(current_opts) as ydl:
                        ydl.download([url])
                    
                    success_count += 1
                    
                except Exception as e:
                    if str(e) == "STOP_REQUESTED":
                        break
                    self.log(f"ERROR downloading {url}: {str(e)}")
            
            if self.stop_requested:
                self.kill_ffmpeg()
                self.log("\nDownload process was cancelled by user.")
                self.message_queue.put(('download_complete', False))
            elif success_count == total_count:
                self.message_queue.put(('download_complete', True))
            else:
                self.log(f"\nBatch finished. Completed {success_count}/{total_count} downloads.")
                self.message_queue.put(('download_complete', success_count > 0))
                
        except Exception as e:
            self.log(f"CRITICAL ERROR: {str(e)}")
            self.message_queue.put(('download_complete', False))
    
    def on_download_complete(self, success):
        """Handle download completion"""
        self.is_downloading = False
        self.download_btn.config(state='normal')
        self.progress.stop()
        
        if success:
            self.update_status("✓ Download completed successfully!", "green")
            self.log("-" * 60)
            self.log("Download completed!")
            messagebox.showinfo("Success", f"Video downloaded successfully!\n\nSaved to: {self.path_entry.get()}")
        else:
            self.update_status("✗ Download failed!", "red")
            self.log("-" * 60)
            self.log("Download failed!")
            messagebox.showerror("Error", "Download failed. Check the log for details.")

def main():
    """Main function to run GUI"""
    root = tk.Tk()
    app = YouTubeDownloaderGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
