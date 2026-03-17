# YieldMind — AI-Powered Yield Optimization on Initia

**Initia Hackathon (Season 1)** · Primary track: **AI & Tooling** · Secondary: **DeFi**

## Problem

Users hold assets on Initia (and bridged from other chains) but don’t know where to deploy for best risk-adjusted yield or how to rebalance without manual work.

## Solution

YieldMind is an AI assistant that:

1. **Analyzes** wallet and market data (APYs, risks, liquidity).
2. **Suggests** optimal actions in plain language (e.g. “Move 30% of USDC to Pool X for 12% APY”).
3. **Lets users execute** in one click via InterwovenKit (and optional session/auto-sign UX).
4. **Captures revenue** via a small fee on executed actions and optional premium features.

## Features (Initia-native)

- **InterwovenKit** — Wallet connection and all transactions (required).
- **Initia Usernames (.init)** — Identity and shareable profile (e.g. yieldmind.init).
- **Interwoven Bridge** — Onboard from other ecosystems and move assets into YieldMind’s recommendations without leaving the app.

## Tech Stack

- **UI:** Flask + Jinja2 (server-rendered); minimal JS only for wallet/tx (InterwovenKit).
- **Backend & API:** Same Flask app — API routes for balances, opportunities, AI recommend, execute-intent.
- **AI:** Python (OpenAI or compatible API) for recommendations and natural-language understanding.
- **Chain:** Initia appchain/rollup; fee module for revenue.

## Initia Hackathon Setup (do this first)

Follow these steps once to get your dev environment and chain ready. No API keys from Initia — you get a Gas Station account and use public RPC or your rollup’s RPC.

### 1. Use the hackathon flow

- **Install Weave CLI** and the Initia tooling (see [Initia Hackathon Guide](https://docs.initia.xyz/hackathon)).
- In a dedicated project folder (e.g. `my-initia-project`), run:
  ```bash
  weave init
  ```
- In the interactive flow:
  - **Gas Station:** choose **Generate new account (recommended)**. Copy your Gas Station address.
  - **Action:** **Launch a new rollup**.
  - **L1 network:** **Testnet (initiation-2)**.
  - **VM:** **Wasm** (recommended for AI & Tooling track).
  - **Rollup chain ID:** pick a unique ID (e.g. `yieldmind-1`). Save it — you need it for submission.
  - Accept defaults for gas denom, moniker, submission interval, finalization, DA (Initia L1), and enable oracle price feed.
  - **System keys:** Generate new. **Add Gas Station to genesis:** Yes. Genesis balance: e.g. `1000000000000000000000000` (or `10000000000000000000` for Move to avoid u64 limits).
- Finish the flow; your appchain launches. You now have a **Gas Station account** (address + mnemonic). That’s your dev account — no separate “registration” or API keys from Initia.

### 2. Fund your Gas Station account

- Go to **[Initia Testnet Faucet](https://app.testnet.initia.xyz/faucet)**.
- Paste your **Gas Station address**, submit, and receive testnet INIT. No signup or API key.

### 3. RPC / endpoints

- **Initia L1 Testnet:**  
  - RPC: `https://rpc.testnet.initia.xyz`  
  - Chain ID: `initiation-2`  
  No key required.

- **Your rollup (after launch):**  
  - Local: e.g. RPC `http://localhost:26657`, REST `http://localhost:1317`.  
  - Use your rollup’s chain ID (e.g. `yieldmind-1`) and RPC in `.env` when you want YieldMind to talk to your appchain.

Set these in `.env` (see below). For YieldMind you can start with L1 testnet; switch to your rollup RPC and chain ID when you deploy contracts or need rollup-specific endpoints.

---

## How to Run

### Prerequisites

- Python 3.10+
- Initia setup done (Weave, Gas Station funded, RPC/chain ID from step 3 above).

### Setup

```bash
cd yield_mind
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

### Environment

Copy `.env.example` to `.env` and set:

- **Initia L1 Testnet (default):**  
  `INITIA_RPC_URL=https://rpc.testnet.initia.xyz` and `CHAIN_ID=initiation-2`.
- **Your rollup:**  
  Use your rollup RPC URL and chain ID (e.g. `yieldmind-1`) when you run against your appchain.
- **AI:**  
  `OPENAI_API_KEY=sk-...` (from OpenAI, not Initia) for AI recommendations.

```env
SECRET_KEY=your-secret-key
INITIA_RPC_URL=https://rpc.testnet.initia.xyz
CHAIN_ID=initiation-2
OPENAI_API_KEY=sk-...   # optional, for AI recommendations
```

### Run the app

```bash
# Development (recommended)
python run.py

# Or: FLASK_APP=run:app flask run

# Production
gunicorn -w 4 "run:app"
```

- **Home:** http://127.0.0.1:5000/
- **Dashboard:** http://127.0.0.1:5000/dashboard
- **Health:** http://127.0.0.1:5000/health

### Wallet widget (InterwovenKit)

The repo includes a **demo** wallet bar (fake address in localStorage) so you can run the UI and API without the React stack. For submission, replace it with the real **InterwovenKit** integration: see `static/wallet-widget/README.md`. Build the minimal React widget and include the bundle in the Flask app for connect, .init name, and sign/send.

## Submission

- **Rollup / appchain:** Valid chain ID and a transaction link or deployment link (fill in README and `.initia/submission.json` after deployment).
- **InterwovenKit:** All wallet connect and transactions must go through `@initia/interwovenkit-react`.
- **Initia-native:** Interwoven Bridge + Initia Usernames (.init) + (optional) session/auto-sign.
- **Repo:** `.initia/submission.json`, this README, and a **demo video** (2–5 min: problem, connect → recommend → execute → bridge, revenue angle).

Fill in `.initia/submission.json` with: `repo_url`, `live_app_url`, `demo_video_url`, `chain_id`, and `team`.

## Revenue Model

- **Primary:** Fee (e.g. 0.1–0.5%) on swaps/deposits executed through YieldMind on your appchain.
- **Secondary:** Premium tier (more strategies, alerts, multi-wallet) or future referral from Initia/partners.

No gas tax leakage; value stays on your chain and you control the fee model.

## License

MIT.
