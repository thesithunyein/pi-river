import { NextResponse } from "next/server";
import { formatEther, parseEther, type Address, type Hex } from "viem";
import { getBotAccount, getBotPublicClient, getBotWalletClient } from "@/lib/bot/wallet";
import { botReclaimFunds } from "@/lib/bot/reclaim";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Enough for one createTable + gas. Shuffle fee is topped up separately when possible. */
const DEFAULT_TARGET = parseEther("0.000028");
const MIN_PLAY = parseEther("0.000021");
const MIN_SEND = parseEther("0.00001");
const recent = new Map<string, number>();

function normalizeAddress(raw: unknown): Address | null {
  if (typeof raw !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return raw as Address;
}

/** Top up a Google play wallet so Quick Play needs no MetaMask / bridge. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      address?: string;
      googleUserId?: string;
      targetEth?: string;
    };
    const to = normalizeAddress(body.address);
    if (!to) {
      return NextResponse.json({ error: "Valid play wallet address required." }, { status: 400 });
    }

    let target = DEFAULT_TARGET;
    if (body.targetEth) {
      try {
        const parsed = parseEther(body.targetEth);
        if (parsed >= MIN_PLAY) target = parsed;
      } catch {
        // keep default
      }
    }

    const key = `${(body.googleUserId || "").slice(0, 64)}:${to.toLowerCase()}`;
    const last = recent.get(key) || 0;
    if (Date.now() - last < 12_000) {
      const client = getBotPublicClient();
      const bal = await client.getBalance({ address: to });
      return NextResponse.json({
        ok: true,
        funded: bal >= MIN_PLAY,
        balanceEth: formatEther(bal),
        drippedEth: "0",
        throttled: true,
      });
    }

    const house = getBotAccount();
    const wallet = getBotWalletClient();
    const publicClient = getBotPublicClient();
    if (!house || !wallet) {
      return NextResponse.json({ error: "House wallet not configured." }, { status: 503 });
    }

    // Free stuck bot chips first so house can drip
    try {
      await botReclaimFunds({ maxTables: 20 });
    } catch {
      // continue
    }

    let balance = await publicClient.getBalance({ address: to });
    if (balance >= MIN_PLAY) {
      recent.set(key, Date.now());
      return NextResponse.json({
        ok: true,
        funded: true,
        balanceEth: formatEther(balance),
        drippedEth: "0",
      });
    }

    const need = target > balance ? target - balance : MIN_PLAY - balance;
    let houseBal = await publicClient.getBalance({ address: house.address });
    const gasReserve = parseEther("0.000008"); // leave bot gas for join

    if (houseBal <= gasReserve + MIN_SEND) {
      try {
        await botReclaimFunds({ maxTables: 24 });
        houseBal = await publicClient.getBalance({ address: house.address });
      } catch {
        // ignore
      }
    }

    if (houseBal <= gasReserve + MIN_SEND) {
      return NextResponse.json(
        {
          error: "House faucet is refilling. Tap Play again in a moment.",
          balanceEth: formatEther(balance),
          funded: false,
          houseEth: formatEther(houseBal),
        },
        { status: 503 }
      );
    }

    const send = need < MIN_SEND ? MIN_SEND : need;
    const maxSend = houseBal - gasReserve;
    const value = send > maxSend ? maxSend : send;
    if (value < MIN_SEND) {
      return NextResponse.json(
        {
          error: "House faucet is refilling. Tap Play again in a moment.",
          funded: false,
          houseEth: formatEther(houseBal),
        },
        { status: 503 }
      );
    }

    const hash = (await wallet.sendTransaction({
      to,
      value,
      account: house,
      chain: wallet.chain,
    })) as Hex;
    await publicClient.waitForTransactionReceipt({ hash });
    recent.set(key, Date.now());
    balance = await publicClient.getBalance({ address: to });

    return NextResponse.json({
      ok: true,
      funded: balance >= MIN_PLAY,
      balanceEth: formatEther(balance),
      drippedEth: formatEther(value),
      txHash: hash,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Drip failed." },
      { status: 500 }
    );
  }
}
