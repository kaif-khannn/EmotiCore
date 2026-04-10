@echo off
echo =========================================
echo Starting EmotiCore Backend API
echo =========================================

cd /d "%~dp0backend"
echo Launching Uvicorn Server using Virtual Environment Python...

..\venv\Scripts\python.exe main.py

pause
