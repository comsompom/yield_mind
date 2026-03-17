import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
    "process.env": {},
    process: { env: {} },
  },
  build: {
    lib: {
      entry: "src/main.jsx",
      name: "YieldMindWalletWidget",
      formats: ["iife"],
      fileName: () => "wallet-bridge.js",
    },
    outDir: "../js",
    emptyOutDir: false,
    sourcemap: false,
    target: "es2020",
  },
});

