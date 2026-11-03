@echo off
REM Start Crop Watch on this computer and open it in the browser.
REM Needs backend\.venv (see README) and a built website in frontend\dist (run "npm run build" in frontend once).
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
  echo The Python environment is missing. Follow "Setup" in README.md first.
  pause
  exit /b 1
)
echo Starting the Crop Watch server on http://127.0.0.1:8100 ...
start "Crop Watch server" ".venv\Scripts\python.exe" -m uvicorn server:app --port 8100
timeout /t 5 >nul
start http://127.0.0.1:8100/
echo.
echo Crop Watch is open in your browser. Close the "Crop Watch server" window to stop it.
