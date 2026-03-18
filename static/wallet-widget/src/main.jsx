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

  useEffect(() => {
    window.yieldmindWalletApi = {
      getAddress: () => address || "",
      openWallet: () => {
        if (kit?.openWallet) kit.openWallet();
      },
      sendToken: async ({ toAddress, amountUinit, memo }) => {
        if (!address) {
          throw new Error("Wallet is not connected");
        }
        if (!kit?.requestTxBlock) {
          throw new Error("Wallet transaction API is not ready");
        }
        const messages = [
          {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: {
              fromAddress: address,
              toAddress,
              amount: [{ amount: String(amountUinit), denom: "uinit" }],
            },
          },
        ];
        const result = await kit.requestTxBlock({
          messages,
          memo: memo || "YieldMind send",
        });
        const txHash = result?.transactionHash || result?.txHash || "";
        if (!txHash) {
          throw new Error("Transaction sent but hash was not returned");
        }
        return { txHash, raw: result };
      },
      openBridgeIn: async ({ fromChain, asset, amount, destination }) => {
        if (!address) {
          throw new Error("Wallet is not connected");
        }
        if (!kit?.openDeposit && !kit?.openBridge) {
          throw new Error("Wallet bridge API is not ready");
        }

        const normalizedAsset = String(asset || "").toUpperCase();
        const denomMap = {
          INIT: "uinit",
          USDC: "uusdc",
        };
        const srcChainMap = {
          ethereum: "1",
          arbitrum: "42161",
          base: "8453",
          optimism: "10",
          polygon: "137",
          cosmoshub: "cosmoshub-4",
        };

        const quantity = String(amount || "").trim();
        const recipient = String(destination || address).trim();
        const denom = denomMap[normalizedAsset] || "uinit";
        const srcChainId = srcChainMap[String(fromChain || "").toLowerCase()] || "";

        // Prefer deposit flow for "bridge in" UX.
        if (kit?.openDeposit) {
          const params = {
            denoms: [denom],
            recipientAddress: recipient || address,
          };
          if (srcChainId) {
            params.srcOptions = [{ denom, chainId: srcChainId }];
          }
          kit.openDeposit(params);
          return { mode: "deposit", recipient: recipient || address, quantity };
        }

        // Fallback: open generic bridge modal with suggested defaults.
        kit.openBridge?.({
          srcChainId,
          srcDenom: denom,
          dstChainId: "initiation-2",
          dstDenom: denom,
          quantity,
          sender: address,
          recipient: recipient || address,
          slippagePercent: "0.5",
        });
        return { mode: "bridge", recipient: recipient || address, quantity };
      },
    };
    return () => {
      window.yieldmindWalletApi = null;
    };
  }, [address, kit]);

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

