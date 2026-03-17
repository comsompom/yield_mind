import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  InterwovenKitProvider,
  TESTNET,
  injectStyles,
  useInterwovenKit,
} from "@initia/interwovenkit-react";
import InterwovenKitStyles from "@initia/interwovenkit-react/styles.js";

function WalletBar() {
  const kit = useInterwovenKit();
  const address = kit?.address || "";
  const username = kit?.username || "";

  useEffect(() => {
    injectStyles(InterwovenKitStyles);
  }, []);

  useEffect(() => {
    if (address) {
      window.dispatchEvent(
        new CustomEvent("yieldmind:wallet-connected", {
          detail: { address, initName: username || "" },
        }),
      );
    } else {
      window.dispatchEvent(new CustomEvent("yieldmind:wallet-disconnected"));
    }
  }, [address, username]);

  const onConnect = async () => {
    if (kit?.openConnect) {
      await kit.openConnect();
    }
  };

  const onDisconnect = async () => {
    if (kit?.disconnect) {
      await kit.disconnect();
      return;
    }
    // Fallback: clear UI session when explicit disconnect API is unavailable.
    window.location.reload();
  };

  const shortAddr =
    address && address.length > 18
      ? `${address.slice(0, 10)}...${address.slice(-8)}`
      : address;

  if (!address) {
    return (
      <div id="wallet-placeholder">
        <span className="wallet-hint">Connect wallet to use YieldMind</span>
        <button type="button" id="btn-connect" className="btn btn-primary" onClick={onConnect}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div id="wallet-connected">
      <span id="wallet-address" className="wallet-address">{shortAddr}</span>
      <span id="wallet-init-name" className="wallet-init">{username ? `${username}.init` : ""}</span>
      <button type="button" id="btn-disconnect" className="btn btn-outline" onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  );
}

function App() {
  return (
    <InterwovenKitProvider {...TESTNET}>
      <WalletBar />
    </InterwovenKitProvider>
  );
}

const mountEl = document.getElementById("wallet-bar");
if (mountEl) {
  createRoot(mountEl).render(<App />);
}

