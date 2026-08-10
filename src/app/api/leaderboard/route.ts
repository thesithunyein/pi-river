import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ladderScore, normalizeCareerStats } from "@/lib/progressSync";
import type { LadderEntry } from "@/lib/clubLadder";
import { readClubLadder } from "@/lib/economy/onchain";

/** Prefer Supabase Google progress (multi-player), fall back to on-chain RiverClub. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  // 1) SQL = Google accounts that synced progress (friends show up here)
  if (supabase) {
    const { data, error } = await supabase
      .from("player_progress")
      .select(
        "user_id, display_name, avatar_url, wins, tickets_minted, total_earnings, score, profile, stats, match_history"
      )
      .order("score", { ascending: false })
      .order("wins", { ascending: false })
      .limit(12);

    if (!error && data?.length) {
      const entries: LadderEntry[] = (data as Array<Record<string, unknown>>).map((row) => {
        const statsRaw =
          row.stats && typeof row.stats === "object"
            ? (row.stats as Record<string, unknown>)
            : {};
        const career = normalizeCareerStats(
          {
            handsPlayed: Number(statsRaw.handsPlayed) || 0,
            gamesWon: Number(statsRaw.gamesWon) || 0,
            biggestWin: Number(statsRaw.biggestWin) || 0,
            currentStreak: Number(statsRaw.currentStreak) || 0,
            totalEarnings: Number(statsRaw.totalEarnings) || 0,
          },
          {
            winsColumn: Number(row.wins) || 0,
            earningsColumn: Number(row.total_earnings) || 0,
            history: Array.isArray(row.match_history) ? row.match_history : [],
          }
        );
        const wins = career.gamesWon;
        const tickets = Number(row.tickets_minted) || 0;
        const earnings = career.totalEarnings;
        const profile = (row.profile && typeof row.profile === "object" ? row.profile : {}) as {
          avatarId?: string;
          avatarUrl?: string;
          usePresetAvatar?: boolean;
          equippedFrame?: string;
        };
        const fromProfile =
          typeof profile.avatarUrl === "string" && profile.avatarUrl.startsWith("http")
            ? profile.avatarUrl
            : undefined;
        const fromCol = typeof row.avatar_url === "string" ? row.avatar_url : undefined;
        return {
          id: String(row.user_id),
          name: (typeof row.display_name === "string" && row.display_name) || "Player",
          wins,
          tickets,
          score: Number(row.score) || ladderScore(wins, tickets, earnings),
          avatarUrl: profile.usePresetAvatar ? undefined : fromProfile || fromCol,
          avatarId: profile.avatarId,
          usePresetAvatar: Boolean(profile.usePresetAvatar),
          equippedFrame: typeof profile.equippedFrame === "string" ? profile.equippedFrame : "none",
          isYou: Boolean(user?.id && row.user_id === user.id),
          isHouse: false,
        };
      });
      return NextResponse.json({ ok: true, entries, source: "table", me: user?.id ?? null });
    }
  }

  // 2) On-chain RiverClub (works without SQL; play-wallet based)
  try {
    const chainRows = await readClubLadder(12);
    if (chainRows.length > 0) {
      const entries: LadderEntry[] = chainRows.map((row) => ({
        id: row.id,
        name: row.name,
        wins: row.wins,
        tickets: row.tickets,
        score: row.score,
        isYou: false,
        isHouse: false,
      }));
      return NextResponse.json({
        ok: true,
        entries,
        source: "chain",
        me: user?.id ?? null,
      });
    }
  } catch {
    // fall through
  }

  return NextResponse.json({
    ok: true,
    entries: [],
    source: "empty",
    me: user?.id ?? null,
  });
}
