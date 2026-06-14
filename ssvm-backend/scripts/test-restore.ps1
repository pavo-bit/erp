param (
    [string]$DbUrl = "postgresql://postgres:postgres@localhost:5432/ssvm_platform",
    [string]$TestDbUrl = "postgresql://postgres:postgres@localhost:5432/ssvm_platform_test_restore"
)

Write-Host "--- Disaster Recovery Restore Validation ---" -ForegroundColor Cyan

# 1. Take a backup of the live database
$OutputDir = "./backups"
if (!(Test-Path -Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$OutputDir/ssvm_platform_dr_test_$timestamp.dump"

Write-Host "1. Running backup..."
& ./scripts/backup.ps1 -DbUrl $DbUrl -OutputDir $OutputDir | Out-Null
# Find the latest backup
$latestBackup = Get-ChildItem -Path $OutputDir -Filter "*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $latestBackup) {
    Write-Host "Backup failed to create a file." -ForegroundColor Red
    exit 1
}

$backupPath = $latestBackup.FullName
Write-Host "Backup created: $backupPath"

# 2. Recreate the test database
Write-Host "2. Recreating test database..."
# Note: Requires dropping connections to the test DB if it exists
# We connect to postgres system db to drop/create
$sysDbUrl = "postgresql://postgres:postgres@localhost:5432/postgres"

# Use psql to execute DDL
$psqlCmd = "DROP DATABASE IF EXISTS ssvm_platform_test_restore; CREATE DATABASE ssvm_platform_test_restore;"
psql $sysDbUrl -c $psqlCmd | Out-Null

# 3. Restore to the test database
Write-Host "3. Restoring to test database..."
& ./scripts/restore.ps1 -BackupFile $backupPath -DbUrl $TestDbUrl | Out-Null

# 4. Verification
Write-Host "4. Verifying record counts..."
$query = "SELECT 'invoices' as table, COUNT(*) as count FROM invoices UNION ALL SELECT 'payment_transactions', COUNT(*) FROM payment_transactions;"

$liveCounts = psql $DbUrl -c $query -t -A
$testCounts = psql $TestDbUrl -c $query -t -A

Write-Host "Live DB Counts:"
Write-Host $liveCounts
Write-Host "Restored DB Counts:"
Write-Host $testCounts

if ($liveCounts -eq $testCounts) {
    Write-Host "Validation Passed: Record counts match exactly." -ForegroundColor Green
} else {
    Write-Host "Validation Failed: Mismatched record counts!" -ForegroundColor Red
    exit 1
}

Write-Host "Disaster Recovery Test Completed Successfully." -ForegroundColor Green
