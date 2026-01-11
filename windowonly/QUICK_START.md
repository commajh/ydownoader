# YouTube Downloader 실행 파일 빌드 - 빠른 가이드

## 🚀 빠른 시작 (3단계)

### 1️⃣ 패키지 설치
```cmd
cd d:\Code\Vibe\yDownloader\windowonly
pip install -r requirements.txt
```

> **설치되는 것:**
> - yt-dlp (YouTube 다운로더)
> - imageio-ffmpeg (내장 ffmpeg)
> - pyinstaller (실행 파일 빌드 도구)

### 2️⃣ 실행 파일 빌드
```cmd
build_exe.bat
```

> **빌드 시간:** 약 2-5분 소요

### 3️⃣ 실행 파일 확인
```
dist\
├── YouTubeDownloader.exe      (GUI 버전, 약 80-100MB)
└── YouTubeDownloader-CLI.exe  (CLI 버전, 약 70-90MB)
```

## 📝 상세 설명

### PyInstaller란?
Python 스크립트를 독립 실행 파일(.exe)로 변환하는 도구입니다.

**작동 원리:**
1. Python 인터프리터를 포함
2. 모든 패키지와 의존성을 번들화
3. 하나의 .exe 파일로 패키징

**결과:**
- Python이 설치되지 않은 PC에서도 실행 가능
- 패키지 설치 불필요
- 즉시 실행 가능

### 빌드 과정 설명

```cmd
build_exe.bat
```

이 스크립트는 자동으로:
1. ✅ PyInstaller 설치 확인
2. ✅ 이전 빌드 폴더 정리
3. ✅ GUI 버전 빌드 (`youtube_downloader_gui.spec` 사용)
4. ✅ CLI 버전 빌드 (`youtube_downloader_cli.spec` 사용)

### 수동 빌드 (고급)

**GUI 버전만 빌드:**
```cmd
pyinstaller youtube_downloader_gui.spec --clean
```

**CLI 버전만 빌드:**
```cmd
pyinstaller youtube_downloader_cli.spec --clean
```

**옵션 설명:**
- `--clean`: 이전 빌드 캐시 삭제 (깔끔한 빌드)
- `.spec`: 빌드 설정 파일

## 🔧 트러블슈팅

### ❌ "pyinstaller: command not found"
**원인:** PyInstaller가 설치되지 않음

**해결:**
```cmd
pip install pyinstaller
```

### ❌ "모듈을 찾을 수 없음" 에러
**원인:** 필요한 패키지가 없음

**해결:**
```cmd
pip install -r requirements.txt
```

### ❌ 빌드는 성공했지만 실행 시 에러
**원인:** 숨겨진 의존성 누락

**해결:** `.spec` 파일의 `hiddenimports`에 추가
```python
hiddenimports=[
    'yt_dlp',
    'imageio_ffmpeg',
    '누락된_모듈',
],
```

### ❌ 파일 크기가 너무 큼
**정상입니다!** 
- Python + 모든 패키지 + ffmpeg 포함
- 80-100MB는 정상 범위
- 압축해서 배포 가능 (약 40-50MB로 줄어듦)

### ❌ Windows Defender 경고
**정상입니다!**
- 서명되지 않은 실행 파일이라 경고 표시
- "추가 정보" → "실행" 클릭으로 실행 가능

**경고 방지 (선택):**
- 코드 서명 인증서 구매 ($100-300/년)
- 또는 사용자에게 실행 방법 안내

## 📊 빌드 결과물

### 폴더 구조
```
windowonly/
├── youtube_downloader_gui.py    # 원본 소스
├── youtube_downloader_cli.py    # 원본 소스
├── youtube_downloader_gui.spec  # 빌드 설정
├── youtube_downloader_cli.spec  # 빌드 설정
├── build/                       # 임시 파일 (삭제 가능)
└── dist/                        # 최종 결과물 ⭐
    ├── YouTubeDownloader.exe      # 배포용 파일
    └── YouTubeDownloader-CLI.exe  # 배포용 파일
```

### 배포 방법
1. `dist\YouTubeDownloader.exe` 파일만 복사
2. 친구/동료에게 전달
3. 받은 사람은 더블클릭으로 실행

**필요 없음:**
- ❌ Python 설치
- ❌ pip install
- ❌ ffmpeg 설치
- ❌ 다른 파일들

## 🎯 사용 시나리오

### 시나리오 1: 개인 사용
```cmd
# 빌드
build_exe.bat

# 실행
dist\YouTubeDownloader.exe
```

### 시나리오 2: 친구에게 공유
```cmd
# 빌드
build_exe.bat

# USB나 이메일로 전달
dist\YouTubeDownloader.exe

# 친구는 바로 실행
```

### 시나리오 3: 회사 배포
```cmd
# 빌드
build_exe.bat

# 압축
7z a YouTubeDownloader.zip dist\YouTubeDownloader.exe

# 배포
- 네트워크 공유 폴더에 업로드
- 이메일 첨부
- 클라우드 스토리지 공유
```

## 💡 팁

### 빌드 속도 향상
```cmd
# 캐시 사용 (두 번째 빌드부터 빠름)
pyinstaller youtube_downloader_gui.spec
```

### 디버그 모드
```cmd
pyinstaller youtube_downloader_gui.spec --debug=all
```

### 로그 파일 생성
실행 파일 실행 시 오류가 있으면:
- `console=True`로 설정하여 재빌드
- 콘솔 창에서 오류 메시지 확인

## ✅ 체크리스트

빌드 전:
- [ ] Python 3.8 이상 설치
- [ ] pip 최신 버전
- [ ] requirements.txt 모든 패키지 설치
- [ ] 코드 테스트 완료

빌드 후:
- [ ] dist 폴더에 .exe 파일 생성 확인
- [ ] .exe 파일 직접 실행 테스트
- [ ] 다른 PC에서 테스트 (Python 없는 환경)
- [ ] YouTube 다운로드 기능 정상 작동 확인

배포 전:
- [ ] README.md 작성 (사용 방법)
- [ ] 바이러스 토탈 검사 (선택)
- [ ] 압축 파일 생성 (선택)
- [ ] 릴리스 노트 작성 (선택)

## 📞 도움말

더 자세한 정보:
- PyInstaller 공식 문서: https://pyinstaller.org/
- BUILD_GUIDE.md: 상세 빌드 가이드
- README.md: 프로젝트 개요

빌드 성공을 기원합니다! 🎉
