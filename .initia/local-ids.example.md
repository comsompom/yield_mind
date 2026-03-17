# Appchain IDs — Save these (do not commit filled copy)

**Reference:** [Initia Hackathon: Set Up Your Appchain](https://docs.initia.xyz/hackathon/get-started)

Copy this file to `local-ids.md` and fill in the values as you complete `weave init` and the setup. Add `local-ids.md` to `.gitignore` so you never commit secrets or IDs.

---

## 1. Gas Station (from weave init – Foundation & Funding)

After choosing **Generate new account (recommended)** in `weave init`, you see your Gas Station address.

- **Gas Station address:** `________________________________________________`
- **Faucet:** https://app.testnet.initia.xyz/faucet — paste the address and submit to receive testnet INIT.

---

## 2. Rollup identity (from weave init – Rollup Identity)

**Save your Chain ID.** You need this for submission and for YieldMind `.env`.

- **Rollup chain ID:** `________________` (e.g. `yieldmind-1`)
- **L1 network chosen:** Testnet (`initiation-2`)

---

## 3. Endpoints (after appchain is running)

- **Rollup RPC:** `http://localhost:26657`
- **Rollup REST:** `http://localhost:1317`
- **L1 Testnet RPC:** `https://rpc.testnet.initia.xyz`
- **L1 Testnet Chain ID:** `initiation-2`

---

## 4. For YieldMind .env

Use the **Rollup chain ID** and **Rollup RPC** when running YieldMind against your local appchain:

```env
CHAIN_ID=<your-rollup-chain-id>
INITIA_RPC_URL=http://localhost:26657
```

---

## 5. For submission (`.initia/submission.json`)

- **chain_id:** same as your **Rollup chain ID** above.
- You will also need: `repo_url`, `live_app_url`, `demo_video_url`, `team`.

---

*Do not commit `local-ids.md` if it contains your Gas Station address or other sensitive data.*
