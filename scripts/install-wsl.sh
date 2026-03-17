#!/usr/bin/env bash
# Run inside WSL (Ubuntu) to install Weave CLI, initiad, jq, lz4, Go, Rust for Initia hackathon.
# From Windows: wsl -e bash -c "cd /mnt/c/Users/obourdo/yield_mind/scripts && chmod +x install-wsl.sh && ./install-wsl.sh"
# Or: wsl bash ./scripts/install-wsl.sh (from project root in WSL path)

set -e
echo "=== Initia / YieldMind — WSL install (Weave, initiad, jq, lz4, Go, Rust) ==="

# Use project path: if script is in scripts/install-wsl.sh, go to repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Update and install system deps
sudo apt-get update -qq
sudo apt-get install -y curl wget git build-essential jq
(command -v lz4 >/dev/null) || { sudo apt-get install -y lz4 2>/dev/null || sudo apt-get install -y liblz4-tool 2>/dev/null || true; }

# Go 1.22+
if ! command -v go &>/dev/null; then
    echo "Installing Go..."
    GO_VER="1.22.4"
    wget -q "https://go.dev/dl/go${GO_VER}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf /tmp/go.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    export PATH=$PATH:/usr/local/go/bin
    rm /tmp/go.tar.gz
else
    echo "Go already installed: $(go version)"
fi
export PATH=$PATH:/usr/local/go/bin

# Rust (for Wasm track)
if ! command -v rustc &>/dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    . "$HOME/.cargo/env"
else
    echo "Rust already installed: $(rustc --version)"
fi
. "$HOME/.cargo/env" 2>/dev/null || true

# Weave: download latest release
WEAVE_VERSION=$(curl -s https://api.github.com/repos/initia-labs/weave/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
if [ -z "$WEAVE_VERSION" ]; then
    echo "Could not detect Weave version; trying v0.2.0"
    WEAVE_VERSION="0.2.0"
fi
echo "Installing Weave v$WEAVE_VERSION..."
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    WEAVE_ARCH="amd64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    WEAVE_ARCH="arm64"
else
    WEAVE_ARCH="amd64"
fi
WEAVE_URL="https://github.com/initia-labs/weave/releases/download/v${WEAVE_VERSION}/weave-${WEAVE_VERSION}-linux-${WEAVE_ARCH}.tar.gz"
mkdir -p "$HOME/.local/bin"
if wget -q "$WEAVE_URL" -O /tmp/weave.tar.gz 2>/dev/null; then
    tar -xzf /tmp/weave.tar.gz -C "$HOME/.local/bin"
    chmod +x "$HOME/.local/bin/weave"
    echo 'export PATH=$PATH:$HOME/.local/bin' >> ~/.bashrc
    export PATH=$PATH:$HOME/.local/bin
    rm /tmp/weave.tar.gz
    echo "Weave installed: $($HOME/.local/bin/weave version 2>/dev/null || echo 'binary in ~/.local/bin')"
else
    echo "Weave binary not found at $WEAVE_URL. Install manually: https://docs.initia.xyz/developers/developer-guides/tools/clis/weave-cli/installation"
fi

# initiad (Initia L1 node binary) - optional for local dev; often Weave bundles or uses prebuilt.
# If needed: clone initia and build, or use Weave's bundled way. Skip for now.

echo ""
echo "=== Done. In a new WSL (Ubuntu) terminal, run: source ~/.bashrc"
echo "Then: weave version   # should show v0.3.6 or later"
echo "Next: weave init (interactive) to create your appchain."
echo ""
echo "Weave is in: \$HOME/.local/bin"
echo "Go is in: /usr/local/go/bin"
echo "Rust is in: \$HOME/.cargo/bin"
