# Wallet widget (InterwovenKit)

This folder contains the React widget used by YieldMind for hackathon wallet connection.

## What it builds

- Source: `src/main.jsx`
- Output bundle: `../js/wallet-bridge.js` (loaded by `templates/base.html`)

## Install + build

```bash
cd static/wallet-widget
npm install
npm run build
```

## Run while developing

```bash
cd static/wallet-widget
npm run dev
```

This keeps rebuilding `static/js/wallet-bridge.js` on changes.

## Notes

- The widget uses `@initia/interwovenkit-react` with `TESTNET`.
- Exposed browser API (`window.yieldmindWalletApi`):
  - `getAddress()`
  - `openWallet()`
  - `sendToken({ toAddress, amountUinit, memo })`
  - `openBridgeIn({ fromChain, asset, amount, destination })`
- It dispatches existing dashboard events:
  - `yieldmind:wallet-connected`
  - `yieldmind:wallet-disconnected`
- You still need a browser wallet extension/app supported by InterwovenKit for actual signing.

## Docs

- Initia Hackathon: https://docs.initia.xyz/hackathon
- InterwovenKit docs: https://docs.initia.xyz/interwovenkit
