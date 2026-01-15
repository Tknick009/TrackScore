@echo off
cd /d "%~dp0"
title Track & Field Lynx TCP Forwarder
color 0B

echo ================================================
echo   Track and Field Lynx TCP-to-HTTP Forwarder
echo ================================================
echo.

REM Check if the forwarder script exists in same folder
if not exist "lynx-tcp-forwarder.cjs" (
    echo ERROR: lynx-tcp-forwarder.cjs not found!
    echo.
    echo SOLUTION: Both files must be in the SAME folder:
    echo   - lynx-forwarder.bat  (this file)
    echo   - lynx-tcp-forwarder.cjs  (the forwarder script)
    echo.
    echo Current folder: %~dp0
    echo.
    echo Download both files to the same folder and try again.
    echo.
    pause
    exit /b 1
)

echo This script forwards FinishLynx/FieldLynx TCP data
echo to your online scoring system via HTTP.
echo.
echo PORTS (FinishLynx should connect to 127.0.0.1):
echo   Results: 5555 (FinishLynx timing results)
echo   Clock:   5556 (FinishLynx running time)
echo   Field:   5557 (FieldLynx field results)
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
