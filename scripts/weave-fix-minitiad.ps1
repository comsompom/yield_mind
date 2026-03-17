# Fix "chmod minitiad: no such file or directory" during weave init.
# Weave sometimes fails to extract the Miniwasm binary correctly. This script
# removes the partial download so you can retry weave init (in WSL).
# Run from PowerShell; then run weave init again (e.g. .\scripts\weave-init.ps1).

$ErrorActionPreference = "Stop"
Write-Host "Cleaning Weave Miniwasm data so you can retry 'weave init'..." -ForegroundColor Cyan
Write-Host "This removes ~/.weave/data/miniwasm* in WSL (partial/failed download)." -ForegroundColor Yellow

wsl -d Ubuntu -e bash -l -c 'rm -rf ~/.weave/data/miniwasm* 2>/dev/null; echo "Done. Run weave init again (e.g. scripts\weave-init.ps1 from your project folder)."'
