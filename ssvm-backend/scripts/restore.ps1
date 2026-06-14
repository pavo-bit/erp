param (
    [string]$BackupFile,
    [string]$DbUrl = "postgresql://postgres:postgres@localhost:5432/ssvm_platform_restored",
    [switch]$Clean
)

if (-not $BackupFile) {
    Write-Host "Error: BackupFile parameter is required." -ForegroundColor Red
    exit 1
}

if (!(Test-Path -Path $BackupFile)) {
    Write-Host "Error: Backup file $BackupFile not found." -ForegroundColor Red
    exit 1
}

Write-Host "Starting restore of $BackupFile to $DbUrl..." -ForegroundColor Cyan

$cleanArg = ""
if ($Clean) {
    $cleanArg = "--clean"
}

# Run pg_restore
pg_restore --dbname=$DbUrl $cleanArg --format=c $BackupFile

if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1) {
    # Exit code 1 can occur if --clean is used and tables don't exist yet
    Write-Host "Restore completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Restore failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
