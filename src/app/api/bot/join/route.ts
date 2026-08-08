import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { botJoin, readTable } from "@/lib/bot/table";
import { botReclaimFunds, botHasBuyIn } from "@/lib/bot/reclaim";
import { ensureShuffleFees, parseFeeShortfall } from "@/lib/bot/fees";
import { getBotAccount, getBotPublicClient } from "@/lib/bot/wallet";

export const runtime = "nodejs";
export const maxDuration = 60;

function extractRaw(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const any = err as Error & {
      shortMessage?: string;
      details?: string;
      cause?: { shortMessage?: string; reason?: string; message?: string };
    };
    return (
      any.shortMessage ||
      any.cause?.shortMessage ||
      any.cause?.reason ||
      any.cause?.message ||
      any.details ||
      any.message ||
      ""
    );
  }
  return String(err);
}

function friendlyError(err: unknown) {
  const msg = extractRaw(err);
  if (/TABLE_FEE_SHORTFALL|fund shuffle fee/i.test(msg)) {
    return "Table needs a quick top-up before cards deal. Tap Retry seat.";
  }
  if (/insufficient funds|exceeds the balance/i.test(msg)) {
    return "Opponent is not ready yet. Tap Retry seat again shortly.";
  }
  if (/already has two players/i.test(msg)) {
    return "This table is already full.";
  }
  if (/does not exist|unavailable/i.test(msg)) {
    return "That table was not found.";
  }
  if (/user rejected|denied/i.test(msg)) {
    return "Cancelled. Tap Retry seat when ready.";
  }
  // Prefer short revert reason over huge viem dumps
  const revert = msg.match(/reason:\s*([^\n]+)/i)?.[1]?.trim();
  if (revert && revert.length < 120) return revert;
  if (msg.length > 0 && msg.length <= 160) return msg;
  return "Could not seat opponent. Try again.";
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
        await botReclaimFunds({ maxTables: 20 });
        bal = await client.getBalance({ address: account.address });
      }
      if (!botHasBuyIn(bal)) {
        return NextResponse.json(
          {
            error: "Opponent is not ready yet. Tap Retry seat again shortly.",
            code: "BOT_UNDERFUNDED",
          },
          { status: 503 }
        );
      }
    }

    const table = await readTable(tableId);
    const buyIn = table.buyIn;

    // joinTable immediately starts a hand — contract must cover Inco shuffle fee
    try {
      await ensureShuffleFees(buyIn);
    } catch (feeErr) {
      const shortfall = parseFeeShortfall(feeErr);
      if (shortfall) {
        return NextResponse.json(
          {
            error: "Table needs a quick top-up before cards deal. Tap Retry seat.",
            code: "NEEDS_FEE_FUND",
            shortfallEth: shortfall,
          },
          { status: 503 }
        );
      }
      // Non-shortfall fee errors: still attempt join (may already be funded)
    }

    try {
      const result = await botJoin(tableId);
      return NextResponse.json({
        ok: true,
        alreadyJoined: result.alreadyJoined,
        bot: result.address,
        hash: result.hash,
      });
    } catch (joinErr) {
      const raw = extractRaw(joinErr);
      // One recovery pass: reclaim + fund fees + retry
      if (/fund shuffle fee|insufficient funds|exceeds the balance/i.test(raw)) {
        try {
          await botReclaimFunds({ maxTables: 20 });
          await ensureShuffleFees(buyIn);
          const result = await botJoin(tableId);
          return NextResponse.json({
            ok: true,
            alreadyJoined: result.alreadyJoined,
            bot: result.address,
            hash: result.hash,
            retried: true,
          });
        } catch (retryErr) {
          const shortfall = parseFeeShortfall(retryErr);
          if (shortfall) {
            return NextResponse.json(
              {
                error: "Table needs a quick top-up before cards deal. Tap Retry seat.",
                code: "NEEDS_FEE_FUND",
                shortfallEth: shortfall,
                houseEth: account
                  ? formatEther(await client.getBalance({ address: account.address }))
                  : undefined,
              },
              { status: 503 }
            );
          }
          return NextResponse.json({ error: friendlyError(retryErr) }, { status: 500 });
        }
      }
      throw joinErr;
    }
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 });
  }
}
