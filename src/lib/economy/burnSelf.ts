"use client";

import { RIVER_CHIPS_ADDRESS, riverChipsAbi } from "@/lib/contracts/riverEconomy";
import {
  getPlayAddress,
  getPlayPublicClient,
  playWriteContract,
} from "@/lib/wallet/playWallet";

/** Player burns their own rCHIP after shop spend / ledger drop. */
export async function burnSelfRiverChips(googleUserId: string, amount: number) {
  const n = Math.floor(amount);
  if (n <= 0) return { ok: true as const, burned: 0, balance: undefined as number | undefined, hash: null as `0x${string}` | null };

  const publicClient = getPlayPublicClient();
  const hash = await playWriteContract(googleUserId, {
    address: RIVER_CHIPS_ADDRESS,
    abi: riverChipsAbi,
    functionName: "burnSelf",
    args: [BigInt(n)],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  const bal = await publicClient.readContract({
    address: RIVER_CHIPS_ADDRESS,
    abi: riverChipsAbi,
    functionName: "balanceOf",
    args: [getPlayAddress(googleUserId)],
  });
  return { ok: true as const, burned: n, balance: Number(bal), hash };
}
