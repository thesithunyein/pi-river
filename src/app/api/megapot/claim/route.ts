import { NextResponse } from "next/server";
import { mintMegapotTicket, readMegapotPool } from "@/lib/megapot/client";
import { createClient } from "@/lib/supabase/server";
import {
  mergeProgressAgainstExisting,
  payloadToRow,
  rowToPayload,
} from "@/lib/progressSync";
import { CLOUD_META_KEY, fromCompactCloud, toCompactCloud } from "@/lib/cloudProgress";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Auth not configured." }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in with Google to claim a ticket." }, { status: 401 });
    }

    const body = (await req.json()) as {
      recipient?: string;
      googleUserId?: string;
    };
    const recipient = body.recipient;
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return NextResponse.json({ error: "Play wallet recipient required." }, { status: 400 });
    }

    const tableRes = await supabase
      .from("player_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const fromMeta = fromCompactCloud(meta?.[CLOUD_META_KEY]);
    const fromTable =
      !tableRes.error && tableRes.data
        ? rowToPayload(tableRes.data as Record<string, unknown>)
        : null;
    const existing = fromTable
      ? fromMeta
        ? mergeProgressAgainstExisting(fromTable, fromMeta)
        : fromTable
      : fromMeta;

    const credits = Math.max(0, Math.floor(Number(existing?.megapotCredits) || 0));
    if (credits <= 0) {
      return NextResponse.json(
        { error: "No Megapot credits left. Win a hand to earn one." },
        { status: 402 }
      );
    }

    const minted = await mintMegapotTicket(recipient as `0x${string}`);

    // Debit credit + bump tickets only after a successful mint.
    if (existing) {
      const next = {
        ...existing,
        megapotCredits: Math.max(0, credits - 1),
        ticketsMinted: Math.max(0, Math.floor(Number(existing.ticketsMinted) || 0)) + 1,
      };
      const compact = toCompactCloud(next);
      await supabase.auth.updateUser({
        data: { ...(meta || {}), [CLOUD_META_KEY]: compact },
      });
      if (!tableRes.error || !/relation|does not exist|schema cache/i.test(tableRes.error?.message || "")) {
        const row = payloadToRow(user.id, next);
        let upsert = await supabase.from("player_progress").upsert(row, { onConflict: "user_id" });
        if (
          upsert.error &&
          /owned_frames|owned_stickers|equipped_frame|hands_played|column .* does not exist|schema cache/i.test(
            upsert.error.message
          )
        ) {
          const rowSafe = { ...(row as Record<string, unknown>) };
          delete rowSafe.owned_frames;
          delete rowSafe.owned_stickers;
          delete rowSafe.equipped_frame;
          delete rowSafe.hands_played;
          upsert = await supabase.from("player_progress").upsert(rowSafe, { onConflict: "user_id" });
        }
        void upsert;
      }
    }

    let pool = null;
    try {
      pool = await readMegapotPool();
    } catch {
      // ignore
    }

    return NextResponse.json({
      ok: true,
      ...minted,
      pool,
      megapotCredits: Math.max(0, credits - 1),
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Megapot claim failed.";
    const error =
      raw === "JACKPOT_USDC_REFILL" || /USDC|usdc/i.test(raw)
        ? "Jackpot desk is refilling — your ticket credits stay saved. Try claim again in a moment."
        : raw;
    return NextResponse.json(
      { error, code: raw === "JACKPOT_USDC_REFILL" ? "usdc_refill" : "claim_failed" },
      { status: 500 }
    );
  }
}
