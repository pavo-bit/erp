# scripts/run-parallel-checks.ps1
# High-Performance Parallel Execution Coordinator for SSVM ERP
param(
    [int]$Concurrency = 4
)

$ErrorActionPreference = 'Stop'

# Ensure test environment variables are loaded
if (Test-Path "$PSScriptRoot\test-env.ps1") {
    . "$PSScriptRoot\test-env.ps1"
}

$env:CONCURRENCY = $Concurrency
node "$PSScriptRoot\run-parallel-checks.js" --concurrency=$Concurrency
exit $LASTEXITCODE

