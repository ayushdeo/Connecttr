@echo off
setlocal

echo Launching Connecttr locally with exactly two terminals...
echo Backend  : http://127.0.0.1:8010
echo Frontend : http://127.0.0.1:3000
echo.
echo Cleaning stale listeners on ports 8010 and 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -LocalPort 8010,3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
del /q "%~dp0backend-live.log" "%~dp0frontend-live.log" 2>nul
echo.

start "Connecttr Backend" cmd.exe /k "%~dp0start-backend.bat"
timeout /t 6 >nul
start "Connecttr Frontend" cmd.exe /k "%~dp0start-frontend.bat"
timeout /t 10 >nul

echo Opening local dev-login:
echo http://127.0.0.1:8010/auth/dev-login?email=raxalino@gmail.com
start "" "http://127.0.0.1:8010/auth/dev-login?email=raxalino@gmail.com"
echo.
echo Logs:
echo %~dp0backend-live.log
echo %~dp0frontend-live.log
