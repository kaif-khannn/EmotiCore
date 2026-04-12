@echo off
echo =========================================
echo Starting EmotiCore Frontend Dev Server
echo =========================================

cd /d "%~dp0frontend"
echo Launching Vite Dev Server...

call npm run dev

if %errorlevel% neq 0 (
    echo Frontend server crashed with error level %errorlevel%
    timeout /t 10
    exit /b %errorlevel%
)
