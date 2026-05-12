@echo off
title Track & Field Scoreboard
color 0A

echo.
echo ========================================
echo   Track ^& Field Scoreboard
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org
    echo.
    echo Choose the LTS version and run the installer.
    echo After installing, close this window and try again.
    echo.
    pause
    exit /b 1
)

:: Show Node version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found

:: Create data directory if it doesn't exist
if not exist "data" mkdir data

:: Check for app file updates from sync folder (configured via UI or SOURCE_DIR)
:: To override, uncomment one of the lines below:
:: SET SOURCE_DIR=C:\Users\%USERNAME%\Dropbox\scoreboard
:: SET SOURCE_DIR=C:\Users\%USERNAME%\Google Drive\TrackScore
echo.
echo [SYNC] Checking for app updates from configured sync folder...
if defined SOURCE_DIR (
    call npx tsx tools/edge-launcher.ts --source "%SOURCE_DIR%" --sync-only
) else (
    call npx tsx tools/edge-launcher.ts --sync-only
)
if %errorlevel% neq 0 (
    echo [WARN] Sync had issues, but continuing with server start...
) else (
    echo [OK] Sync check complete
)

:: Always run npm install after sync to pick up any new dependencies
echo.
echo [DEPS] Installing/updating dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo [WARN] npm install had issues, but continuing...
) else (
    echo [OK] Dependencies up to date
)

echo.
echo [STARTING] Launching scoreboard on port 6000...
echo.
echo ----------------------------------------
echo   Open your browser to:
echo   http://localhost:6000
echo ----------------------------------------
echo.
echo Press Ctrl+C to stop the server
echo.

:: Set environment variables and start
set PORT=6000
set EDGE_MODE=true

:: Open browser after a short delay
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:6000"

:: Start the application
call npm run dev
