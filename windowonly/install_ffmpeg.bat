@echo off
echo ========================================
echo Installing ffmpeg for Windows
echo ========================================
echo.

echo This will download and install ffmpeg using chocolatey.
echo If you don't have chocolatey, please download ffmpeg manually from:
echo https://github.com/BtbN/FFmpeg-Builds/releases
echo.

REM Check if chocolatey is installed
where choco >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Chocolatey not found. Installing via winget instead...
    winget install --id=Gyan.FFmpeg -e
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ========================================
        echo Automatic installation failed!
        echo ========================================
        echo.
        echo Please download ffmpeg manually:
        echo 1. Go to: https://github.com/BtbN/FFmpeg-Builds/releases
        echo 2. Download: ffmpeg-master-latest-win64-gpl.zip
        echo 3. Extract to C:\ffmpeg
        echo 4. Add C:\ffmpeg\bin to your system PATH
        echo.
        pause
        exit /b 1
    )
) else (
    echo Installing ffmpeg via chocolatey...
    choco install ffmpeg -y
)

echo.
echo ========================================
echo Installation complete!
echo ========================================
echo.
echo Please restart your command prompt and run:
echo   python youtube_downloader_gui.py
echo.
pause
