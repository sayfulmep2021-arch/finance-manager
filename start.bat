@echo off
cd /d "%~dp0"
title Personal Finance Manager — Smart Offline Edition
echo =====================================================================
echo   Personal Finance Manager — Smart Offline Edition
echo   100%% Offline, Zero-Cost, Secure, Bilingual Personal Finance App
echo =====================================================================
echo.
echo Starting local offline server...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if %errorlevel% neq 0 (
    echo.
    echo Server stopped.
    pause
)
