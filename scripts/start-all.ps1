<#
.SYNOPSIS
  SSVM ERP — Unified 1-Command Startup Script
  Starts PostgreSQL 16, Redis 7, PgBouncer, Backend REST API Server, and all 7 Next.js Portals.
#>

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     SSVM ERP — Starting Backend Server & All Portals" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Resolve-Path "$PSScriptRoot\.."
Set-Location $rootPath

# 1. Verify Docker Daemon
Write-Host "[1/4] Checking Docker daemon..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [!] Docker is not running. Please start Docker Desktop and run this command again." -ForegroundColor Red
        exit 1
    }
    Write-Host "  -> Docker daemon is running." -ForegroundColor Green
} catch {
    Write-Host "  [!] Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Start Infrastructure & Backend First
Write-Host ""
Write-Host "[2/4] Starting PostgreSQL, Redis, and Backend REST API server..." -ForegroundColor Yellow
docker compose up -d database redis pgbouncer backend

# 3. Wait and Verify Backend Server is Healthy
Write-Host ""
Write-Host "[3/4] Waiting for Backend Server (http://localhost:5000) to be fully ready..." -ForegroundColor Yellow
$backendReady = $false
$maxRetries = 25
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
    Write-Host "  -> Backend REST API Server is RUNNING and HEALTHY at http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "  -> Backend server is still initializing. Continuing to launch portals..." -ForegroundColor Yellow
}

# 4. Start All 7 Portals
Write-Host ""
Write-Host "[4/4] Starting all 7 Next.js frontend portals..." -ForegroundColor Yellow
docker compose up -d erp-admin super-admin teacher-portal student-portal parent-portal payment-portal saas-frontend grafana prometheus alertmanager

Start-Sleep -Seconds 4

# 5. Service Directory Summary
$services = @(
    @{ Name = "Backend REST API";    Url = "http://localhost:5000"; Role = "CORE API";     User = "Endpoints: /api/v1, /health" },
    @{ Name = "ERP Admin Portal";    Url = "http://localhost:3000"; Role = "ERP_ADMIN";    User = "admin@ssvm-cuttack.org" },
    @{ Name = "Super Admin Portal";  Url = "http://localhost:3001"; Role = "SUPER_ADMIN";  User = "superadmin@ssvm-erp.com" },
    @{ Name = "Teacher Portal";      Url = "http://localhost:3002"; Role = "TEACHER";      User = "teacher@ssvm-cuttack.org" },
    @{ Name = "Student Portal";      Url = "http://localhost:3003"; Role = "STUDENT";      User = "student@ssvm-cuttack.org" },
    @{ Name = "Parent Portal";       Url = "http://localhost:3006"; Role = "PARENT";       User = "parent@ssvm-cuttack.org" },
    @{ Name = "Payment Portal";      Url = "http://localhost:3007"; Role = "PUBLIC";       User = "Admission No: ADM-2026-001" },
    @{ Name = "SaaS Landing Page";   Url = "http://localhost:3008"; Role = "PUBLIC";       User = "Self-Registration / Demo" }
)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "       SSVM ERP — All Services & Portals Running!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Universal Demo Password: Password@123" -ForegroundColor Yellow
Write-Host ""

foreach ($s in $services) {
    $statusText = "[ONLINE]"
    try {
        $res = Invoke-WebRequest -Uri $s.Url -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($res.StatusCode -ne 200 -and $res.StatusCode -ne 304) { $statusText = "[$($res.StatusCode)]" }
    } catch {
        $statusText = "[STARTING]"
    }
    
    Write-Host ("{0,-22} {1,-26} {2,-10} {3}" -f $s.Name, $s.Url, $statusText, $s.User)
}

Write-Host ""
Write-Host "Database (PostgreSQL): localhost:5433 (ssvm_platform)"
Write-Host "Cache (Redis 7):       localhost:6379"
Write-Host "Grafana Dashboards:    http://localhost:3004 (admin / admin)"
Write-Host "Prometheus Telemetry:  http://localhost:9090"
Write-Host ""
Write-Host "To stop all services anytime, run: .\stop-all.bat" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
