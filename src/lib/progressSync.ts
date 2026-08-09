import { STARTING_CHIPS } from "@/lib/progression";

/** Bump when economy resets so fat legacy stacks get capped once. */
export const ECONOMY_VERSION = 3;
/** Soft cap on first migration to v3 — keeps cosmetics, trims free chips. */
export const VETERAN_CHIP_CAP = 45_000;

export type ProgressPayload = {
  chips: number;
  xp: number;
  vipTier: string;
  equippedCardBack: string;
  equippedTableFelt: string;
  ownedCardBacks: string[];
  ownedTableFelts: string[];
  lastDailyBonusTime: number | null;
  rewardTrackDay: number;
  stats: {
    handsPlayed: number;
    gamesWon: number;
    biggestWin: number;
    currentStreak: number;
    totalEarnings: number;
  };
  matchHistory: unknown[];
  soundEnabled: boolean;
  musicEnabled: boolean;
  profile: {
    displayName?: string;
    bio?: string;
    avatarId?: string;
    avatarUrl?: string | null;
    usePresetAvatar?: boolean;
    country?: string;
    favHand?: string;
  };
  megapotCredits: number;
  ticketsMinted: number;
  missionProgress: Record<string, number>;
  missionsClaimed: string[];
  economyVersion?: number;
  /** Compact friends list synced via cloud */
  friends?: { c: string; n: string; id?: string }[];
};

export function ladderScore(wins: number, tickets: number, totalEarnings: number) {
  return wins * 120 + tickets * 90 + Math.floor(Math.max(0, totalEarnings) / 50);
}

export function applyVeteranChipCap(chips: number, economyVersion?: number) {
  if ((economyVersion ?? 0) >= ECONOMY_VERSION) return { chips, capped: false };
  const next = Math.min(Math.max(0, chips), Math.max(STARTING_CHIPS, VETERAN_CHIP_CAP));
  return { chips: next, capped: next < chips };
}

export function rowToPayload(row: Record<string, unknown>): ProgressPayload {
  const stats = (row.stats && typeof row.stats === "object" ? row.stats : {}) as ProgressPayload["stats"];
  const profile = (row.profile && typeof row.profile === "object" ? row.profile : {}) as ProgressPayload["profile"];
  return {
    chips: typeof row.chips === "number" ? row.chips : STARTING_CHIPS,
    xp: typeof row.xp === "number" ? row.xp : 0,
    vipTier: typeof row.vip_tier === "string" ? row.vip_tier : "Bronze",
    equippedCardBack: typeof row.equipped_card_back === "string" ? row.equipped_card_back : "classic",
    equippedTableFelt: typeof row.equipped_table_felt === "string" ? row.equipped_table_felt : "green",
    ownedCardBacks: Array.isArray(row.owned_card_backs) ? (row.owned_card_backs as string[]) : ["classic"],
    ownedTableFelts: Array.isArray(row.owned_table_felts) ? (row.owned_table_felts as string[]) : ["green"],
    lastDailyBonusTime: typeof row.last_daily_bonus_time === "number" ? row.last_daily_bonus_time : null,
    rewardTrackDay: typeof row.reward_track_day === "number" ? row.reward_track_day : 1,
    stats: {
      handsPlayed: Number(stats.handsPlayed) || 0,
      gamesWon: Number(stats.gamesWon) || 0,
      biggestWin: Number(stats.biggestWin) || 0,
      currentStreak: Number(stats.currentStreak) || 0,
      totalEarnings: Number(stats.totalEarnings) || 0,
    },
    matchHistory: Array.isArray(row.match_history) ? row.match_history : [],
    soundEnabled: row.sound_enabled !== false,
    musicEnabled: row.music_enabled !== false,
    profile: {
      displayName: profile.displayName || (typeof row.display_name === "string" ? row.display_name : "Player"),
      bio: profile.bio,
      avatarId: profile.avatarId,
      avatarUrl: profile.avatarUrl ?? (typeof row.avatar_url === "string" ? row.avatar_url : null),
      usePresetAvatar: Boolean(profile.usePresetAvatar),
      country: profile.country,
      favHand: profile.favHand,
    },
    megapotCredits: typeof row.megapot_credits === "number" ? row.megapot_credits : 0,
    ticketsMinted: typeof row.tickets_minted === "number" ? row.tickets_minted : 0,
    missionProgress:
      row.mission_progress && typeof row.mission_progress === "object"
        ? (row.mission_progress as Record<string, number>)
        : {},
    missionsClaimed: Array.isArray(row.missions_claimed) ? (row.missions_claimed as string[]) : [],
    economyVersion: typeof row.economy_version === "number" ? row.economy_version : 0,
  };
}

export function payloadToRow(userId: string, payload: ProgressPayload) {
  const wins = payload.stats?.gamesWon ?? 0;
  const tickets = payload.ticketsMinted ?? 0;
  const earnings = payload.stats?.totalEarnings ?? 0;
  return {
    user_id: userId,
    display_name: payload.profile?.displayName || "Player",
    avatar_url: payload.profile?.avatarUrl ?? null,
    chips: payload.chips,
    xp: payload.xp,
    vip_tier: payload.vipTier,
    equipped_card_back: payload.equippedCardBack,
    equipped_table_felt: payload.equippedTableFelt,
    owned_card_backs: payload.ownedCardBacks,
    owned_table_felts: payload.ownedTableFelts,
    last_daily_bonus_time: payload.lastDailyBonusTime,
    reward_track_day: payload.rewardTrackDay,
    stats: payload.stats,
    match_history: payload.matchHistory?.slice(0, 20) ?? [],
    sound_enabled: payload.soundEnabled,
    music_enabled: payload.musicEnabled,
    profile: payload.profile,
    megapot_credits: payload.megapotCredits,
    tickets_minted: payload.ticketsMinted,
    mission_progress: payload.missionProgress,
    missions_claimed: payload.missionsClaimed,
    economy_version: payload.economyVersion ?? ECONOMY_VERSION,
    wins,
    total_earnings: earnings,
    score: ladderScore(wins, tickets, earnings),
    updated_at: new Date().toISOString(),
  };
}
