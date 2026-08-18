import { fallback, http } from "viem";

/**
 * Public Base Sepolia RPCs, ordered by reliability.
 * sepolia.base.org rate-limits per IP and frequently fails from Vercel's
 * shared egress, so every client uses a fallback chain instead of one URL.
 */
const PUBLIC_RPCS = [
  "https://base-sepolia-rpc.publicnode.com",
  "https://sepolia.base.org",
  "https://base-sepolia.drpc.org",
];

/** Ordered RPC URL list: env override first, then public fallbacks. */
export function baseSepoliaRpcUrls(): string[] {
  const envRpc =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || process.env.BASE_SEPOLIA_RPC_URL;
  const urls = envRpc ? [envRpc, ...PUBLIC_RPCS] : PUBLIC_RPCS;
  return [...new Set(urls)];
}

/** viem transport that fails over to the next RPC when one is rate-limited or down. */
export function baseSepoliaTransport() {
  return fallback(
    baseSepoliaRpcUrls().map((url) => http(url, { retryCount: 1 })),
    { rank: false }
  );
}
