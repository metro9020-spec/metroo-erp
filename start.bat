@echo off
title ERP Multi-User Local Server
echo ==================================================================
echo   Starting Multi-Company Multi-User ERP Local Backend Server...
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

echo Starting Local Server on Port 3001...
node server.js

pause
