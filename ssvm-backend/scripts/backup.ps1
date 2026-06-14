param (
    [string]$DbUrl = "postgresql://postgres:postgres@localhost:5432/ssvm_platform",
    [string]$OutputDir = "./backups"
)

# Ensure backup directory exists
if (!(Test-Path -Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$OutputDir/ssvm_platform_$timestamp.dump"

Write-Host "Starting backup of ssvm_platform to $backupFile..." -ForegroundColor Cyan

# Run pg_dump (Assumes pg_dump is in PATH or using Docker)
# If using Docker, we can use docker exec
# docker exec -t ssvm-backend-db-1 pg_dump -U postgres -F c ssvm_platform > $backupFile
# For local postgres:
pg_dump --dbname=$DbUrl --format=c --file=$backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Backup failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
