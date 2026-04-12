@echo off
setlocal
title EmotiCore Backend API

echo =========================================
echo   EMOTICORE  -  Backend Intelligence
echo =========================================
echo.

:: Set environment variables for better startup performance
set TF_CPP_MIN_LOG_LEVEL=2
set TF_ENABLE_ONEDNN_OPTS=0
set PYTHONPATH=%~dp0backend

:: Check if virtual environment exists
if not exist "%~dp0venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found at %~dp0venv
    echo Run: python -m venv venv ^&^& .\venv\Scripts\pip install -r backend\requirements.txt
    :: Use timeout instead of pause to gracefully fail in headless deployments
    timeout /t 10
    exit /b 1
)

echo [INFO] Environment Initialized.
echo [INFO] Launching FastAPI via Uvicorn...
echo.

cd /d "%~dp0backend"
:: Properly quote the executable to prevent issues with spaces in directory paths
"%~dp0venv\Scripts\python.exe" main.py

if %errorlevel% neq 0 (
    echo.
    echo [CRITICAL] Backend crashed with error level %errorlevel%
    timeout /t 10
    exit /b %errorlevel%
)

endlocal
