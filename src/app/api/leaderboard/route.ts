import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ladderScore, normalizeCareerStats } from "@/lib/progressSync";
import type { LadderEntry } from "@/lib/clubLadder";
import { readClubLadder } from "@/lib/economy/onchain";

const SELECT_FULL =
  "user_id, display_name, avatar_url, wins, hands_played, tickets_minted, total_earnings, score, profile, stats, match_history, equipped_frame, owned_frames";
const SELECT_SAFE =
  "user_id, display_name, avatar_url, wins, tickets_minted, total_earnings, score, profile, stats, match_history";

function mapRows(
  data: Array<Record<string, unknown>>,
  meId: string | null
): LadderEntry[] {
  const entries: LadderEntry[] = data.map((row) => {
    const statsRaw =
      row.stats && typeof row.stats === "object"
        ? (row.stats as Record<string, unknown>)
        : {};
    const career = normalizeCareerStats(
      {
        handsPlayed: Math.max(
          Number(statsRaw.handsPlayed) || 0,
          Number(row.hands_played) || 0
        ),
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
    const ownedFrames = Array.isArray(row.owned_frames)
      ? (row.owned_frames as string[])
      : [];
    const colFrame =
      typeof row.equipped_frame === "string" && row.equipped_frame !== "none"
        ? row.equipped_frame
        : "none";
    const profileFrame =
      typeof profile.equippedFrame === "string" ? profile.equippedFrame : "none";
    const equippedFrame =
      colFrame !== "none" && (ownedFrames.length === 0 || ownedFrames.includes(colFrame))
        ? colFrame
        : profileFrame !== "none" &&
            (ownedFrames.length === 0 || ownedFrames.includes(profileFrame))
          ? profileFrame
          : "none";
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
      score: ladderScore(wins, tickets, earnings),
      handsPlayed: career.handsPlayed,
      avatarUrl: profile.usePresetAvatar ? undefined : fromProfile || fromCol,
      avatarId: profile.avatarId,
      usePresetAvatar: Boolean(profile.usePresetAvatar),
      equippedFrame,
      isYou: Boolean(meId && row.user_id === meId),
      isHouse: false,
    };
  });

  return entries.sort((a, b) => b.score - a.score || b.wins - a.wins);
}

/** Prefer Supabase Google progress (multi-player), fall back to on-chain RiverClub. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (supabase) {
    let { data, error } = await supabase
      .from("player_progress")
      .select(SELECT_FULL)
      .order("score", { ascending: false })
      .order("wins", { ascending: false })
      .limit(24);

    // Migration 009 columns missing — retry without them so ladder still shows.
    if (error && /equipped_frame|owned_frames|hands_played|column .* does not exist|schema cache/i.test(error.message)) {
      const retry = await supabase
        .from("player_progress")
        .select(SELECT_SAFE)
        .order("score", { ascending: false })
        .order("wins", { ascending: false })
        .limit(24);
      data = retry.data;
      error = retry.error;
    }

    if (!error && data?.length) {
      const entries = mapRows(data as Array<Record<string, unknown>>, user?.id ?? null).slice(
        0,
        12
      );
      return NextResponse.json({ ok: true, entries, source: "table", me: user?.id ?? null });
    }
  }

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
