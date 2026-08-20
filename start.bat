@echo off
chcp 65001 >nul
title Fire Safety Platform
echo ========================================
echo   Fire Safety Platform - Startup
echo ========================================
echo.
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 16 or higher.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/2] Checking dependencies...
if not exist node_modules\express (
    echo Installing npm packages, please wait...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Please check your network.
        echo You can also try: npm install --registry=https://registry.npmmirror.com
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)

echo [2/2] Starting server...
echo.
echo ========================================
echo   Server started successfully!
echo.
echo   PC Admin:  http://localhost:3000/admin/
echo   Mobile:    http://localhost:3000/mobile/
echo.
echo   Default account: admin / 123456
echo   Press Ctrl+C to stop
echo ========================================
echo.

node server.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server failed to start.
    pause
)
