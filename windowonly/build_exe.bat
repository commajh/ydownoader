@echo off
echo ========================================
echo Building YouTube Downloader Executables
echo ========================================
echo.

REM Check if PyInstaller is installed
pip show pyinstaller >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PyInstaller not found. Installing...
    pip install pyinstaller
    echo.
)

REM Clean previous builds
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo.
echo Building GUI version...
echo ----------------------------------------
pyinstaller youtube_downloader_gui.spec --clean

echo.
echo Building CLI version...
echo ----------------------------------------
pyinstaller youtube_downloader_cli.spec --clean

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Executables are in the 'dist' folder:
echo - dist\YouTubeDownloader.exe (GUI)
echo - dist\YouTubeDownloader-CLI.exe (CLI)
echo.
echo You can distribute these .exe files to any Windows PC.
echo No Python or dependencies required!
echo.
pause
