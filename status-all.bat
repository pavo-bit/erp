@echo off
REM ══════════════════════════════════════════════════════════════════
REM SSVM ERP — 1-Command Live Status Check for All Portals
REM ══════════════════════════════════════════════════════════════════
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\status-all.ps1"
pause
