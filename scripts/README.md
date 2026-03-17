# Scripts

- **setup.ps1** — **Run this first.** One-time setup: creates `.venv`, installs Python deps, copies `.env` from example if missing, copies `.initia/local-ids.md` from example. From repo root: `.\scripts\setup.ps1`
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

Then open a **new** WSL Ubuntu terminal and run `source ~/.bashrc`. After that, `weave version`, `go version`, and `rustc --version` should work.

### Run `weave init` (must use WSL)

**Weave is not in Windows PATH** — it only runs inside WSL (Ubuntu).

**Option A — From PowerShell (launches WSL for you):**  
From your project folder (e.g. `my-initia-project` or `yield_mind`), run:

```powershell
# If you're in yield_mind:
.\scripts\weave-init.ps1

# If you're in another folder (e.g. my-initia-project), run the script from yield_mind:
cd C:\Users\obourdo\my-initia-project
C:\Users\obourdo\yield_mind\scripts\weave-init.ps1
```

**Option B — From WSL (Ubuntu) terminal:**  
1. Open **Ubuntu** from the Start menu (or type `wsl` in PowerShell).  
2. Run:
   ```bash
   source ~/.bashrc
   cd /mnt/c/Users/obourdo/my-initia-project
   weave init
   ```
   (Use your actual Windows path; in WSL, `C:\Users\obourdo\...` becomes `/mnt/c/Users/obourdo/...`.)
