import { NextResponse } from "next/server";
import { formatEther, parseEther, type Address, type Hex } from "viem";
import { getBotAccount, getBotPublicClient, getBotWalletClient } from "@/lib/bot/wallet";
import { botReclaimFunds } from "@/lib/bot/reclaim";

export const runtime = "nodejs";
export const maxDuration = 60;

const TARGET = parseEther("0.00012"); // buy-in + shuffle fee top-up + gas
const MIN_SEND = parseEther("0.00002");
const recent = new Map<string, number>();

function normalizeAddress(raw: unknown): Address | null {
  if (typeof raw !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return raw as Address;
}

/** Top up a Google play wallet so Quick Play needs no MetaMask / bridge. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { address?: string; googleUserId?: string };
    const to = normalizeAddress(body.address);
    if (!to) {
      return NextResponse.json({ error: "Valid play wallet address required." }, { status: 400 });
    }

    const key = `${(body.googleUserId || "").slice(0, 64)}:${to.toLowerCase()}`;
    const last = recent.get(key) || 0;
    if (Date.now() - last < 20_000) {
      const client = getBotPublicClient();
      const bal = await client.getBalance({ address: to });
      return NextResponse.json({
        ok: true,
        funded: bal >= TARGET,
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
      await botReclaimFunds({ maxTables: 12 });
    } catch {
      // continue
    }

    let balance = await publicClient.getBalance({ address: to });
    if (balance >= TARGET) {
      recent.set(key, Date.now());
      return NextResponse.json({
        ok: true,
        funded: true,
        balanceEth: formatEther(balance),
        drippedEth: "0",
      });
    }

    const need = TARGET - balance;
    const houseBal = await publicClient.getBalance({ address: house.address });
    const gasReserve = parseEther("0.00005"); // keep bot buy-in + fee top-up + gas
    if (houseBal <= gasReserve + MIN_SEND) {
      return NextResponse.json(
        {
          error: "Could not set up your seat. Try again in a moment.",
          balanceEth: formatEther(balance),
          funded: false,
        },
        { status: 503 }
      );
    }

    const send = need < MIN_SEND ? MIN_SEND : need;
    const maxSend = houseBal - gasReserve;
    const value = send > maxSend ? maxSend : send;
    if (value < MIN_SEND) {
      return NextResponse.json(
        { error: "House cannot drip enough ETH right now.", funded: false },
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
      funded: balance >= TARGET,
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
