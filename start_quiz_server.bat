@echo off
setlocal
set PORT=8000

REM Go to this script's directory
cd /d "%~dp0"

echo =============================================================
echo  FIAE Karteikarten Quiz - Lokaler Server
echo =============================================================

REM Find a free port starting at 8000
for /L %%P in (8000,1,8010) do (
  netstat -a -n -o | findstr /R /C:":%%P .*LISTENING" >nul
  if errorlevel 1 (
    set PORT=%%P
    goto :port_found
  ) else (
    echo Port %%P ist belegt, pruefe naechsten...
  )
)
set PORT=8000
:port_found
echo Verwende Port %PORT%
set URL=http://localhost:%PORT%/FIAE_Quiz.html
echo URL: %URL%

REM Prefer PowerShell server (supports logging)
echo Starte PowerShell Server (mit Logging) ...
start "FIAE Quiz Server" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port %PORT%
goto open

:open
REM Give the server a brief moment to start
ping 127.0.0.1 -n 2 >nul
REM Open the URL with the system default browser
start "" "%URL%"
goto :end

:end
echo Standardbrowser wird geoeffnet. Der Server laeuft in einem separaten Fenster.
echo Zum Beenden: Server-Fenster schliessen.
endlocal
