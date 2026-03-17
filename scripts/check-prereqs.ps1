# YieldMind — Check prerequisites for Initia Hackathon
# See docs/GET_STARTED.md for full setup.

$ErrorActionPreference = "SilentlyContinue"
$ok = $true

Write-Host "`n=== YieldMind / Initia Hackathon Prerequisites ===`n" -ForegroundColor Cyan

# Node v20+
$nodeVer = (node --version 2>$null) -replace 'v',''
if ($nodeVer) {
    $major = [int]($nodeVer.Split('.')[0])
    if ($major -ge 20) { Write-Host "[OK] Node $nodeVer (need v20+)" -ForegroundColor Green }
    else { Write-Host "[!!] Node $nodeVer - need v20+" -ForegroundColor Yellow; $ok = $false }
} else {
    Write-Host '[X] Node not found. Install from https://nodejs.org' -ForegroundColor Red
    $ok = $false
}

# npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "[OK] npm $(npm --version)" -ForegroundColor Green
} else {
    Write-Host '[X] npm not found' -ForegroundColor Red
    $ok = $false
}

# Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerVer = docker --version 2>$null
    Write-Host "[OK] Docker: $dockerVer" -ForegroundColor Green
} else {
    Write-Host "[!!] Docker not found. Required for IBC relayer. Install Docker Desktop." -ForegroundColor Yellow
    $ok = $false
}

# Go (needed for Weave / minitiad build; optional on Windows if using WSL for Weave)
$goVer = (go version 2>$null)
if ($goVer) {
    Write-Host "[OK] $goVer" -ForegroundColor Green
} else {
    Write-Host "[!!] Go not found. Required to build Weave/minitiad. On Windows, install Go or use WSL for Weave." -ForegroundColor Yellow
    Write-Host "    https://go.dev/doc/install" -ForegroundColor Gray
}

# Python (for YieldMind Flask app)
$pyVer = (python --version 2>$null)
if ($pyVer) {
    Write-Host "[OK] $pyVer" -ForegroundColor Green
} else {
    $py3 = (python3 --version 2>$null)
    if ($py3) { Write-Host "[OK] $py3" -ForegroundColor Green }
    else {
        Write-Host "[!!] Python 3 not found. Required for YieldMind Flask app." -ForegroundColor Yellow
        $ok = $false
    }
}

# Weave (Linux/macOS only; on Windows use WSL)
$weaveVer = (weave version 2>$null)
if ($weaveVer) {
    Write-Host "[OK] Weave: $weaveVer" -ForegroundColor Green
} else {
    Write-Host "[..] Weave not in PATH. Install in WSL/Linux/macOS per docs/GET_STARTED.md" -ForegroundColor Gray
    if ($env:OS -match "Windows") {
        Write-Host "    On Windows: run Weave inside WSL (Weave supports Linux/macOS only)." -ForegroundColor Gray
    }
}

Write-Host ""
if ($ok) {
    Write-Host "Prerequisites OK for YieldMind app. For appchain (weave init), use WSL/Linux/macOS." -ForegroundColor Green
} else {
    Write-Host 'Fix missing items above, then see docs/GET_STARTED.md' -ForegroundColor Yellow
}
Write-Host ""
