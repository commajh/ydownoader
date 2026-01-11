#!/usr/bin/env python3
"""
YouTube Downloader - CLI Version
Windows standalone script for downloading YouTube videos with iPhone-compatible encoding
"""

import sys
import os
from pathlib import Path
import shutil

# Import yt-dlp as a module instead of running it as a subprocess
try:
    import yt_dlp
except ImportError:
    print("\n" + "="*60)
    print("ERROR: yt-dlp module not found!")
    print("Please install it with: pip install yt-dlp")
    print("="*60 + "\n")
    sys.exit(1)

# Import imageio-ffmpeg for bundled ffmpeg binary
try:
    import imageio_ffmpeg
    FFMPEG_BINARY = imageio_ffmpeg.get_ffmpeg_exe()
    print(f"Using bundled ffmpeg: {FFMPEG_BINARY}")
except ImportError:
    print("WARNING: imageio-ffmpeg not found. Will try to use system ffmpeg.")
    FFMPEG_BINARY = None


class DownloadLogger:
    """Logger for yt-dlp progress"""
    def debug(self, msg):
        # Filter out debug messages
        pass
    
    def warning(self, msg):
        print(f"WARNING: {msg}")
    
    def error(self, msg):
        print(f"ERROR: {msg}")


def progress_hook(d):
    """Progress callback for yt-dlp"""
    if d['status'] == 'downloading':
        if 'total_bytes' in d:
            percent = d.get('downloaded_bytes', 0) / d['total_bytes'] * 100
            speed = d.get('speed', 0)
            eta = d.get('eta', 0)
            
            speed_str = f"{speed/1024/1024:.2f} MB/s" if speed else "N/A"
            eta_str = f"{eta}s" if eta else "N/A"
            
            print(f"\rDownloading: {percent:.1f}% | Speed: {speed_str} | ETA: {eta_str}", end='', flush=True)
    elif d['status'] == 'finished':
        print(f"\n✓ Download finished: {d.get('filename', 'unknown')}")
        print("Processing file...")


def check_ffmpeg():
    """Check if ffmpeg is installed and accessible"""
    # First try imageio-ffmpeg (bundled)
    try:
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        print(f"✓ Using bundled ffmpeg: {ffmpeg_path}")
        return True
    except ImportError:
        pass
    
    # Fallback to system ffmpeg
    if shutil.which('ffmpeg') is not None:
        print("✓ Using system ffmpeg")
        return True
    
    # ffmpeg not found
    print("\n" + "="*60)
    print("ERROR: ffmpeg not found!")
    print("="*60)
    print("\nffmpeg is required to merge video and audio streams.")
    print("\nEasy installation (recommended):")
    print("  pip install imageio-ffmpeg")
    print("\nOr install ffmpeg manually:")
    print("\nOption 1 - Using winget (Windows 10/11):")
    print("  winget install --id=Gyan.FFmpeg -e")
    print("\nOption 2 - Using chocolatey:")
    print("  choco install ffmpeg")
    print("\nOption 3 - Manual installation:")
    print("  1. Download from: https://github.com/BtbN/FFmpeg-Builds/releases")
    print("  2. Download: ffmpeg-master-latest-win64-gpl.zip")
    print("  3. Extract to C:\\ffmpeg")
    print("  4. Add C:\\ffmpeg\\bin to your system PATH")
    print("\n" + "="*60 + "\n")
    return False


def download_video(url, output_path, filename=None):
    """
    Download YouTube video with iPhone-compatible encoding (H.264 + AAC)
    
    Args:
        url: YouTube video URL
        output_path: Directory path where to save the video
        filename: Optional custom filename (without extension)
    """
    # Ensure output directory exists
    output_path = Path(output_path)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Prepare filename
    if filename:
        # Remove special characters
        safe_filename = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in filename)
        output_template = str(output_path / f"{safe_filename}.%(ext)s")
    else:
        output_template = str(output_path / "%(title)s.%(ext)s")
    
    print(f"\n{'='*60}")
    print(f"Starting download...")
    print(f"URL: {url}")
    print(f"Output Path: {output_path}")
    if filename:
        print(f"Filename: {filename}.mp4")
    print(f"{'='*60}\n")
    
    # Check ffmpeg before starting download
    if not check_ffmpeg():
        return False
    
    # yt-dlp options - same as server version
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
        'merge_output_format': 'mp4',
        'postprocessor_args': {
            'merger': ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23', 
                      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart']
        },
        'outtmpl': output_template,
        'logger': DownloadLogger(),
        'progress_hooks': [progress_hook],
    }
    
    # Set ffmpeg location if using bundled version
    if FFMPEG_BINARY:
        ydl_opts['ffmpeg_location'] = FFMPEG_BINARY
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        print(f"\n{'='*60}")
        print("✓ Download completed successfully!")
        print(f"{'='*60}\n")
        return True
        
    except Exception as e:
        print(f"\n{'='*60}")
        print(f"✗ Error: {str(e)}")
        print(f"{'='*60}\n")
        return False

def main():
    """Main function for CLI interaction"""
    print("\n" + "="*60)
    print(" "*15 + "YouTube Downloader - CLI")
    print("="*60 + "\n")
    
    # Get YouTube URL
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = input("Enter YouTube URL: ").strip()
    
    if not url:
        print("Error: URL is required!")
        sys.exit(1)
    
    # Get output path
    if len(sys.argv) > 2:
        output_path = sys.argv[2]
    else:
        default_path = str(Path.home() / "Downloads" / "YouTube")
        output_path = input(f"Enter output directory [{default_path}]: ").strip()
        if not output_path:
            output_path = default_path
    
    # Get optional filename
    if len(sys.argv) > 3:
        filename = sys.argv[3]
    else:
        filename = input("Enter custom filename (optional, press Enter to use video title): ").strip()
        if not filename:
            filename = None
    
    # Download
    success = download_video(url, output_path, filename)
    
    if success:
        print(f"Video saved to: {output_path}")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
