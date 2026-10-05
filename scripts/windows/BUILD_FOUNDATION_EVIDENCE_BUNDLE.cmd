@echo off
setlocal
cd /d "%~dp0\..\.."

if "%~1"=="" (
  echo.
  echo AAVC FOUNDATION EVIDENCE BUNDLE
  echo ----------------------------------------
  echo Drag file aavc-foundation-report-*.json ke file ini,
  echo atau jalankan:
  echo.
  echo   BUILD_FOUNDATION_EVIDENCE_BUNDLE.cmd "C:\path\aavc-foundation-report-....json"
  echo.
  pause
  exit /b 2
)

set "REPORT=%~1"
if not exist "%REPORT%" (
  echo Report tidak ditemukan: %REPORT%
  pause
  exit /b 2
)

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\windows\Build-AAVCFoundationEvidenceBundle.ps1" -ReportPath "%REPORT%"
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  echo Evidence bundle selesai. Cek folder .aavc-foundation-test\evidence
) else (
  echo Evidence bundle gagal dengan exit code %RC%.
)
echo.
pause
exit /b %RC%
