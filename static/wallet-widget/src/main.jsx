import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  InterwovenKitProvider,
  TESTNET,
  injectStyles,
  initiaPrivyWalletConnector,
  useInterwovenKit,
} from "@initia/interwovenkit-react";
import InterwovenKitStyles from "@initia/interwovenkit-react/styles.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  connectors: [initiaPrivyWalletConnector],
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

function WalletBar() {
  const kit = useInterwovenKit();
  const [fallbackAddress, setFallbackAddress] = useState("");
  const [fallbackUsername, setFallbackUsername] = useState("");
  const [connectError, setConnectError] = useState("");
  const address = useMemo(() => kit?.address || fallbackAddress || "", [kit?.address, fallbackAddress]);
  const username = useMemo(() => kit?.username || fallbackUsername || "", [kit?.username, fallbackUsername]);

  useEffect(() => {
    injectStyles(InterwovenKitStyles);
  }, []);

  useEffect(() => {
    if (address) {
      window.__yieldmindWalletAddress = address;
      window.dispatchEvent(
        new CustomEvent("yieldmind:wallet-connected", {
          detail: { address, initName: username || "" },
        }),
      );
    } else {
      window.__yieldmindWalletAddress = "";
      window.dispatchEvent(new CustomEvent("yieldmind:wallet-disconnected"));
    }
  }, [address, username]);

  const onConnect = async () => {
    setConnectError("");
    if (kit?.openConnect) {
      try {
        await kit.openConnect();
      } catch (err) {
        console.warn("InterwovenKit openConnect failed:", err);
      }
      // Some environments fail to complete Interwoven modal connect.
      // Fallback to direct Keplr connection so dashboard remains usable.
      if (!kit?.address && !fallbackAddress) {
        try {
          await connectKeplrFallback();
        } catch (err) {
          const msg = (err && err.message) ? err.message : "Keplr connect failed";
          setConnectError(msg);
          window.dispatchEvent(new CustomEvent("yieldmind:wallet-error", { detail: { message: msg } }));
        }
      }
      return;
    }
    try {
      await connectKeplrFallback();
    } catch (err) {
      const msg = (err && err.message) ? err.message : "Keplr connect failed";
      setConnectError(msg);
      window.dispatchEvent(new CustomEvent("yieldmind:wallet-error", { detail: { message: msg } }));
    }
  };

  const onDisconnect = async () => {
    if (kit?.disconnect) {
      await kit.disconnect();
      setFallbackAddress("");
      setFallbackUsername("");
      setConnectError("");
      return;
    }
    setFallbackAddress("");
    setFallbackUsername("");
    setConnectError("");
    window.__yieldmindWalletAddress = "";
    window.dispatchEvent(new CustomEvent("yieldmind:wallet-disconnected"));
  };

  const connectKeplrFallback = async () => {
    const chainId = "initiation-2";
    const keplr = window.keplr;
    if (!keplr || typeof keplr.enable !== "function") {
      throw new Error("Keplr extension not detected");
    }
    if (typeof keplr.experimentalSuggestChain === "function") {
      try {
        await keplr.experimentalSuggestChain({
          chainId: "initiation-2",
          chainName: "Initia Testnet",
          rpc: "https://rpc.testnet.initia.xyz",
          rest: "https://rest.testnet.initia.xyz",
          bip44: { coinType: 118 },
          bech32Config: {
            bech32PrefixAccAddr: "init",
            bech32PrefixAccPub: "initpub",
            bech32PrefixValAddr: "initvaloper",
            bech32PrefixValPub: "initvaloperpub",
            bech32PrefixConsAddr: "initvalcons",
            bech32PrefixConsPub: "initvalconspub",
          },
          stakeCurrency: {
            coinDenom: "INIT",
            coinMinimalDenom: "uinit",
            coinDecimals: 6,
          },
          currencies: [
            {
              coinDenom: "INIT",
              coinMinimalDenom: "uinit",
              coinDecimals: 6,
            },
          ],
          feeCurrencies: [
            {
              coinDenom: "INIT",
              coinMinimalDenom: "uinit",
              coinDecimals: 6,
            },
          ],
          features: ["stargate", "ibc-transfer"],
        });
      } catch (err) {
        console.warn("Keplr suggestChain failed/ignored:", err);
      }
    }
    await keplr.enable(chainId);
    const key = await keplr.getKey(chainId);
    const bech32 = key?.bech32Address || "";
    if (!bech32) throw new Error("No address returned from Keplr");
    setFallbackAddress(bech32);
    setFallbackUsername(key?.name || "keplr");
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
        {connectError ? <span className="wallet-hint">{connectError}</span> : null}
      </div>
    );
  }

  return (
    <div id="wallet-connected">
      <span id="wallet-address" className="wallet-address" data-full-address={address}>{shortAddr}</span>
      <span id="wallet-init-name" className="wallet-init">{username ? `${username}.init` : ""}</span>
      <button type="button" id="btn-disconnect" className="btn btn-outline" onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <InterwovenKitProvider {...TESTNET}>
          <WalletBar />
        </InterwovenKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

const mountEl = document.getElementById("wallet-bar");
if (mountEl) {
  createRoot(mountEl).render(<App />);
}

