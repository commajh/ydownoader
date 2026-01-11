# YouTube Downloader - Windows Standalone

Windows에서 독립적으로 실행 가능한 YouTube 다운로더입니다.

## 🚀 빠른 시작 (실행 파일 사용)

### 다운로드 받은 경우
1. `YouTubeDownloader.exe` 더블클릭
2. YouTube URL 입력
3. 저장 경로 선택
4. Download 버튼 클릭

**설치 불필요!** Python이나 패키지 설치 없이 바로 실행됩니다.

## 💻 개발자를 위한 설치 (Python 스크립트)

### 1. 필수 패키지 설치
```cmd
cd windowonly
pip install -r requirements.txt
```

### 2. 실행
**GUI 버전 (권장):**
```cmd
python youtube_downloader_gui.py
```
또는
```cmd
run_gui.bat
```

**CLI 버전:**
```cmd
python youtube_downloader_cli.py
```

## 📦 실행 파일 빌드

독립 실행 파일(.exe)로 빌드하여 배포할 수 있습니다.

### 빌드 방법
```cmd
build_exe.bat
```

빌드 후 `dist` 폴더에서 실행 파일 확인:
- `YouTubeDownloader.exe` - GUI 버전
- `YouTubeDownloader-CLI.exe` - CLI 버전

자세한 내용은 [BUILD_GUIDE.md](BUILD_GUIDE.md) 참조

## ✨ 기능

- ✅ YouTube 비디오 다운로드
- ✅ iPhone/iPad 호환 인코딩 (H.264 + AAC)
- ✅ 사용자 지정 저장 경로
- ✅ 사용자 지정 파일명
- ✅ 실시간 다운로드 진행 상황
- ✅ GUI 및 CLI 버전 제공
- ✅ 독립 실행 파일 빌드 가능

## 📋 비디오 사양

다운로드되는 비디오:
- **비디오 코덱**: H.264 (libx264)
- **오디오 코덱**: AAC, 192kbps
- **컨테이너**: MP4
- **최적화**: Fast start (모바일 스트리밍 최적화)
- **품질**: CRF 23 (고품질)

모든 모바일 기기(iPhone, iPad, Android)에서 재생 가능합니다.

## 📁 프로젝트 구조

```
windowonly/
├── youtube_downloader_gui.py       # GUI 버전 소스
├── youtube_downloader_cli.py       # CLI 버전 소스
├── requirements.txt                # Python 패키지
├── build_exe.bat                   # 실행 파일 빌드 스크립트
├── youtube_downloader_gui.spec     # PyInstaller GUI 설정
├── youtube_downloader_cli.spec     # PyInstaller CLI 설정
├── install.bat                     # 패키지 설치 스크립트
├── run_gui.bat                     # GUI 빠른 실행
├── run_cli.bat                     # CLI 빠른 실행
├── README.md                       # 이 파일
└── BUILD_GUIDE.md                  # 빌드 상세 가이드
```

## 🆚 버전 비교

### GUI 버전 (권장)
- 사용자 친화적 인터페이스
- 폴더 브라우저
- 실시간 로그 표시
- 초보자에게 적합

### CLI 버전
- 명령줄 인터페이스
- 스크립트 자동화 가능
- 서버 환경에 적합
- 고급 사용자용

## 🔧 문제 해결

### Python 스크립트 실행 시

**"yt-dlp not found" 에러**
```cmd
pip install yt-dlp
```

**"imageio-ffmpeg not found" 에러**
```cmd
pip install imageio-ffmpeg
```

### 실행 파일 사용 시

**Windows Defender 경고**
1. "추가 정보" 클릭
2. "실행" 버튼 클릭

서명되지 않은 실행 파일이라 경고가 표시되지만 안전합니다.

**다운로드 실패**
- 인터넷 연결 확인
- YouTube URL 확인
- 저장 경로에 쓰기 권한 확인

## 📝 사용 예제

### GUI 사용
1. 프로그램 실행
2. YouTube URL: `https://youtube.com/watch?v=...`
3. 저장 경로: `D:\Videos`
4. 파일명: `my_video` (선택)
5. Download 클릭

### CLI 사용
```cmd
# 대화형 모드
python youtube_downloader_cli.py

# URL만 지정
python youtube_downloader_cli.py "https://youtube.com/watch?v=..."

# 모든 옵션 지정
python youtube_downloader_cli.py "https://youtube.com/watch?v=..." "D:\Videos" "my_video"
```

## 🎯 배포

실행 파일을 배포하는 경우:
1. `build_exe.bat` 실행
2. `dist\YouTubeDownloader.exe` 복사
3. 받는 사람에게 전달
4. 받는 사람은 .exe만 실행하면 됨

**Python 설치 불필요!** 모든 의존성이 포함되어 있습니다.

## 📄 라이선스

이 프로젝트는 다음 오픈소스를 사용합니다:
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [ffmpeg](https://ffmpeg.org/)
- [imageio-ffmpeg](https://github.com/imageio/imageio-ffmpeg)

## 🙏 크레딧

- **yt-dlp**: YouTube 다운로더 핵심 엔진
- **imageio-ffmpeg**: 번들된 ffmpeg 바이너리
- **PyInstaller**: 실행 파일 빌드 도구
