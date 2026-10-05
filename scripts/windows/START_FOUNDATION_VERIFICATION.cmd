@echo off
setlocal
cd /d "%~dp0\..\.."

echo ============================================================
echo AAVC PREMIERE - FOUNDATION VERIFICATION PREP
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\windows\New-AAVCFoundationFixture.ps1"
if errorlevel 1 goto :error

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\windows\Collect-AAVCFoundationEnvironment.ps1"
if errorlevel 1 goto :error

echo.
echo Running repository static checks...
call npm run check
if errorlevel 1 goto :error

echo.
echo READY.
echo 1. Open docs\02_FOUNDATION_VERIFICATION_RUNBOOK.md
echo 2. Open Premiere TEST project.
echo 3. Load uxp\manifest.json in UXP Developer Tool.
echo 4. Run S01-S16 exactly in order.
echo.
pause
exit /b 0

:error
echo.
echo PREPARATION FAILED. Read the error above and do not continue the Premiere test yet.
pause
exit /b 1
