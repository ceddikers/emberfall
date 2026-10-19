@echo off
rem Double-click to serve the game locally at http://localhost:3000 (for testing).
rem Close this window to stop it.
cd /d "%~dp0"
start "" http://localhost:3000
node server\server.js
pause
