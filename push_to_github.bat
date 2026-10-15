@echo off
title Push Personal Finance Manager to GitHub
echo =====================================================================
echo   Pushing complete project (with css, js, icons) to GitHub...
echo =====================================================================
echo.
cd /d "%~dp0"
set "GIT_EXE=C:\Users\User\AppData\Local\GitHubDesktop\app-3.6.5\resources\app\git\cmd\git.exe"
if not exist "%GIT_EXE%" (
    set "GIT_EXE=git"
)

"%GIT_EXE%" branch -M main
"%GIT_EXE%" add .
"%GIT_EXE%" commit -m "Update Mobile UI with Wallet Card, Circular Progress, FAB, and Bottom Nav" >nul 2>&1
"%GIT_EXE%" push -u origin main --force

echo.
if %ERRORLEVEL% EQU 0 (
    echo =====================================================================
    echo   [SUCCESS] All files and folders successfully uploaded to GitHub!
    echo   Please wait 1-2 minutes and refresh your site:
    echo   https://sayfulmep2021-arch.github.io/finance-manager/
    echo =====================================================================
) else (
    echo [NOTE] Push could not complete automatically.
    echo Please open GitHub Desktop app to push, or check GitHub login.
)
echo.
pause
