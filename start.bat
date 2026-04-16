@echo off
cd /d "%~dp0"
title EnvPortal Server

:: Load PORT from .env
set PORT=8080
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="PORT" set PORT=%%b
    )
)

:: Check for Administrator privileges
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Admin privileges required.
    echo [ERROR] Please right-click "start.bat" and select "Run as administrator".
    pause
    exit /b 1
)

echo Configuring Firewall for port %PORT%...
powershell -Command "if (!(Get-NetFirewallRule -DisplayName 'EnvPortal Default' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName 'EnvPortal Default' -Direction Inbound -LocalPort %PORT% -Protocol TCP -Action Allow -Description 'Allow EnvPortal Server IP Access' }"

echo Starting EnvPortal PowerShell Server...
powershell.exe -ExecutionPolicy Bypass -File "server.ps1"
pause
