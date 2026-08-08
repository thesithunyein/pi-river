"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, WagmiProvider, createConfig, createStorage, cookieStorage } from "wagmi";
import { injected } from "@wagmi/core";
import { baseSepolia } from "wagmi/chains";
import { useState, type ReactNode } from "react";

const storage =
  typeof window !== "undefined"
    ? createStorage({ storage: window.localStorage, key: "pi-river-wagmi" })
    : createStorage({ storage: cookieStorage, key: "pi-river-wagmi" });

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected({
      shimDisconnect: true,
      unstable_shimAsyncInject: 2_000,
    }),
  ],
  transports: {
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org"
    ),
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
