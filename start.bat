@echo off
rem Startet FinanceConsulter (Backend + Frontend). Optionen werden an start.ps1 weitergegeben, z. B. start.bat -Full
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
if errorlevel 1 pause
