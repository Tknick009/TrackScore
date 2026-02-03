@echo off
echo ============================================
echo   Track and Field Scoreboard
echo ============================================
echo.

REM Configuration - Set your Dropbox sync folder here
SET SOURCE_DIR=C:\Users\%USERNAME%\Dropbox\scoreboard
REM Alternative examples:
REM SET SOURCE_DIR=\\SERVER\share\scoreboard
REM SET SOURCE_DIR=D:\NetworkShare\scoreboard

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

REM Check for file changes from source directory
if exist "%SOURCE_DIR%" (
    echo Checking for updates from: %SOURCE_DIR%
    echo.
    call npx tsx tools/edge-launcher.ts --source "%SOURCE_DIR%" --sync-only
    if %ERRORLEVEL% neq 0 (
        echo.
        echo WARNING: Sync had issues, but continuing with server start...
        echo.
    ) else (
        echo.
        echo Sync complete.
        echo.
    )
) else (
    echo Source directory not found: %SOURCE_DIR%
    echo Skipping sync - edit SOURCE_DIR in this file to enable sync.
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
