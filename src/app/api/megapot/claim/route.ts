import { NextResponse } from "next/server";
import { mintMegapotTicket, readMegapotPool } from "@/lib/megapot/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const claims = new Map<string, { count: number; day: string }>();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const pool = await readMegapotPool();
    return NextResponse.json({ ok: true, ...pool });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Could not read Megapot.",
        prizePoolUsdc: null,
      },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      recipient?: string;
      googleUserId?: string;
    };
    const recipient = body.recipient;
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return NextResponse.json({ error: "Play wallet recipient required." }, { status: 400 });
    }

    const day = todayKey();
    const key = `${(body.googleUserId || recipient).toLowerCase()}`;
    const row = claims.get(key);
    if (row && row.day === day && row.count >= 3) {
      return NextResponse.json(
        { error: "Daily Megapot claim limit reached (3). Come back tomorrow." },
        { status: 429 }
      );
    }

    const minted = await mintMegapotTicket(recipient as `0x${string}`);
    claims.set(key, {
      day,
      count: row && row.day === day ? row.count + 1 : 1,
    });

    let pool = null;
    try {
      pool = await readMegapotPool();
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, ...minted, pool });
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Megapot claim failed.";
    const error =
      raw === "JACKPOT_USDC_REFILL" || /USDC|usdc/i.test(raw)
        ? "Jackpot desk is refilling — your ticket credits stay saved. Try claim again in a moment."
        : raw;
    return NextResponse.json({ error, code: raw === "JACKPOT_USDC_REFILL" ? "usdc_refill" : "claim_failed" }, { status: 500 });
  }
}
