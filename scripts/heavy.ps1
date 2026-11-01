[CmdletBinding()]
param(
    [ValidateRange(1, 256)]
    [int]$Limit = [Math]::Max(1, [Math]::Floor([Environment]::ProcessorCount / 4)),

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Command,

    [string[]]$ArgumentList = @()
)

$ErrorActionPreference = 'Stop'

$semaphoreName = "Local\SSVM_ERP_Heavy_Limit_$Limit"
$createdNew = $false
$semaphore = $null
$acquired = $false
$processExitCode = 1

try {
    $semaphore = [System.Threading.Semaphore]::new(
        $Limit,
        $Limit,
        $semaphoreName,
        [ref]$createdNew
    )

    Write-Host "Waiting for heavy-job slot ($Limit concurrent maximum)."
    [void]$semaphore.WaitOne()
    $acquired = $true
    Write-Host 'Acquired heavy-job slot. Executing the requested command.'

    $global:LASTEXITCODE = $null
    & $Command @ArgumentList
    if ($null -eq $LASTEXITCODE) {
        # PowerShell-native commands do not set LASTEXITCODE. Reaching this line
        # without a terminating error means the command completed successfully.
        $processExitCode = 0
    }
    else {
        $processExitCode = [int]$LASTEXITCODE
    }
}
catch {
    Write-Host "Heavy command failed: $($_.Exception.Message)" -ForegroundColor Red
    $processExitCode = 1
}
finally {
    if ($acquired -and $null -ne $semaphore) {
        try {
            [void]$semaphore.Release()
        }
        catch {
            Write-Warning "Could not release heavy-job semaphore cleanly: $($_.Exception.Message)"
            if ($processExitCode -eq 0) { $processExitCode = 1 }
        }
    }

    if ($null -ne $semaphore) {
        $semaphore.Dispose()
    }
}

Write-Host "Heavy command exit code: $processExitCode"
exit $processExitCode
