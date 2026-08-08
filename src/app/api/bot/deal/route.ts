import { NextResponse } from "next/server";
import { botStartNextHand } from "@/lib/bot/inco";
import { botRefillSeat } from "@/lib/bot/table";
import { botReclaimFunds, botHasBuyIn } from "@/lib/bot/reclaim";
import { ensureShuffleFees } from "@/lib/bot/fees";
import { getBotAccount, getBotPublicClient } from "@/lib/bot/wallet";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tableId?: string | number };
    const tableId = BigInt(String(body.tableId ?? "0"));
    if (tableId <= 0n) {
      return NextResponse.json({ error: "Invalid table id." }, { status: 400 });
    }

    // Keep the house bot funded so it can rebuy and feel “unlimited” on testnet
    const account = getBotAccount();
    const client = getBotPublicClient();
    if (account) {
      let bal = await client.getBalance({ address: account.address });
      if (!botHasBuyIn(bal)) {
        await botReclaimFunds({ maxTables: 20 });
        bal = await client.getBalance({ address: account.address });
      }
    }

    try {
      await ensureShuffleFees(0n);
    } catch {
      // startNextHand will revert with a clear on-chain reason if still short
    }

    try {
      await botRefillSeat(tableId);
    } catch {
      // continue — deal may still work if stacks are fine
    }

    const result = await botStartNextHand(tableId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bot deal failed.";
    const friendly = /fund shuffle fee/i.test(msg)
      ? "Table needs a quick top-up before the next deal."
      : msg.length > 160
        ? "Could not deal. Try again."
        : msg;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
