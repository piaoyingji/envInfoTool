@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "PYTHON_CMD="
py -3 --version >nul 2>&1
if not errorlevel 1 set "PYTHON_CMD=py -3"

if "%PYTHON_CMD%"=="" (
  python --version >nul 2>&1
  if not errorlevel 1 set "PYTHON_CMD=python"
)

if "%PYTHON_CMD%"=="" (
  echo Python 3 is required but was not found.
  echo.
  echo [1] Install Python automatically with winget
  echo [2] Exit
  echo.
  choice /c 12 /n /m "Choose an option [1/2]: "
  if errorlevel 2 exit /b 1

  winget --version >nul 2>&1
  if errorlevel 1 (
    echo.
    echo winget was not found. Install Python 3 from https://www.python.org/downloads/
    pause
    exit /b 1
  )

  echo.
  echo Installing Python 3 via winget...
  winget install -e --id Python.Python.3.13 --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo.
    echo Python installation failed.
    pause
    exit /b 1
  )

  set "PYTHON_CMD=py -3"
  py -3 --version >nul 2>&1
  if errorlevel 1 set "PYTHON_CMD=python"
  %PYTHON_CMD% --version >nul 2>&1
  if errorlevel 1 (
    echo.
    echo Python was installed, but it is not available in this terminal yet.
    echo Close this window and run start.bat again.
    pause
    exit /b 1
  )
)

%PYTHON_CMD% "run.py"
