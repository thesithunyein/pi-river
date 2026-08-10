import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ladderScore, normalizeCareerStats } from "@/lib/progressSync";

/** Public player card for ladder clicks (Google progress row). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!id || id.length < 8) {
    return NextResponse.json({ ok: false, error: "Invalid player" }, { status: 400 });
  }

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

  const { data, error } = await supabase
    .from("player_progress")
    .select(
      "user_id, display_name, avatar_url, xp, vip_tier, wins, tickets_minted, total_earnings, score, profile, equipped_card_back, equipped_table_felt, stats, match_history"
    )
    .eq("user_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      ok: false,
      error: error.message,
      needsMigration: /relation|does not exist|schema cache/i.test(error.message),
    });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Player not found" }, { status: 404 });
  }

  const row = data as Record<string, unknown>;
  const profile = (row.profile && typeof row.profile === "object" ? row.profile : {}) as Record<
    string,
    unknown
  >;
  const statsRaw = (row.stats && typeof row.stats === "object" ? row.stats : {}) as Record<
    string,
    unknown
  >;
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

  return NextResponse.json({
    ok: true,
    player: {
      id: String(row.user_id),
      displayName: (typeof row.display_name === "string" && row.display_name) || "Player",
      bio: typeof profile.bio === "string" ? profile.bio : "",
      avatarUrl:
        (typeof profile.avatarUrl === "string" && profile.avatarUrl) ||
        (typeof row.avatar_url === "string" ? row.avatar_url : null),
      avatarId: typeof profile.avatarId === "string" ? profile.avatarId : "club-runner",
      usePresetAvatar: Boolean(profile.usePresetAvatar),
      equippedFrame: typeof profile.equippedFrame === "string" ? profile.equippedFrame : "none",
      favHand: typeof profile.favHand === "string" ? profile.favHand : "",
      xp: Number(row.xp) || 0,
      vipTier: typeof row.vip_tier === "string" ? row.vip_tier : "Bronze",
      wins,
      tickets,
      score: Number(row.score) || ladderScore(wins, tickets, earnings),
      handsPlayed: career.handsPlayed,
      biggestWin: career.biggestWin,
      cardBack: typeof row.equipped_card_back === "string" ? row.equipped_card_back : "classic",
      tableFelt: typeof row.equipped_table_felt === "string" ? row.equipped_table_felt : "green",
      isYou: user.id === row.user_id,
    },
  });
}
