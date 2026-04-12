@echo off
setlocal

title Connecttr Backend (8010)
echo Starting Connecttr Backend Server on http://127.0.0.1:8010 ...
echo.

cd /d "%~dp0back-end"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:BACKEND_PUBLIC_URL='http://127.0.0.1:8010'; $env:FRONTEND_ORIGIN='http://127.0.0.1:3000'; $env:EMAILHUB_URL='http://127.0.0.1:8010'; $env:EMAILHUB_INCLUDE_LEGACY_DATA='true'; $env:HTTP_PROXY=''; $env:HTTPS_PROXY=''; $env:ALL_PROXY=''; $env:GIT_HTTP_PROXY=''; $env:GIT_HTTPS_PROXY=''; $env:NO_PROXY='localhost,127.0.0.1,::1,accounts.google.com,oauth2.googleapis.com,www.googleapis.com'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8010 2>&1 | Tee-Object -FilePath '..\backend-live.log'"

pause
