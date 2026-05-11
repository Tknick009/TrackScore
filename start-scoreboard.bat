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

:: Check if node_modules exists, if not run npm install
if not exist "node_modules" (
    echo.
    echo [SETUP] First time setup - installing dependencies...
    echo This may take a few minutes...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed successfully!
)

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
