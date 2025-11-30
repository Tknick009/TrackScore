@echo off
cd /d "%~dp0"
title Track & Field Lynx TCP Forwarder
color 0B

echo ================================================
echo   Track and Field Lynx TCP-to-HTTP Forwarder
echo ================================================
echo.
echo This script forwards FinishLynx/FieldLynx TCP data
echo to your online scoring system via HTTP.
echo.
echo PORTS:
echo   Clock:   5056 (FinishLynx running time)
echo   Results: 5055 (FinishLynx timing results)
echo   Field:   5057 (FieldLynx field results)
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

REM Check if FORWARD_URL is set, if not prompt for it
if "%FORWARD_URL%"=="" (
    echo Enter your Replit app URL (e.g., https://your-app.replit.app)
    echo or press Enter for local testing (http://localhost:5000):
    echo.
    set /p FORWARD_URL="URL: "
    if "%FORWARD_URL%"=="" set FORWARD_URL=http://localhost:5000
)

echo.
echo Forwarding to: %FORWARD_URL%
echo.
echo Starting forwarder...
echo.

node lynx-tcp-forwarder.cjs

pause
