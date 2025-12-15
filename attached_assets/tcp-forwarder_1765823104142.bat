@echo off
cd /d "%~dp0"
title FinishLynx TCP-to-HTTP Forwarder
color 0B

echo ================================================
echo   FinishLynx TCP-to-HTTP Clock Forwarder
echo ================================================
echo.
echo This script forwards FinishLynx TCP clock data
echo to your online scoring system via HTTP.
echo.
echo IMPORTANT: Edit tcp-forwarder.js to set your
echo remote server URL before running!
echo.
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Starting forwarder...
echo.

node tcp-forwarder.cjs

pause
