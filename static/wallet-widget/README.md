# Wallet widget (InterwovenKit)

This folder is intended for the **minimal InterwovenKit** integration required by the Initia Hackathon.

## Requirement

- Use `@initia/interwovenkit-react` for wallet connection and all transaction handling.
- Implement: connect/disconnect, display connected address and chain, and at least one real transaction (sign/send via InterwovenKit).

## Options

1. **Option A:** Build a small React app (e.g. with Vite) that only mounts the InterwovenKit provider and a "Connect wallet" / address / .init name / sign-send component. Output a single bundle (e.g. `wallet.js`) and include it in `templates/base.html` instead of the current demo `wallet-bridge.js`.
2. **Option B:** Embed the React widget in an iframe and communicate with the main Flask app via `postMessage` for TX payloads.

## Current state

The main app uses a **demo** wallet bar in `static/js/wallet-bridge.js` (localStorage fake address) so you can run and demo the Flask UI and API without the React stack. Replace this with the real InterwovenKit widget before submission.

## Docs

- Initia Hackathon: https://docs.initia.xyz/hackathon
- InterwovenKit: https://www.npmjs.com/package/@initia/interwovenkit-react
