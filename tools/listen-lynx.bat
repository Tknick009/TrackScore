@echo off

:: Check for admin rights and request if needed
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -ArgumentList '%*' -Verb RunAs"
    exit /b
)

setlocal

set PORT=%1
if "%PORT%"=="" set PORT=4554

echo ===============================================
echo   FinishLynx Listener - Port %PORT%
echo ===============================================
echo.
echo Waiting for FinishLynx to connect...
echo Press Ctrl+C to stop
echo.

powershell -NoProfile -Command ^
  "$port = %PORT%; " ^
  "$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port); " ^
  "$listener.Start(); " ^
  "Write-Host 'Listening on port' $port '...' -ForegroundColor Green; " ^
  "while ($true) { " ^
  "  try { " ^
  "    $client = $listener.AcceptTcpClient(); " ^
  "    Write-Host 'Client connected!' -ForegroundColor Yellow; " ^
  "    $stream = $client.GetStream(); " ^
  "    $buffer = New-Object byte[] 8192; " ^
  "    while ($client.Connected) { " ^
  "      $count = $stream.Read($buffer, 0, $buffer.Length); " ^
  "      if ($count -gt 0) { " ^
  "        $time = Get-Date -Format 'HH:mm:ss.fff'; " ^
  "        $text = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($buffer, 0, $count); " ^
  "        $display = $text -replace '[\\x00-\\x09\\x0b\\x0c\\x0e-\\x1f]', '.'; " ^
  "        Write-Host \"[$time] $display\"; " ^
  "      } " ^
  "    } " ^
  "  } catch { " ^
  "    Write-Host 'Connection closed' -ForegroundColor Red; " ^
  "  } " ^
  "}"

pause
