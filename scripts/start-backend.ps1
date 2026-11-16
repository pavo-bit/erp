<#
.SYNOPSIS
  SSVM ERP — Start Backend API Server & Infrastructure
#>

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     SSVM ERP — Starting Backend API Server & Database" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Resolve-Path "$PSScriptRoot\.."
Set-Location $rootPath

# 1. Start DB, Redis, and Backend
Write-Host "Starting PostgreSQL, Redis, and Backend REST API server..." -ForegroundColor Yellow
docker compose up -d database redis pgbouncer backend

# 2. Wait for Health Check
Write-Host "Waiting for backend server to respond..." -ForegroundColor Yellow
$backendReady = $false
$maxRetries = 20
$retry = 0

while (-not $backendReady -and $retry -lt $maxRetries) {
    Start-Sleep -Seconds 2
    $retry++
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($health.status -eq "ok" -or $health.status -eq "healthy" -or $health) {
            $backendReady = $true
        }
    } catch {
        Write-Host -NoNewline "."
    }
}
Write-Host ""

if ($backendReady) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "     SSVM ERP Backend Server is Running (Port 5000)" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  API Root:         http://localhost:5000/"
    Write-Host "  Health Status:    http://localhost:5000/health"
    Write-Host "  API v1:           http://localhost:5000/api/v1"
    Write-Host "  API Docs:         http://localhost:5000/api/docs/spec.json"
    Write-Host "  PostgreSQL RLS:   localhost:5433 (ssvm_platform)"
    Write-Host "  Redis Cache:      localhost:6379"
    Write-Host ""
    Write-Host "Universal Demo Password: Password@123" -ForegroundColor Yellow
    Write-Host "Default Admin User:      admin@ssvm-cuttack.org" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Cyan
} else {
    Write-Host "  [!] Backend server is taking longer than expected to report healthy." -ForegroundColor Red
    Write-Host "      Check logs with: docker compose logs backend" -ForegroundColor Yellow
}
