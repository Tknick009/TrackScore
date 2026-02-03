@echo off
REM Edge Mode Launcher for Windows
REM 
REM This batch file syncs code from a source directory and launches Edge Mode
REM 
REM Usage:
REM   edge-launcher.bat                     - Show help
REM   edge-launcher.bat sync                - Sync files only
REM   edge-launcher.bat launch              - Sync and launch server
REM   edge-launcher.bat status              - Show status
REM
REM Configuration:
REM   Edit the SOURCE_DIR variable below to point to your network share or sync folder

SET SOURCE_DIR=\\SERVER\share\scoreboard
REM Alternative examples:
REM SET SOURCE_DIR=C:\Users\%USERNAME%\Dropbox\scoreboard
REM SET SOURCE_DIR=D:\NetworkShare\scoreboard

echo.
echo ==========================================
echo   Edge Mode Launcher
echo ==========================================
echo.

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="sync" goto sync
if "%1"=="launch" goto launch
if "%1"=="status" goto status

:help
echo Usage:
echo   edge-launcher.bat sync     - Sync files from source directory
echo   edge-launcher.bat launch   - Sync files and launch server
echo   edge-launcher.bat status   - Show current status
echo.
echo Current source directory: %SOURCE_DIR%
echo.
echo To change the source directory, edit this batch file.
goto end

:sync
echo Syncing files from: %SOURCE_DIR%
echo.
npx tsx tools/edge-launcher.ts --source "%SOURCE_DIR%" --sync-only
goto end

:launch
echo Syncing files from: %SOURCE_DIR%
echo.
npx tsx tools/edge-launcher.ts --source "%SOURCE_DIR%" --launch
goto end

:status
npx tsx tools/edge-launcher.ts --status
goto end

:end
