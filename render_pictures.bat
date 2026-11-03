@echo off
REM Pre-render the satellite pictures for the before/after slider. Slow (an hour or more), so do it ahead of time, never while presenting.
REM Pictures go to data\imagery. The website then shows them instantly and offline.
cd /d "%~dp0backend"
echo Rendering pictures (this takes a long time; you can close this window to stop) ...
".venv\Scripts\python.exe" -u render_imagery.py
echo.
echo Done. Areas that were skipped need more satellite data first (see the messages above).
pause
