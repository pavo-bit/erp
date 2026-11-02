# scripts/test-env.ps1
# Loads and validates environment variables for SSVM tests

if (-not $env:DATABASE_URL_TEST) {
    $env:DATABASE_URL_TEST = "postgresql://ssvm_app:app_pw@localhost:5433/ssvm_test?schema=public"
}
if (-not $env:DATABASE_URL_TEST_FIXTURE) {
    $env:DATABASE_URL_TEST_FIXTURE = "postgresql://ssvm_fixture:fixture_pw@localhost:5433/ssvm_test?schema=public"
}
if (-not $env:DATABASE_URL_AUTH) {
    $env:DATABASE_URL_AUTH = "postgresql://ssvm_auth:authpassword@localhost:5433/ssvm_test?schema=public"
}
if (-not $env:DATABASE_URL_TRUSTED) {
    $env:DATABASE_URL_TRUSTED = "postgresql://ssvm_trusted:trustedpassword@localhost:5433/ssvm_test?schema=public"
}
if (-not $env:REDIS_URL_TEST) {
    $env:REDIS_URL_TEST = "redis://localhost:6379/1"
}
if (-not $env:REDIS_URL) {
    $env:REDIS_URL = "redis://localhost:6379/1"
}
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = $env:DATABASE_URL_TEST
}
if (-not $env:DIRECT_URL) {
    $env:DIRECT_URL = "postgresql://postgres:postgres@localhost:5433/ssvm_test?schema=public"
}
if (-not $env:DATABASE_URL_ADMIN) {
    $env:DATABASE_URL_ADMIN = "postgresql://postgres:postgres@localhost:5433/postgres"
}
if (-not $env:JWT_SECRET) {
    $env:JWT_SECRET = "test-jwt-secret-key-ssvm-college-square-test-environment-32chars"
}
if (-not $env:NODE_OPTIONS -or -not $env:NODE_OPTIONS.Contains("--preserve-symlinks")) {
    $env:NODE_OPTIONS = "$($env:NODE_OPTIONS) --preserve-symlinks --preserve-symlinks-main".Trim()
}

# Fail loudly if any is unset
$required = @("DATABASE_URL_TEST", "DATABASE_URL_TEST_FIXTURE", "DATABASE_URL_AUTH", "DATABASE_URL_TRUSTED", "REDIS_URL_TEST")
foreach ($var in $required) {
    $val = (Get-Item "env:$var" -ErrorAction SilentlyContinue).Value
    if ([string]::IsNullOrWhiteSpace($val)) {
        throw "FATAL: Required test environment variable '$var' is unset or empty."
    }
}

Write-Host "Test environment loaded successfully."
Write-Host "  DATABASE_URL_TEST: ssvm_app on localhost:5433"
Write-Host "  DATABASE_URL_TEST_FIXTURE: ssvm_fixture on localhost:5433"
Write-Host "  REDIS_URL_TEST: $env:REDIS_URL_TEST"
