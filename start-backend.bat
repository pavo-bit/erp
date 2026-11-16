@echo off
REM ══════════════════════════════════════════════════════════════════
REM SSVM ERP — 1-Command Startup for Backend Server & Database
REM ══════════════════════════════════════════════════════════════════
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-backend.ps1"
pause
