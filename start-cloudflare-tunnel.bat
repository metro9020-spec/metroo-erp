@echo off
title ERP Multi-User Cloudflare Worldwide Access
echo ==================================================================
echo   Starting Multi-Company Multi-User ERP with Cloudflare Tunnel...
echo ==================================================================
echo.

REM Verify Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please download and install Node.js (v18 or higher) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check and install dependencies if missing
IF NOT EXIST "node_modules\" (
    echo [INFO] Dependencies not found. Installing node packages...
    call npm install
    echo.
)

REM Build production assets if missing
IF NOT EXIST "dist\index.html" (
    echo [INFO] Building production frontend assets...
    call npm run build
    echo.
)

REM Check if server is already running on port 3001
netstat -ano | findstr ":3001.*LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Starting Local ERP Server on port 3001...
    start "ERP Backend Server" /min cmd /c "node server.js"
    echo Waiting for server to initialize...
    timeout /t 2 /nobreak >nul
) else (
    echo [INFO] Local ERP Server is already running on port 3001.
)

REM Check if cloudflared.exe exists, if not download it
IF NOT EXIST "cloudflared.exe" (
    echo [INFO] Downloading cloudflared.exe for secure tunnel...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)

echo.
echo ==================================================================
echo   ?? Starting Cloudflare Public Tunnel...
echo   Look below for the URL ending with: .trycloudflare.com
echo   You can open that HTTPS URL on ANY laptop, tablet, or phone!
echo ==================================================================
echo.

.\cloudflared.exe tunnel --url http://localhost:3001

pause
