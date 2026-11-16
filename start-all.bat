@echo off
REM ══════════════════════════════════════════════════════════════════
REM SSVM ERP — 1-Command Startup for All Portals, Backend & DB
REM ══════════════════════════════════════════════════════════════════
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1"
pause
