<#
.SYNOPSIS
  SSVM ERP — Quick Portal Status Probe
#>

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       SSVM ERP — Platform Services Live Status" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{ Name = "Super Admin Portal";  Url = "http://localhost:3001"; Port = 3001 },
    @{ Name = "ERP Admin Portal";    Url = "http://localhost:3000"; Port = 3000 },
    @{ Name = "Teacher Portal";      Url = "http://localhost:3002"; Port = 3002 },
    @{ Name = "Student Portal";      Url = "http://localhost:3003"; Port = 3003 },
    @{ Name = "Parent Portal";       Url = "http://localhost:3006"; Port = 3006 },
    @{ Name = "Payment Portal";      Url = "http://localhost:3007"; Port = 3007 },
    @{ Name = "SaaS Landing Page";   Url = "http://localhost:3008"; Port = 3008 },
    @{ Name = "Backend REST API";    Url = "http://localhost:5000/health"; Port = 5000 },
    @{ Name = "Grafana Dashboards";  Url = "http://localhost:3004"; Port = 3004 },
    @{ Name = "Prometheus Metrics";  Url = "http://localhost:9090"; Port = 9090 }
)

foreach ($s in $services) {
    try {
        $res = Invoke-WebRequest -Uri $s.Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        Write-Host ("  [ONLINE]  {0,-24} -> {1} (HTTP {2})" -f $s.Name, $s.Url, $res.StatusCode) -ForegroundColor Green
    } catch {
        Write-Host ("  [OFFLINE] {0,-24} -> {1}" -f $s.Name, $s.Url) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
