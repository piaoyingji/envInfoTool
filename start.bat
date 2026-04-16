@echo off
title EnvPortal Server

:: Check for Administrator privileges
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Admin privileges required.
    echo [ERROR] Please right-click "start.bat" and select "Run as administrator".
    pause
    exit /b 1
)

cd /d "%~dp0"
echo Configuring Firewall...
powershell -Command "if (!(Get-NetFirewallRule -DisplayName 'EnvPortal Default' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName 'EnvPortal Default' -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -Description 'Allow EnvPortal Server IP Access' }"

echo Starting EnvPortal PowerShell Server...
powershell.exe -ExecutionPolicy Bypass -File "server.ps1"
pause
