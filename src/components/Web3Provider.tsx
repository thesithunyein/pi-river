"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, createStorage, cookieStorage } from "wagmi";
import { injected } from "@wagmi/core";
import { baseSepolia } from "wagmi/chains";
import { useState, type ReactNode } from "react";
import { baseSepoliaTransport } from "@/lib/rpc";

const storage =
  typeof window !== "undefined"
    ? createStorage({ storage: window.localStorage, key: "pi-river-wagmi" })
    : createStorage({ storage: cookieStorage, key: "pi-river-wagmi" });

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    // Prefer MetaMask when multiple injected wallets exist (Coinbase, Rabby, etc.).
    injected({
      shimDisconnect: true,
      unstable_shimAsyncInject: 2_000,
      target: "metaMask",
    }),
    injected({
      shimDisconnect: true,
      unstable_shimAsyncInject: 2_000,
    }),
  ],
  transports: {
    [baseSepolia.id]: baseSepoliaTransport(),
  },
  storage,
  ssr: true,
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
