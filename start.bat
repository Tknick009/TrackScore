@echo off
echo ============================================
echo   Track and Field Scoreboard
echo ============================================
echo.

REM Sync folder path is read from data/edge-config.json (configured via the UI).
REM To override, uncomment one of the lines below:
REM SET SOURCE_DIR=C:\Users\%USERNAME%\Dropbox\scoreboard
REM SET SOURCE_DIR=C:\Users\%USERNAME%\Google Drive\TrackScore
REM SET SOURCE_DIR=\\SERVER\share\scoreboard

set EDGE_MODE=true
set NODE_ENV=development

echo Checking for Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)
echo Node.js found.
echo.

REM Check for file updates from sync folder
REM If SOURCE_DIR is set above, pass it explicitly; otherwise edge-launcher reads from config
if defined SOURCE_DIR (
    echo Checking for updates from: %SOURCE_DIR%
    echo.
    call npx tsx tools/edge-launcher.ts --source "%SOURCE_DIR%" --sync-only
) else (
    echo Checking for app updates from configured sync folder...
    echo.
    call npx tsx tools/edge-launcher.ts --sync-only
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo WARNING: Sync had issues, but continuing with server start...
    echo.
) else (
    echo.
    echo Sync check complete.
    echo.
)

echo Starting server...
echo Server will run at http://localhost:5000
echo Press Ctrl+C to stop.
echo.

call npx tsx server/index.ts

if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Server exited with error code %ERRORLEVEL%
)

echo.
echo Server stopped.
pause
