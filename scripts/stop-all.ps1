<#
.SYNOPSIS
  SSVM ERP — Unified 1-Command Shutdown Script
  Stops and cleans up all deployed portals and backend containers without data loss.
#>

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Red
Write-Host "     SSVM ERP — Stopping All Deployed Portals & Backend" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Red
Write-Host ""

$rootPath = Resolve-Path "$PSScriptRoot\.."
Set-Location $rootPath

Write-Host "Stopping all Docker containers (preserving database volume)..." -ForegroundColor Yellow
docker compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  -> All portals, backend, and infrastructure containers stopped cleanly." -ForegroundColor Green
    Write-Host "  -> Database records are safely preserved in ssvm_database volume." -ForegroundColor Green
    Write-Host ""
    Write-Host "To restart everything with one command, run: .\start-all.bat" -ForegroundColor Cyan
} else {
    Write-Host "  [!] Docker compose encountered an issue while stopping." -ForegroundColor Yellow
}

Write-Host "============================================================" -ForegroundColor Red
