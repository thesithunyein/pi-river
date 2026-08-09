import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncRiverChipsMintOnly, upsertClubScore, readOnchainChips } from "@/lib/economy/onchain";
import type { Address } from "viem";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAddress(raw: unknown): raw is Address {
  return typeof raw === "string" && /^0x[a-fA-F0-9]{40}$/.test(raw);
}

/** Mirror ledger chips → rCHIP + upsert on-chain club ladder. */
export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  let body: {
    playAddress?: string;
    chips?: number;
    displayName?: string;
    wins?: number;
    tickets?: number;
    totalEarnings?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAddress(body.playAddress)) {
    return NextResponse.json({ ok: false, error: "playAddress required" }, { status: 400 });
  }

  const chips = Math.max(0, Math.floor(Number(body.chips) || 0));
  const wins = Math.max(0, Math.floor(Number(body.wins) || 0));
  const tickets = Math.max(0, Math.floor(Number(body.tickets) || 0));
  const totalEarnings = Math.max(0, Math.floor(Number(body.totalEarnings) || 0));
  const displayName = (body.displayName || "Player").slice(0, 32);

  try {
    const chipRes = await syncRiverChipsMintOnly(body.playAddress, chips);
    if (!chipRes.ok) {
      return NextResponse.json({ ok: false, error: chipRes.error }, { status: 503 });
    }

    let club: { ok: boolean; score?: number; error?: string } = { ok: false };
    try {
      const clubRes = await upsertClubScore({
        playAddress: body.playAddress,
        name: displayName,
        wins,
        tickets,
        totalEarnings,
      });
      club = clubRes.ok
        ? { ok: true, score: clubRes.score }
        : { ok: false, error: "error" in clubRes ? clubRes.error : "club failed" };
    } catch (err) {
      club = { ok: false, error: err instanceof Error ? err.message : "club failed" };
    }

    const onchain = await readOnchainChips(body.playAddress);
    return NextResponse.json({
      ok: true,
      chips: {
        balance: onchain,
        minted: chipRes.minted,
        needsSelfBurn: chipRes.needsSelfBurn,
        hash: chipRes.hash,
      },
      club,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "sync failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const playAddress = new URL(req.url).searchParams.get("playAddress");
  if (!isAddress(playAddress)) {
    return NextResponse.json({ ok: false, error: "playAddress required" }, { status: 400 });
  }
  try {
    const balance = await readOnchainChips(playAddress);
    return NextResponse.json({ ok: true, balance, token: "rCHIP" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "read failed" },
      { status: 500 }
    );
  }
}
