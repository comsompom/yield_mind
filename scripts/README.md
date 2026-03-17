# Scripts

- **check-prereqs.ps1** — Run on Windows (PowerShell) to check Node, npm, Docker, Go, Python. Use before following [docs/GET_STARTED.md](../docs/GET_STARTED.md).
- **install-wsl.sh** — Run inside **WSL (Ubuntu)** to install Weave CLI, Go, Rust, jq, lz4, and build-essential. Required for the Initia appchain flow.

## Run prereq check (Windows)

```powershell
.\scripts\check-prereqs.ps1
```

## Install appchain tools (WSL)

From Windows PowerShell (run once):

```powershell
wsl -d Ubuntu bash -c "cd /mnt/c/Users/obourdo/yield_mind && bash scripts/install-wsl.sh"
```

Then open a **new** WSL Ubuntu terminal and run `source ~/.bashrc`. After that, `weave version`, `go version`, and `rustc --version` should work. Run `weave init` when ready to create your appchain.
