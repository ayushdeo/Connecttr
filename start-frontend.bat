@echo off
setlocal

title Connecttr Frontend (3000)
echo Starting Connecttr Frontend Server on http://127.0.0.1:3000 ...
echo.

cd /d "%~dp0front-end"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:BROWSER='none'; $env:PORT='3000'; $env:REACT_APP_API_BASE='http://127.0.0.1:8010'; npm.cmd start 2>&1 | Tee-Object -FilePath '..\frontend-live.log'"

pause
