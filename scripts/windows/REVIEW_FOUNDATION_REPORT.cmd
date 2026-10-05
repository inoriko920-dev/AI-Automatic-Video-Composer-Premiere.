@echo off
setlocal
cd /d "%~dp0\..\.."

if "%~1"=="" (
  echo.
  echo AAVC FOUNDATION REPORT REVIEW
  echo ----------------------------------------
  echo Drag file aavc-foundation-report-*.json ke file ini,
  echo atau jalankan:
  echo.
  echo   REVIEW_FOUNDATION_REPORT.cmd "C:\path\aavc-foundation-report-....json"
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

if not exist ".aavc-foundation-test\results" mkdir ".aavc-foundation-test\results"
set "OUT=.aavc-foundation-test\results\foundation-review.json"

echo.
echo Reviewing:
echo   %REPORT%
echo.
node scripts\review-foundation-report.mjs "%REPORT%" --out "%OUT%"
set "RC=%ERRORLEVEL%"

echo.
echo Review JSON:
echo   %CD%\%OUT%
echo.

if "%RC%"=="0" (
  echo RESULT: GO CANDIDATE - tetap perlu human review sebelum gate GO_APPROVED.
) else if "%RC%"=="3" (
  echo RESULT: S10 membutuhkan fallback ADR yang disetujui atau S10 harus PASS.
) else (
  echo RESULT: NO GO / INVALID REPORT. Periksa output di atas.
)

echo.
pause
exit /b %RC%
