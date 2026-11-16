@echo off
REM ══════════════════════════════════════════════════════════════════
REM SSVM ERP — 1-Command Shutdown for All Deployed Portals
REM ══════════════════════════════════════════════════════════════════
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-all.ps1"
pause
