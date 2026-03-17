# Run "weave init" inside WSL (Weave is not available in Windows PowerShell).
# Usage: From your project folder in PowerShell, run:
#   cd C:\Users\obourdo\my-initia-project
#   ..\yield_mind\scripts\weave-init.ps1
# Or from yield_mind: .\scripts\weave-init.ps1
# This starts WSL and runs weave init in the same path.

$winPath = (Get-Location).Path
$drive = $winPath.Substring(0, 1).ToLower()
$rest = $winPath.Substring(2) -replace '\\', '/'
$wslPath = "/mnt/$drive$rest"
Write-Host "Starting WSL and running 'weave init' in: $wslPath" -ForegroundColor Cyan
Write-Host "Weave is installed in WSL only. Ensure you ran scripts/install-wsl.sh first." -ForegroundColor Yellow
# Use single quotes so PowerShell does not expand $PATH/$HOME; only $wslPath is expanded
$bashCmd = 'export PATH=$PATH:$HOME/.local/bin:/usr/local/go/bin && cd ''' + $wslPath + ''' && weave init'
wsl -d Ubuntu -e bash -l -c $bashCmd
