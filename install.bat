@echo off
echo ============================================
echo   Track ^& Field Scoreboard - Local Install
echo ============================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed.
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node -v') do set NODE_VER=%%i
echo Node.js detected
echo.

:: Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed
echo.

:: Create data directory for SQLite database
if not exist "data" mkdir data
if not exist "uploads" mkdir uploads
echo Data directories created

:: Create .env file if it doesn't exist
if not exist ".env" (
    echo EDGE_MODE=true> .env
    echo SESSION_SECRET=local-dev-secret-change-in-production>> .env
    echo Environment file created
) else (
    echo Environment file already exists
)

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo To start the application:
echo   npm run dev
echo.
echo Or with Edge Mode explicitly enabled:
echo   set EDGE_MODE=true ^&^& npm run dev
echo.
echo To sync meet data from cloud server:
echo   npx tsx tools/edge-setup.ts setup --cloud-url ^<URL^> --meet-code ^<CODE^>
echo.
echo The application will run at http://localhost:5000
echo.
echo FinishLynx TCP Ports (local connection):
echo   - Results: 5555
echo   - Clock:   5556
echo   - Field:   5557
echo.
pause
