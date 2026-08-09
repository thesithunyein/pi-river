import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { botStartNextHand } from "@/lib/bot/inco";
import { botJoin, botRefillSeat, readTable } from "@/lib/bot/table";
import { botReclaimFunds, botHasBuyIn } from "@/lib/bot/reclaim";
import {
  ensureShuffleFees,
  parseFeeShortfall,
  shuffleFeeShortfall,
} from "@/lib/bot/fees";
import { getBotAccount, getBotPublicClient } from "@/lib/bot/wallet";

export const runtime = "nodejs";
export const maxDuration = 60;

const ZERO = "0x0000000000000000000000000000000000000000";

async function prepContractFees(excludeTableId: bigint) {
  try {
    await botReclaimFunds({ maxTables: 32, excludeTableIds: [excludeTableId] });
  } catch {
    // continue
  }

  try {
    await ensureShuffleFees(0n);
    return { ok: true as const, shortfallEth: null as string | null };
  } catch (err) {
    const parsed = parseFeeShortfall(err);
    const shortfall = await shuffleFeeShortfall(0n);
    return {
      ok: false as const,
      shortfallEth: parsed ?? (shortfall > 0n ? formatEther(shortfall) : null),
      error: err instanceof Error ? err.message : "Fee fund failed",
    };
  }
}

function friendlyDealError(msg: string) {
  if (/fund shuffle fee/i.test(msg)) return "Table needs a quick top-up before the next deal.";
  if (/\bseat\b/i.test(msg)) return "Opponent left the seat. Rejoining…";
  if (/\bbusy\b/i.test(msg)) return "Table is busy. Tap Deal next hand again.";
  if (/\bstacks\b/i.test(msg)) return "Stacks too low to deal. Start a new Quick Play.";
  if (msg.length > 120) return "Could not deal. Tap Deal next hand again.";
  return msg;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tableId?: string | number };
    const tableId = BigInt(String(body.tableId ?? "0"));
    if (tableId <= 0n) {
      return NextResponse.json({ error: "Invalid table id." }, { status: 400 });
    }

    const account = getBotAccount();
    const client = getBotPublicClient();
    if (account) {
      let bal = await client.getBalance({ address: account.address });
      if (!botHasBuyIn(bal)) {
        await botReclaimFunds({ maxTables: 32, excludeTableIds: [tableId] });
        bal = await client.getBalance({ address: account.address });
      }
    }

    let fees = await prepContractFees(tableId);
    if (!fees.ok) {
      try {
        await botReclaimFunds({ maxTables: 48, excludeTableIds: [tableId] });
      } catch {
        // ignore
      }
      fees = await prepContractFees(tableId);
    }

    if (!fees.ok) {
      return NextResponse.json(
        {
          error: "Table needs a quick top-up before the next deal.",
          code: "NEEDS_FEE_FUND",
          shortfallEth: fees.shortfallEth,
        },
        { status: 402 },
      );
    }

    try {
      await botRefillSeat(tableId);
    } catch {
      // continue
    }

    // If reclaim already emptied this seat somehow, rejoin before dealing
    const snapshot = await readTable(tableId);
    const bot = account?.address.toLowerCase();
    const botSeated =
      Boolean(bot) &&
      (snapshot.player0.toLowerCase() === bot || snapshot.player1.toLowerCase() === bot);

    if (!botSeated && snapshot.player1 === ZERO) {
      const join = await botJoin(tableId);
      // joinTable already starts a hand
      return NextResponse.json({
        ok: true,
        skipped: false,
        rejoined: true,
        alreadyJoined: join.alreadyJoined,
        hash: join.hash,
      });
    }

    if (!botSeated) {
      return NextResponse.json(
        { error: "River Bot is not seated. Start a new Quick Play." },
        { status: 409 },
      );
    }

    if (snapshot.handLive) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Hand already live." });
    }

    const result = await botStartNextHand(tableId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bot deal failed.";
    if (/fund shuffle fee/i.test(msg)) {
      const shortfall = await shuffleFeeShortfall(0n).catch(() => 0n);
      return NextResponse.json(
        {
          error: "Table needs a quick top-up before the next deal.",
          code: "NEEDS_FEE_FUND",
          shortfallEth: shortfall > 0n ? formatEther(shortfall) : undefined,
        },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: friendlyDealError(msg) }, { status: 500 });
  }
}
