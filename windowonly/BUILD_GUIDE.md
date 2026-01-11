# YouTube Downloader - 실행 파일 빌드 가이드

## 개요
YouTube Downloader를 독립 실행 파일(.exe)로 빌드하여 배포할 수 있습니다.
Python이나 패키지 설치 없이 어떤 Windows PC에서든 실행 가능합니다.

## 사전 준비

### 1. 필수 패키지 설치
```cmd
pip install -r requirements.txt
```

설치되는 패키지:
- `yt-dlp` - YouTube 다운로더
- `imageio-ffmpeg` - ffmpeg 바이너리 (내장)
- `pyinstaller` - 실행 파일 빌드 도구

## 빌드 방법

### 자동 빌드 (권장)
```cmd
build_exe.bat
```

이 스크립트가 자동으로:
1. PyInstaller 설치 확인
2. 이전 빌드 정리
3. GUI 버전 빌드
4. CLI 버전 빌드

### 수동 빌드

**GUI 버전:**
```cmd
pyinstaller youtube_downloader_gui.spec --clean
```

**CLI 버전:**
```cmd
pyinstaller youtube_downloader_cli.spec --clean
```

## 빌드 결과

빌드가 완료되면 `dist` 폴더에 다음 파일들이 생성됩니다:

```
dist/
├── YouTubeDownloader.exe       # GUI 버전 (약 80-100MB)
└── YouTubeDownloader-CLI.exe   # CLI 버전 (약 70-90MB)
```

## 실행 파일 특징

### ✅ 포함된 내용
- Python 런타임
- yt-dlp (모든 의존성 포함)
- imageio-ffmpeg (ffmpeg 바이너리 포함)
- 필요한 모든 라이브러리

### ✅ 장점
- **독립 실행**: Python 설치 불필요
- **배포 간편**: .exe 파일만 복사하면 됨
- **의존성 없음**: 패키지 설치 불필요
- **즉시 실행**: 다운로드 후 바로 실행

### ⚠️ 주의사항
- 파일 크기가 큼 (80-100MB)
- 첫 실행 시 압축 해제로 약간 느릴 수 있음
- Windows Defender가 경고할 수 있음 (서명되지 않은 실행 파일)

## 배포 방법

### 1. GUI 버전 배포
```
YouTubeDownloader.exe
```
이 파일 하나만 배포하면 됩니다.

### 2. 사용 방법
1. 받은 사람이 `YouTubeDownloader.exe` 더블클릭
2. YouTube URL 입력
3. 저장 경로 선택
4. Download 버튼 클릭

## Windows Defender 경고 해결

실행 파일이 서명되지 않아 Windows Defender가 경고할 수 있습니다.

### 사용자 측 해결 방법:
1. "추가 정보" 클릭
2. "실행" 버튼 클릭

### 개발자 측 해결 방법 (선택):
- 코드 서명 인증서 구매 및 적용
- 또는 README에 경고 무시 방법 안내

## 빌드 옵션 커스터마이징

### 아이콘 변경
`youtube_downloader_gui.spec` 파일 수정:
```python
icon='icon.ico',  # 아이콘 파일 경로
```

### UPX 압축 비활성화 (빌드 문제 시)
`.spec` 파일에서:
```python
upx=False,
```

### 디버그 모드 활성화
```python
debug=True,
console=True,  # 디버그 콘솔 표시
```

## 트러블슈팅

### 빌드 실패
```cmd
pip install --upgrade pyinstaller
```

### "모듈을 찾을 수 없음" 에러
`.spec` 파일의 `hiddenimports`에 누락된 모듈 추가:
```python
hiddenimports=[
    'yt_dlp',
    'imageio_ffmpeg',
    '추가_모듈',
],
```

### 실행 파일이 너무 큼
- UPX 압축 활성화 확인
- 불필요한 hiddenimports 제거
- `--onefile` 대신 `--onedir` 사용 (폴더 배포)

### 실행 시 오류
디버그 모드로 재빌드:
```cmd
pyinstaller youtube_downloader_gui.spec --clean --debug=all
```

## 파일 크기 최적화

### 현재 상태 (약 80-100MB)
모든 의존성 포함

### 크기 줄이기 (선택)
1. **별도 배포**: ffmpeg를 실행 파일에서 제외하고 별도 다운로드
2. **Onedir 모드**: 폴더 형태로 배포 (zipfile로 압축 가능)

## 라이선스 고려사항

배포 시 포함된 오픈소스 라이선스 확인:
- yt-dlp: Unlicense
- ffmpeg: GPL/LGPL
- Python: PSF License

상업적 사용 시 각 라이선스 조건 확인 필요.

## 자주 묻는 질문

**Q: 실행 파일은 어디서 만들어지나요?**
A: `dist` 폴더에 생성됩니다.

**Q: 다른 PC에서 실행되나요?**
A: 네, Windows 7 이상 모든 PC에서 실행됩니다.

**Q: 바이러스로 감지되나요?**
A: PyInstaller로 만든 파일은 종종 오탐지됩니다. VirusTotal로 확인 후 배포하세요.

**Q: 업데이트는 어떻게 하나요?**
A: 코드 수정 후 다시 빌드하면 됩니다.

**Q: Mac이나 Linux용도 만들 수 있나요?**
A: 네, 각 OS에서 PyInstaller를 실행하면 됩니다.
