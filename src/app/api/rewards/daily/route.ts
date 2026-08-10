import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ECONOMY_VERSION,
  mergeProgressAgainstExisting,
  payloadToRow,
  rowToPayload,
  type ProgressPayload,
} from "@/lib/progressSync";
import { CLOUD_META_KEY, fromCompactCloud, toCompactCloud } from "@/lib/cloudProgress";
import { alreadyClaimedDailyBonusToday } from "@/lib/missions";
import { dailyRewardForDay, getPlayerLevel, vipTierForLevel } from "@/lib/progression";

export const runtime = "nodejs";

/**
 * Authoritative once-per-UTC-day daily bonus claim.
 * Survives logout/login because last_daily_bonus_time is written in Supabase first.
 */
export async function POST() {
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

  const userMeta = user.user_metadata as Record<string, unknown> | undefined;
  let existing: ProgressPayload | null = null;
  const existingRes = await supabase
    .from("player_progress")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existingRes.error && existingRes.data) {
    existing = rowToPayload(existingRes.data as Record<string, unknown>);
  } else {
    existing = fromCompactCloud(userMeta?.[CLOUD_META_KEY]) ?? null;
  }

  if (alreadyClaimedDailyBonusToday(existing?.lastDailyBonusTime ?? null)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Already claimed today",
        alreadyClaimed: true,
        lastDailyBonusTime: existing?.lastDailyBonusTime ?? null,
        rewardTrackDay: existing?.rewardTrackDay ?? 1,
      },
      { status: 409 }
    );
  }

  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);

  // Extra guard: unique (user_id, day_key) if migration 008 applied
  const claimInsert = await supabase.from("daily_bonus_claims").insert({
    user_id: user.id,
    day_key: dayKey,
    reward_day: Math.min(16, Math.max(1, existing?.rewardTrackDay || 1)),
    chips_granted: 0,
    xp_granted: 0,
  });
  if (claimInsert.error) {
    if (/duplicate|unique/i.test(claimInsert.error.message)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Already claimed today",
          alreadyClaimed: true,
          lastDailyBonusTime: existing?.lastDailyBonusTime ?? now,
          rewardTrackDay: existing?.rewardTrackDay ?? 1,
        },
        { status: 409 }
      );
    }
    // Missing table / RLS — still allow claim via last_daily_bonus_time path
  }

  const day = Math.min(16, Math.max(1, existing?.rewardTrackDay || 1));
  const reward = dailyRewardForDay(day);
  const nextTrack = day >= 16 ? 1 : day + 1;
  const nextXp = Math.max(0, Math.floor(Number(existing?.xp) || 0)) + reward.xp;
  const nextWins = Math.max(0, Math.floor(Number(existing?.stats?.gamesWon) || 0));
  const nextChips = Math.max(0, Math.floor(Number(existing?.chips) || 0)) + reward.chips;
  const nextMegapot = Math.max(0, Math.floor(Number(existing?.megapotCredits) || 0)) + 1;
  const nextVip = vipTierForLevel(getPlayerLevel(nextXp, nextWins));

  // Fill real grant amounts on claim receipt (ignore missing-table)
  if (!claimInsert.error) {
    await supabase
      .from("daily_bonus_claims")
      .update({
        chips_granted: reward.chips,
        xp_granted: reward.xp,
        reward_day: day,
      })
      .eq("user_id", user.id)
      .eq("day_key", dayKey);
  }

  const base: ProgressPayload =
    existing ||
    ({
      chips: 0,
      xp: 0,
      vipTier: "Bronze",
      equippedCardBack: "classic",
      equippedTableFelt: "green",
      ownedCardBacks: ["classic"],
      ownedTableFelts: ["green"],
      lastDailyBonusTime: null,
      rewardTrackDay: 1,
      stats: {
        handsPlayed: 0,
        gamesWon: 0,
        biggestWin: 0,
        currentStreak: 0,
        totalEarnings: 0,
      },
      matchHistory: [],
      soundEnabled: true,
      musicEnabled: true,
      profile: { displayName: "Player" },
      megapotCredits: 0,
      ticketsMinted: 0,
      missionProgress: {},
      missionsClaimed: [],
      ownedFrames: ["none"],
      ownedStickerPacks: [],
      achievementsClaimed: [],
      economyVersion: ECONOMY_VERSION,
    } satisfies ProgressPayload);

  const next: ProgressPayload = {
    ...base,
    chips: nextChips,
    xp: nextXp,
    vipTier: nextVip,
    lastDailyBonusTime: now,
    rewardTrackDay: nextTrack,
    megapotCredits: nextMegapot,
    economyVersion: ECONOMY_VERSION,
  };

  const payload = mergeProgressAgainstExisting(next, existing);
  payload.lastDailyBonusTime = now;
  payload.rewardTrackDay = nextTrack;
  payload.chips = Math.max(payload.chips, nextChips);
  payload.xp = Math.max(payload.xp, nextXp);
  payload.megapotCredits = Math.max(payload.megapotCredits, nextMegapot);
  payload.vipTier = nextVip;

  const compact = toCompactCloud(payload);
  await supabase.auth.updateUser({
    data: { ...(userMeta || {}), [CLOUD_META_KEY]: compact },
  });

  const row = payloadToRow(user.id, payload);
  let upsert = await supabase.from("player_progress").upsert(row, { onConflict: "user_id" });
  if (
    upsert.error &&
    /owned_frames|owned_stickers|column .* does not exist|schema cache/i.test(upsert.error.message)
  ) {
    const rowSafe = { ...(row as Record<string, unknown>) };
    delete rowSafe.owned_frames;
    delete rowSafe.owned_stickers;
    upsert = await supabase.from("player_progress").upsert(rowSafe, { onConflict: "user_id" });
  }

  if (upsert.error && /relation|does not exist|schema cache/i.test(upsert.error.message)) {
    return NextResponse.json({
      ok: true,
      needsMigration: true,
      chipsGranted: reward.chips,
      xpGranted: reward.xp,
      lastDailyBonusTime: now,
      rewardTrackDay: nextTrack,
      chips: payload.chips,
      xp: payload.xp,
      megapotCredits: payload.megapotCredits,
      vipTier: payload.vipTier,
    });
  }

  if (upsert.error) {
    return NextResponse.json({ ok: false, error: upsert.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    chipsGranted: reward.chips,
    xpGranted: reward.xp,
    lastDailyBonusTime: now,
    rewardTrackDay: nextTrack,
    chips: payload.chips,
    xp: payload.xp,
    megapotCredits: payload.megapotCredits,
    vipTier: payload.vipTier,
  });
}

export async function GET() {
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

  const userMeta = user.user_metadata as Record<string, unknown> | undefined;
  const table = await supabase.from("player_progress").select("*").eq("user_id", user.id).maybeSingle();
  const progress =
    (!table.error && table.data
      ? rowToPayload(table.data as Record<string, unknown>)
      : fromCompactCloud(userMeta?.[CLOUD_META_KEY])) ?? null;

  const last = progress?.lastDailyBonusTime ?? null;
  return NextResponse.json({
    ok: true,
    canClaim: !alreadyClaimedDailyBonusToday(last),
    lastDailyBonusTime: last,
    rewardTrackDay: progress?.rewardTrackDay ?? 1,
  });
}
