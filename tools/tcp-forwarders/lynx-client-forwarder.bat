@echo off
setlocal

REM =====================================================
REM  FinishLynx Client Forwarder (Batch Mode)
REM  
REM  This forwarder CONNECTS TO FinishLynx when it's
REM  configured to accept connections (not send).
REM  
REM  Preserves exact message order by batching.
REM =====================================================

REM === CONFIGURATION ===
REM Change this URL to your Replit app URL
set FORWARD_URL=https://YOUR-APP-NAME.replit.app

REM FinishLynx IP - usually 127.0.0.1 if running on same computer
set LYNX_HOST=127.0.0.1

REM Port that FinishLynx is listening on for connections
set RESULTS_PORT=5055

REM =====================================================

echo.
echo =====================================================
echo   FinishLynx Client Forwarder (Batch Mode)
echo =====================================================
echo   Server: %FORWARD_URL%
echo   FinishLynx: %LYNX_HOST%:%RESULTS_PORT%
echo =====================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Get the directory of this batch file
set SCRIPT_DIR=%~dp0

REM Run the forwarder
node "%SCRIPT_DIR%lynx-client-forwarder.cjs"

pause
