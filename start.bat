@echo off
set EDGE_MODE=true
set NODE_ENV=development
echo Starting Track & Field Scoreboard...
echo.
echo Server will run at http://localhost:5000
echo Press Ctrl+C to stop the server.
echo.
npx tsx server/index.ts
echo.
echo Server stopped. Press any key to close.
pause
