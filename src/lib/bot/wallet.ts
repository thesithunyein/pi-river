import {
  createWalletClient,
  createPublicClient,
  type Hex,
  type WriteContractParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { baseSepoliaTransport, baseSepoliaWriteTransport } from "@/lib/rpc";

function normalizePk(raw?: string): Hex | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as Hex;
}

export function getBotPrivateKey(): Hex | null {
  return normalizePk(process.env.BOT_PRIVATE_KEY || process.env.PRIVATE_KEY);
}

export function getBotAccount() {
  const pk = getBotPrivateKey();
  if (!pk) return null;
  return privateKeyToAccount(pk);
}

export function getBotPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: baseSepoliaTransport(),
  });
}

export function getBotWalletClient() {
  const account = getBotAccount();
  if (!account) return null;
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: baseSepoliaWriteTransport(),
  });
}

/**
 * Nonce errors mean our tx was rejected before broadcast (a concurrent bot
 * write for another table used the same nonce). Safe to retry: the contract
 * calls are idempotent or turn-guarded, so a fresh nonce cannot double-act.
 */
function isNonceRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /nonce\s+(too low|too high)|lower than the current nonce|replacement transaction underpriced|underpriced/i.test(
    msg
  );
}

/**
 * Bot/house writes with a short nonce-retry. Serverless functions for
 * different tables write to the same house address concurrently, so a send
 * occasionally loses the nonce race; re-fetching and re-sending fixes it.
 */
export async function botWriteContract(
  params: WriteContractParameters
): Promise<Hex> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    const wallet = getBotWalletClient();
    if (!wallet) throw new Error("Bot wallet is not configured on the server.");
    try {
      return await wallet.writeContract(params);
    } catch (err) {
      lastErr = err;
      if (isNonceRetryable(err) && attempt < 5) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export const BOT_BUY_IN = 15n * 10n ** 12n; // 0.000015 ETH
