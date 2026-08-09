import { type Address, type Hex } from "viem";
import { getBotAccount, getBotPublicClient, getBotWalletClient } from "@/lib/bot/wallet";
import {
  RIVER_CHIPS_ADDRESS,
  RIVER_CLUB_ADDRESS,
  riverChipsAbi,
  riverClubAbi,
} from "@/lib/contracts/riverEconomy";
import { ladderScore } from "@/lib/progressSync";

const MAX_MINT_PER_SYNC = 50_000n;

/**
 * House only mints when ledger > on-chain.
 * Decreases must be burned by the play wallet via burnSelf (not house burn).
 */
export async function syncRiverChipsMintOnly(playAddress: Address, ledgerChips: number) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const publicClient = getBotPublicClient();
  if (!account || !wallet) {
    return { ok: false as const, error: "House wallet not configured" };
  }

  const target = BigInt(Math.max(0, Math.floor(ledgerChips)));
  const bal = await publicClient.readContract({
    address: RIVER_CHIPS_ADDRESS,
    abi: riverChipsAbi,
    functionName: "balanceOf",
    args: [playAddress],
  });

  if (target === bal) {
    return {
      ok: true as const,
      balance: Number(bal),
      minted: 0,
      needsSelfBurn: 0,
      hash: null as Hex | null,
    };
  }

  if (target > bal) {
    let delta = target - bal;
    if (delta > MAX_MINT_PER_SYNC) delta = MAX_MINT_PER_SYNC;
    const hash = await wallet.writeContract({
      address: RIVER_CHIPS_ADDRESS,
      abi: riverChipsAbi,
      functionName: "mint",
      args: [playAddress, delta],
      account,
      chain: wallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return {
      ok: true as const,
      balance: Number(bal + delta),
      minted: Number(delta),
      needsSelfBurn: 0,
      hash,
    };
  }

  // Ledger down (shop spend) — client must burnSelf
  return {
    ok: true as const,
    balance: Number(bal),
    minted: 0,
    needsSelfBurn: Number(bal - target),
    hash: null as Hex | null,
  };
}

export async function upsertClubScore(opts: {
  playAddress: Address;
  name: string;
  wins: number;
  tickets: number;
  totalEarnings: number;
}) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const publicClient = getBotPublicClient();
  if (!account || !wallet) {
    return { ok: false as const, error: "House wallet not configured" };
  }

  const score = ladderScore(opts.wins, opts.tickets, opts.totalEarnings);
  const name = (opts.name || "Player").slice(0, 32);
  const hash = await wallet.writeContract({
    address: RIVER_CLUB_ADDRESS,
    abi: riverClubAbi,
    functionName: "upsert",
    args: [
      opts.playAddress,
      name,
      opts.wins >>> 0,
      opts.tickets >>> 0,
      BigInt(Math.max(0, score)),
    ],
    account,
    chain: wallet.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return { ok: true as const, score, hash };
}

export async function readClubLadder(limit = 12) {
  const publicClient = getBotPublicClient();
  const len = await publicClient.readContract({
    address: RIVER_CLUB_ADDRESS,
    abi: riverClubAbi,
    functionName: "length",
  });
  const n = Number(len);
  if (!n) return [];

  const start = Math.max(0, n - 40);
  const rows = await Promise.all(
    Array.from({ length: n - start }, (_, i) =>
      publicClient.readContract({
        address: RIVER_CLUB_ADDRESS,
        abi: riverClubAbi,
        functionName: "getEntry",
        args: [BigInt(start + i)],
      })
    )
  );

  return rows
    .map((e) => ({
      id: e.wallet.toLowerCase(),
      name: e.name || "Player",
      wins: Number(e.wins),
      tickets: Number(e.tickets),
      score: Number(e.score),
      wallet: e.wallet,
    }))
    .sort((a, b) => b.score - a.score || b.wins - a.wins)
    .slice(0, limit);
}

export async function readOnchainChips(playAddress: Address) {
  const publicClient = getBotPublicClient();
  const bal = await publicClient.readContract({
    address: RIVER_CHIPS_ADDRESS,
    abi: riverChipsAbi,
    functionName: "balanceOf",
    args: [playAddress],
  });
  return Number(bal);
}
