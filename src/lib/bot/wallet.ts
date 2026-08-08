import { createWalletClient, createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

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
    transport: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
        process.env.BASE_SEPOLIA_RPC_URL ||
        "https://base-sepolia-rpc.publicnode.com"
    ),
  });
}

export function getBotWalletClient() {
  const account = getBotAccount();
  if (!account) return null;
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
        process.env.BASE_SEPOLIA_RPC_URL ||
        "https://base-sepolia-rpc.publicnode.com"
    ),
  });
}

export const BOT_BUY_IN = 15n * 10n ** 12n; // 0.000015 ETH
