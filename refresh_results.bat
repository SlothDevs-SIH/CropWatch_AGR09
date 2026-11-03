@echo off
REM Rebuild the results from whatever satellite data is in data\raw, then tell you to restart the server.
REM Run this after new whole-taluka downloads finish (see docs\ACCESS_GUIDE.md, "Finish the data").
cd /d "%~dp0backend"
echo Rebuilding results (takes a few minutes) ...
".venv\Scripts\python.exe" build_results.py
echo.
echo Done. Restart the server (close its window, then run start_cropwatch.bat) so it picks up the new files.
pause
