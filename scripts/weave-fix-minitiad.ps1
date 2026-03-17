# Fix binary extraction panics during weave init (minitiad/minimove).
# Weave sometimes downloads binaries in a flat folder while expecting a nested
# folder. This script clears bad cache and also creates compatibility links.
# Run from PowerShell; then run weave init again (e.g. .\scripts\weave-init.ps1).

$ErrorActionPreference = "Stop"
Write-Host "Cleaning stale Initia cache so you can retry 'weave init'..." -ForegroundColor Cyan
Write-Host "This removes ~/.weave/data/initia@v1.3.1* in WSL." -ForegroundColor Yellow

wsl -d Ubuntu -e bash -l -c 'rm -rf ~/.weave/data/initia@v1.3.1* 2>/dev/null; echo "Initia cache cleaned."'

Write-Host "Applying path compatibility shim for already-downloaded binaries..." -ForegroundColor Cyan
wsl -d Ubuntu -e bash -l -c '
set -e
mkdir -p ~/.weave/data

fix_layout() {
  local root="$1"
  local ver="$2"
  local nested="$root/${ver}"
  if [ -f "$root/minitiad" ] && [ ! -f "$nested/minitiad" ]; then
    mkdir -p "$nested"
    ln -sf ../minitiad "$nested/minitiad"
  fi
  if [ -f "$root/libwasmvm.x86_64.so" ] && [ ! -f "$nested/libwasmvm.x86_64.so" ]; then
    mkdir -p "$nested"
    ln -sf ../libwasmvm.x86_64.so "$nested/libwasmvm.x86_64.so"
  fi
}

fix_layout "$HOME/.weave/data/miniwasm@v1.2.10" "miniwasm_v1.2.10"
fix_layout "$HOME/.weave/data/minimove@v1.1.10" "minimove_v1.1.10"
echo "Shim applied (if matching files existed)."
'
