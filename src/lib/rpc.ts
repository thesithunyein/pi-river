import { fallback, http } from "viem";

/**
 * Public Base Sepolia RPCs, ordered by reliability.
 * sepolia.base.org rate-limits per IP and frequently fails from Vercel's
 * shared egress, so reads use a fallback chain instead of one URL.
 *
 * drpc.org is intentionally NOT listed: it is read-only and fails on
 * eth_sendRawTransaction, which broke bot showdown submissions.
 */
const PUBLIC_RPCS = [
  "https://base-sepolia-rpc.publicnode.com",
  "https://sepolia.base.org",
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

/**
 * Single, proven endpoint for WRITES (eth_sendRawTransaction).
 *
 * Writes must NOT use the fallback: re-sending the same signed tx across RPCs
 * causes nonce races ("replacement transaction underpriced") and drpc.org is
 * read-only, so wallet clients pin to one reliable node.
 */
export function baseSepoliaWriteTransport() {
  return http("https://base-sepolia-rpc.publicnode.com");
}

/**
 * Inco Lightning host-chain RPCs. publicnode goes FIRST regardless of env,
 * because sepolia.base.org rate-limits per-IP and returns 503 for eth_call
 * from Vercel's egress, which breaks decrypt/reveal for the bot AND the client.
 */
export function lightningRpcUrls(): string[] {
  return [
    "https://base-sepolia-rpc.publicnode.com",
    "https://sepolia.base.org",
  ];
}
