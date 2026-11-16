<#
.SYNOPSIS
  SSVM ERP — Unified 1-Command Restart Script
  Kills all running deployed portals and restarts them cleanly.
#>

$rootPath = Resolve-Path "$PSScriptRoot\.."
Set-Location $rootPath

Write-Host "Restarting SSVM ERP platform..." -ForegroundColor Cyan

& "$PSScriptRoot\stop-all.ps1"
Start-Sleep -Seconds 2
& "$PSScriptRoot\start-all.ps1"
