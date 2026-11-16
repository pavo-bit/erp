@echo off
REM ══════════════════════════════════════════════════════════════════
REM SSVM ERP — 1-Command Restart for All Portals and Services
REM ══════════════════════════════════════════════════════════════════
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-all.ps1"
pause
