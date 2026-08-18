import { createWalletClient, createPublicClient, type Hex } from "viem";
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

export const BOT_BUY_IN = 15n * 10n ** 12n; // 0.000015 ETH
