@echo off
echo ============================================
echo   Track and Field Scoreboard
echo ============================================
echo.

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
