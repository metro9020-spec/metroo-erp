@echo off
title ERP Multi-User Local Server
echo ==================================================================
echo   Starting Multi-Company Multi-User ERP Local Backend Server...
echo ==================================================================
echo.

IF NOT EXIST "dist\index.html" (
    echo [INFO] Building production frontend assets...
    call cmd /c "npm run build"
    echo.
)

echo Starting Local Server on Port 3001...
node server.js

pause
