# YieldMind — one-time setup: venv, deps, .env, local-ids template
# Run from repo root: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $Root "app"))) {
    $Root = (Get-Location).Path
}
Set-Location $Root

Write-Host "=== YieldMind setup (repo: $Root) ===" -ForegroundColor Cyan

# 1. Python venv
$venv = Join-Path $Root ".venv"
if (-not (Test-Path (Join-Path $venv "Scripts\python.exe"))) {
    Write-Host "Creating .venv..." -ForegroundColor Yellow
    python -m venv $venv
}
$py = Join-Path $venv "Scripts\python.exe"
$pip = Join-Path $venv "Scripts\pip.exe"

# 2. Install dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
& $pip install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3. .env from example if missing
$envFile = Join-Path $Root ".env"
$envExample = Join-Path $Root ".env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item $envExample $envFile
}

# 4. local-ids template (user fills after weave init)
$initia = Join-Path $Root ".initia"
$localIds = Join-Path $initia "local-ids.md"
$localIdsExample = Join-Path $initia "local-ids.example.md"
if (-not (Test-Path $localIds) -and (Test-Path $localIdsExample)) {
    Write-Host "Creating .initia/local-ids.md from example (fill after weave init)..." -ForegroundColor Yellow
    Copy-Item $localIdsExample $localIds
}

# 5. Verify app
Write-Host "Verifying app..." -ForegroundColor Yellow
& $py -c "from app import create_app; create_app(); print('App OK')"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Setup done. Run: python run.py" -ForegroundColor Green
