# YieldMind — Get Started (Initia Hackathon)

This guide follows [Initia Hackathon: Set Up Your Appchain](https://docs.initia.xyz/hackathon/get-started). Do these steps once to prepare your environment and appchain.

---

## Step 1: Prepare Your Workspace

You're already in the YieldMind project (`yield_mind`). Keep this repo as the app root. For the **appchain** (Weave/rollup), you can either:

- **Option A:** Use a separate folder for the chain (e.g. `../yieldmind-chain`) and run `weave init` there; then point YieldMind's `.env` to that rollup's RPC.
- **Option B:** Use **WSL** (Windows Subsystem for Linux) and run all Weave steps inside a Linux environment (see Windows note below).

---

## Step 2: Install Your AI Skill

Your AI agent (e.g. Cursor) can use the **Initia Appchain Dev** skill to help with contracts, Weave, and frontend.

Run in the project root:

```bash
npx skills add initia-labs/agent-skills
```

When prompted, select **Cursor** (and any other agents you use). This installs the `initia-appchain-dev` skill so you can ask the AI to set up the Wasm environment, verify tools, and help with contracts.

---

## Step 3: Choose Your Track & VM

For **YieldMind** (AI & Tooling + DeFi):

| Track            | VM   | Use case                          |
|------------------|------|------------------------------------|
| **Agents/Tooling** | **Wasm (Rust)** | Primary — AI agent, tooling, performance |
| DeFi             | EVM  | Optional — if you add Solidity later |

We'll use **Wasm** for the appchain so the AI skill sets up the right binary (`minitiad`).

---

## Step 4: Prerequisites Checklist

Verify these are installed:

| Tool | Required | How to check | Notes |
|------|----------|--------------|--------|
| **Docker Desktop** | Yes | `docker --version` | Must be running for relayer. |
| **Go 1.22+** | Yes (for building Weave/minitiad) | `go version` | [Install Go](https://go.dev/doc/install). On Windows use WSL or install Go for Windows. |
| **Node v20+** | Yes (for relayer/skills) | `node --version` | You have this. |
| **Rust & Cargo** | Yes (Wasm track) | `rustc --version` | [rustup.rs](https://rustup.rs). For Wasm contracts. |
| **LZ4** | Yes (Weave) | `lz4 --version` | Linux: `apt-get install lz4`; macOS: `brew install lz4`. In WSL: `sudo apt install lz4`. |

**Windows:** Weave CLI officially supports **Linux and macOS** only. To run `weave init` and the rollup:

1. Install **WSL2** and a Linux distro (e.g. Ubuntu).
2. Inside WSL: install Go, Docker (or use Docker Desktop from Windows), Node, Rust, LZ4.
3. Install Weave inside WSL (see Step 6).
4. Run `weave init` and the rest of the steps in WSL. Your rollup will listen on `localhost:26657` from Windows too.

---

## Step 5: AI-Powered Tool Setup (Wasm)

After the Initia skill is installed, ask your AI agent (Cursor):

```text
Using the `initia-appchain-dev` skill, please set up my environment for the Wasm track.
```

The skill will install the core CLIs (`weave`, `initiad`, `jq`) and the Wasm VM binary (`minitiad`). Run this in **WSL** (or Linux/macOS) if you're on Windows.

Then verify:

```text
Using the `initia-appchain-dev` skill, please verify that `initiad`, `weave`, and `minitiad` are properly installed and accessible in my PATH.
```

---

## Step 6: Initial Setup with `weave init`

**Save IDs as you go.** Copy [`.initia/local-ids.example.md`](../.initia/local-ids.example.md) to `.initia/local-ids.md` and fill it in during this step and the next. Per the [official get-started guide](https://docs.initia.xyz/hackathon/get-started): *"Save your Chain ID! You'll need this unique identifier for your final submission."*

Run this in a **terminal** (WSL on Windows):

```bash
weave init
```

Follow the interactive prompts (see [get-started docs](https://docs.initia.xyz/hackathon/get-started) for full prompts):

1. **Gas Station:** **Generate new account (recommended)**. **→ Save the Gas Station address** into `.initia/local-ids.md`.
2. **Fund:** Go to [Initia Testnet Faucet](https://app.testnet.initia.xyz/faucet), paste the address, submit. Back in the terminal, type `continue`.
3. **Action:** **Launch a new rollup**.
4. **L1 network:** **Testnet (initiation-2)**.
5. **VM:** **Wasm**.
6. **Rollup chain ID:** e.g. `yieldmind-1`. **→ Save this ID** — required for submission and for YieldMind `.env`.
7. **Gas denom / Moniker:** Tab for defaults.
8. **Submission interval / Finalization:** Tab for defaults.
9. **Data availability:** **Initia L1**. **Oracle price feed:** **Enable**.
10. **System keys:** **Generate new**. **Fee whitelist:** Enter to leave empty.
11. **Add Gas Station to genesis:** **Yes**. **Genesis balance:** `1000000000000000000000000` (or `10000000000000000000` for Move if you switch VM).
12. **Additional genesis accounts:** **No**.
13. Type `continue`, then confirm with `y`. Your appchain will launch.

**Resetting:** If you need to start over:

```bash
rm -rf ~/.weave ~/.initia ~/.minitia ~/.opinit
docker rm -f weave-relayer || true
```

Then run `weave init` again.

### IDs to save (checklist)

| What | Where to use it |
|------|------------------|
| **Gas Station address** | Faucet; keep private (in `local-ids.md` only, do not commit). |
| **Rollup chain ID** | YieldMind `.env` as `CHAIN_ID`; `.initia/submission.json` as `chain_id`; hackathon submission. |
| Rollup RPC | `.env` as `INITIA_RPC_URL` when using local rollup (e.g. `http://localhost:26657`). |

---

## Step 7: Setup Interwoven Bots

Your appchain must be running (weave init leaves it running in the background).

### 7.1 OPinit Executor

```bash
weave opinit init executor
```

- Use detected keys: **Yes**.
- System key for Oracle: **Generate new system key**.
- Pre-fill from config: **Yes, prefill**.
- Listen address: Tab for `localhost:3000`.
- L1 RPC / Chain ID / Gas denom: Enter. Rollup RPC: Tab for `http://localhost:26657`.

Then:

```bash
weave opinit start executor -d
```

### 7.2 IBC Relayer

Docker must be running.

```bash
weave relayer init
```

- Rollup type: **Local Rollup (&lt;your-chain-id&gt;)**.
- RPC / REST: Tab for `http://localhost:26657` and `http://localhost:1317`.
- Channel method: **Subscribe to only transfer and nft-transfer**.
- Select both channels (Space), Enter.
- Challenger key: **Yes (recommended)**.

Then:

```bash
weave relayer start -d
```

Logs: `weave relayer log`.

**After reboot:** Relayer may still run (Docker). Restart rollup and executor:

```bash
weave rollup start -d
weave opinit start executor -d
```

---

## Step 8: Final Key Setup

Import the Gas Station key into L1 and L2 keychains (for signing TXs and deploying contracts):

```bash
MNEMONIC=$(jq -r '.common.gas_station.mnemonic' ~/.weave/config.json)
initiad keys add gas-station --recover --keyring-backend test --coin-type 60 --key-type eth_secp256k1 --source <(echo -n "$MNEMONIC")
minitiad keys add gas-station --recover --keyring-backend test --coin-type 60 --key-type eth_secp256k1 --source <(echo -n "$MNEMONIC")
```

Verify:

```bash
initiad keys list --keyring-backend test
minitiad keys list --keyring-backend test
```

---

## Step 9: Configure YieldMind (.env)

Copy `.env.example` to `.env` in the YieldMind repo. When using your **local rollup**:

```env
INITIA_RPC_URL=http://localhost:26657
CHAIN_ID=yieldmind-1
```

Use your actual rollup chain ID from Step 6. For L1 testnet only (no local rollup):

```env
INITIA_RPC_URL=https://rpc.testnet.initia.xyz
CHAIN_ID=initiation-2
```

---

## Step 10: Verify Appchain

Ask your AI (with the skill):

```text
Using the `initia-appchain-dev` skill, please verify that my appchain, executor bot, and relayer are running and that my Gas Station account has a balance.
```

Or manually: ensure the rollup is producing blocks and the relayer/executor are running; check balance of your Gas Station address on the rollup.

---

## Step 11: Build Your App

You're ready to work on YieldMind. See the main [README](../README.md) for running the Flask app and the [Builder Guide](https://docs.initia.xyz/hackathon/builder-guide) for building the frontend and preparing your submission.

---

## Quick Reference

| What | Value |
|------|--------|
| L1 Testnet RPC | `https://rpc.testnet.initia.xyz` |
| L1 Testnet Chain ID | `initiation-2` |
| Faucet | https://app.testnet.initia.xyz/faucet |
| Local rollup RPC (default) | `http://localhost:26657` |
| Local rollup REST | `http://localhost:1317` |
| Hackathon docs | https://docs.initia.xyz/hackathon/get-started |
