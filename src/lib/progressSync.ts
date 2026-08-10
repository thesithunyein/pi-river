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
    equippedFrame?: string;
  };
  megapotCredits: number;
  ticketsMinted: number;
  missionProgress: Record<string, number>;
  missionsClaimed: string[];
  ownedFrames?: string[];
  /** Purchased HD sticker pack ids (`neon`, `vip`, …) */
  ownedStickerPacks?: string[];
  achievementsClaimed?: string[];
  dailyMissionDay?: string | null;
  economyVersion?: number;
  /**
   * Lifetime fun-chips credited from Base Sepolia pack purchases.
   * Monotonic — used so deposits win chip merges (owns evidence alone is for spends).
   */
  lifetimeChipsBought?: number;
  /** Compact friends list synced via cloud */
  friends?: { c: string; n: string; id?: string }[];
};

export function ladderScore(wins: number, tickets: number, totalEarnings: number) {
  return wins * 120 + tickets * 90 + Math.floor(Math.max(0, totalEarnings) / 50);
}

function parseStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const out = value.map(String).filter(Boolean);
    return out.length ? out : fallback;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        const out = parsed.map(String).filter(Boolean);
        return out.length ? out : fallback;
      }
    } catch {
      // ignore
    }
  }
  return fallback;
}

export function applyVeteranChipCap(chips: number, economyVersion?: number) {
  if ((economyVersion ?? 0) >= ECONOMY_VERSION) return { chips, capped: false };
  const next = Math.min(Math.max(0, chips), Math.max(STARTING_CHIPS, VETERAN_CHIP_CAP));
  return { chips: next, capped: next < chips };
}

export function rowToPayload(row: Record<string, unknown>): ProgressPayload {
  const stats = (row.stats && typeof row.stats === "object" ? row.stats : {}) as ProgressPayload["stats"];
  const profileRaw =
    row.profile && typeof row.profile === "object" ? (row.profile as Record<string, unknown>) : {};
  const profile = profileRaw as ProgressPayload["profile"];
  const matchHistory = Array.isArray(row.match_history) ? row.match_history : [];
  return {
    chips: typeof row.chips === "number" ? row.chips : STARTING_CHIPS,
    xp: typeof row.xp === "number" ? row.xp : 0,
    vipTier: typeof row.vip_tier === "string" ? row.vip_tier : "Bronze",
    equippedCardBack: typeof row.equipped_card_back === "string" ? row.equipped_card_back : "classic",
    equippedTableFelt: typeof row.equipped_table_felt === "string" ? row.equipped_table_felt : "green",
    ownedCardBacks: parseStringArray(row.owned_card_backs, ["classic"]),
    ownedTableFelts: parseStringArray(row.owned_table_felts, ["green"]),
    lastDailyBonusTime: typeof row.last_daily_bonus_time === "number" ? row.last_daily_bonus_time : null,
    rewardTrackDay: typeof row.reward_track_day === "number" ? row.reward_track_day : 1,
    stats: normalizeCareerStats(stats, {
      winsColumn: typeof row.wins === "number" ? row.wins : Number(row.wins) || 0,
      earningsColumn:
        typeof row.total_earnings === "number" ? row.total_earnings : Number(row.total_earnings) || 0,
      history: matchHistory,
    }),
    matchHistory,
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
      equippedFrame: typeof profile.equippedFrame === "string" ? profile.equippedFrame : "none",
    },
    megapotCredits: typeof row.megapot_credits === "number" ? row.megapot_credits : 0,
    ticketsMinted: typeof row.tickets_minted === "number" ? row.tickets_minted : 0,
    missionProgress:
      row.mission_progress && typeof row.mission_progress === "object"
        ? (row.mission_progress as Record<string, number>)
        : {},
    missionsClaimed: Array.isArray(row.missions_claimed) ? (row.missions_claimed as string[]) : [],
    ownedFrames: mergeOwnedIds(
      parseStringArray(row.owned_frames, ["none"]),
      parseStringArray(profileRaw.ownedFrames, ["none"]),
      ["none"]
    ),
    ownedStickerPacks: mergeOwnedIds(
      parseStringArray(row.owned_stickers, []),
      parseStringArray(profileRaw.ownedStickerPacks, []),
      []
    ),
    achievementsClaimed: Array.isArray(profileRaw.achievementsClaimed)
      ? (profileRaw.achievementsClaimed as string[])
      : [],
    dailyMissionDay:
      typeof profileRaw.dailyMissionDay === "string" ? profileRaw.dailyMissionDay : null,
    lifetimeChipsBought: Math.max(
      0,
      Math.floor(
        Number(
          (typeof profileRaw.lifetimeChipsBought === "number"
            ? profileRaw.lifetimeChipsBought
            : row.lifetime_chips_bought) || 0
        )
      )
    ),
    economyVersion: typeof row.economy_version === "number" ? row.economy_version : 0,
  };
}

export type PlayerStatsShape = ProgressPayload["stats"];

function careerVolume(s: Partial<PlayerStatsShape> | null | undefined) {
  return (Number(s?.handsPlayed) || 0) * 1_000_000 + (Number(s?.gamesWon) || 0);
}

/** Never let a stale cloud pull erase bigger local career numbers. */
export function mergePlayerStats(
  local: Partial<PlayerStatsShape> | null | undefined,
  remote: Partial<PlayerStatsShape> | null | undefined
): PlayerStatsShape {
  const a = local || {};
  const b = remote || {};
  const handsPlayed = Math.max(Number(a.handsPlayed) || 0, Number(b.handsPlayed) || 0);
  const gamesWon = Math.max(Number(a.gamesWon) || 0, Number(b.gamesWon) || 0);
  // Streak must follow the fresher career (losses reset it — never Math.max)
  const currentStreak =
    careerVolume(a) >= careerVolume(b)
      ? Number(a.currentStreak) || 0
      : Number(b.currentStreak) || 0;
  return {
    handsPlayed: Math.max(handsPlayed, gamesWon),
    gamesWon,
    biggestWin: Math.max(Number(a.biggestWin) || 0, Number(b.biggestWin) || 0),
    currentStreak,
    totalEarnings: Math.max(Number(a.totalEarnings) || 0, Number(b.totalEarnings) || 0),
  };
}

/** Rebuild career floors from recent match log (heals wipe bugs). */
export function healStatsFromMatchHistory(
  stats: PlayerStatsShape,
  history: unknown[] | null | undefined
): PlayerStatsShape {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      ...stats,
      handsPlayed: Math.max(Number(stats.handsPlayed) || 0, Number(stats.gamesWon) || 0),
    };
  }
  const rows = history
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((r) => ({
      result: r.result === "win" ? "win" : "loss",
      chipsDelta: Number(r.chipsDelta) || 0,
      at: Number(r.at) || 0,
    }))
    .sort((a, b) => b.at - a.at);

  const historyHands = rows.length;
  const historyWins = rows.filter((r) => r.result === "win").length;
  let biggest = stats.biggestWin;
  let earningsFloor = 0;
  for (const r of rows) {
    if (r.result === "win") {
      biggest = Math.max(biggest, Math.max(0, r.chipsDelta));
      earningsFloor += Math.max(0, r.chipsDelta);
    }
  }
  let streak = 0;
  for (const r of rows) {
    if (r.result === "win") streak += 1;
    else break;
  }

  const gamesWon = Math.max(stats.gamesWon, historyWins);
  return {
    handsPlayed: Math.max(stats.handsPlayed, historyHands, gamesWon),
    gamesWon,
    biggestWin: Math.max(stats.biggestWin, biggest),
    // Recent match log is source of truth for live streak (stops inflated Math.max)
    currentStreak: streak,
    totalEarnings: Math.max(stats.totalEarnings, earningsFloor),
  };
}

/**
 * Reconcile stats JSON + SQL ladder columns + match history so Profile
 * (stats.gamesWon) and Leaderboard (wins) never disagree, and win rate ≤ 100%.
 */
export function normalizeCareerStats(
  stats: Partial<PlayerStatsShape> | null | undefined,
  extras?: {
    winsColumn?: number | null;
    earningsColumn?: number | null;
    history?: unknown[] | null;
  }
): PlayerStatsShape {
  const base: PlayerStatsShape = {
    handsPlayed: Number(stats?.handsPlayed) || 0,
    gamesWon: Math.max(
      Number(stats?.gamesWon) || 0,
      Math.max(0, Math.floor(Number(extras?.winsColumn) || 0))
    ),
    biggestWin: Number(stats?.biggestWin) || 0,
    currentStreak: Number(stats?.currentStreak) || 0,
    totalEarnings: Math.max(
      Number(stats?.totalEarnings) || 0,
      Math.max(0, Math.floor(Number(extras?.earningsColumn) || 0))
    ),
  };
  return healStatsFromMatchHistory(base, extras?.history);
}

export function mergeMatchHistoryArrays(local: unknown[], remote: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const row of [...remote, ...local]) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const key = `${r.at}|${r.opponent}|${r.hand}|${r.result}|${r.chipsDelta}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out
    .sort((a, b) => {
      const atA = Number((a as Record<string, unknown>).at) || 0;
      const atB = Number((b as Record<string, unknown>).at) || 0;
      return atB - atA;
    })
    .slice(0, 20);
}

export function mergeOwnedIds(
  local: string[] | undefined | null,
  remote: string[] | undefined | null,
  fallback: string[]
): string[] {
  return Array.from(
    new Set([...(local?.length ? local : fallback), ...(remote?.length ? remote : fallback)])
  );
}

/** Count spendable cosmetics (shop inventory depth). */
export function countOwnedCosmetics(p: Partial<ProgressPayload> | null | undefined): number {
  if (!p) return 0;
  const backs = p.ownedCardBacks?.length || 0;
  const felts = p.ownedTableFelts?.length || 0;
  const frames = p.ownedFrames?.length || 0;
  const packs = p.ownedStickerPacks?.length || 0;
  return backs + felts + frames + packs;
}

function careerSignal(p: Partial<ProgressPayload> | null | undefined): number {
  if (!p) return 0;
  return (
    (Number(p.xp) || 0) +
    (Number(p.stats?.gamesWon) || 0) * 100 +
    (Number(p.stats?.handsPlayed) || 0) * 10 +
    (Number(p.ticketsMinted) || 0) * 50
  );
}

function lifetimeBought(p: Partial<ProgressPayload> | null | undefined): number {
  return Math.max(0, Math.floor(Number(p?.lifetimeChipsBought) || 0));
}

/**
 * Chips go down on shop buys — never Math.max them blindly or spends never stick.
 * Prefer the stack that matches more owns / career. Pack deposits bump
 * lifetimeChipsBought so higher stacks stick after ETH→chips claims.
 * When fully tied, prefer the lower stack (spend is the usual drift).
 */
export function mergeChipBalance(
  incomingChips: number,
  existingChips: number,
  incoming: Partial<ProgressPayload> | null | undefined,
  existing: Partial<ProgressPayload> | null | undefined
): number {
  const i = Math.max(0, Math.floor(Number(incomingChips) || 0));
  const e = Math.max(0, Math.floor(Number(existingChips) || 0));
  if (!existing) return i;

  const iOwns = countOwnedCosmetics(incoming);
  const eOwns = countOwnedCosmetics(existing);
  if (iOwns > eOwns) return i;
  if (eOwns > iOwns) return e;

  // ETH pack purchases — monotonic evidence that a higher stack is intentional
  const iBought = lifetimeBought(incoming);
  const eBought = lifetimeBought(existing);
  if (iBought > eBought) return i;
  if (eBought > iBought) return e;

  const iCareer = careerSignal(incoming);
  const eCareer = careerSignal(existing);
  if (iCareer > eCareer) return i;
  if (eCareer > iCareer) return e;

  // Guard accidental guest wipe: tiny stack with fat veteran reserve
  if (i < STARTING_CHIPS / 2 && e >= VETERAN_CHIP_CAP / 2 && iOwns <= eOwns) {
    return e;
  }

  return Math.min(i, e);
}

/** Megapot credits are spent on claims — merge by ticket evidence, else prefer lower. */
export function mergeMegapotCredits(
  incomingCredits: number,
  existingCredits: number,
  incomingTickets: number,
  existingTickets: number
): number {
  const i = Math.max(0, Math.floor(Number(incomingCredits) || 0));
  const e = Math.max(0, Math.floor(Number(existingCredits) || 0));
  const iT = Math.max(0, Math.floor(Number(incomingTickets) || 0));
  const eT = Math.max(0, Math.floor(Number(existingTickets) || 0));
  if (iT > eT) return i;
  if (eT > iT) return e;
  return Math.min(i, e);
}

/** Prefer non-regressing career fields when saving cloud progress. */
export function mergeProgressAgainstExisting(
  incoming: ProgressPayload,
  existing: ProgressPayload | null
): ProgressPayload {
  if (!existing) return incoming;
  const matchHistory = mergeMatchHistoryArrays(
    Array.isArray(incoming.matchHistory) ? incoming.matchHistory : [],
    Array.isArray(existing.matchHistory) ? existing.matchHistory : []
  );
  const stats = healStatsFromMatchHistory(
    mergePlayerStats(incoming.stats, existing.stats),
    matchHistory
  );
  const ownedCardBacks = Array.from(
    new Set([...(existing.ownedCardBacks || []), ...(incoming.ownedCardBacks || [])])
  );
  const ownedTableFelts = Array.from(
    new Set([...(existing.ownedTableFelts || []), ...(incoming.ownedTableFelts || [])])
  );
  const ownedFrames = Array.from(
    new Set([...(existing.ownedFrames || ["none"]), ...(incoming.ownedFrames || ["none"])])
  );
  const ownedStickerPacks = Array.from(
    new Set([...(existing.ownedStickerPacks || []), ...(incoming.ownedStickerPacks || [])])
  );
  const lifetimeChipsBought = Math.max(
    lifetimeBought(incoming),
    lifetimeBought(existing)
  );
  const lastDailyBonusTime = Math.max(
    Number(incoming.lastDailyBonusTime) || 0,
    Number(existing.lastDailyBonusTime) || 0
  ) || null;
  // Prefer track day from the fresher daily claim
  const iDaily = Number(incoming.lastDailyBonusTime) || 0;
  const eDaily = Number(existing.lastDailyBonusTime) || 0;
  const rewardTrackDay =
    iDaily === eDaily
      ? Math.max(incoming.rewardTrackDay || 1, existing.rewardTrackDay || 1)
      : iDaily > eDaily
        ? incoming.rewardTrackDay || 1
        : existing.rewardTrackDay || 1;
  const missionsClaimed = Array.from(
    new Set([...(existing.missionsClaimed || []), ...(incoming.missionsClaimed || [])])
  );
  const achievementsClaimed = Array.from(
    new Set([
      ...(existing.achievementsClaimed || []),
      ...(incoming.achievementsClaimed || []),
    ])
  );
  const mergedOwnsPayload: ProgressPayload = {
    ...incoming,
    ownedCardBacks,
    ownedTableFelts,
    ownedFrames,
    ownedStickerPacks,
    stats: normalizeCareerStats(stats, { history: matchHistory }),
    matchHistory,
    ticketsMinted: Math.max(incoming.ticketsMinted || 0, existing.ticketsMinted || 0),
    xp: Math.max(incoming.xp || 0, existing.xp || 0),
    lifetimeChipsBought,
    lastDailyBonusTime,
    rewardTrackDay,
    missionsClaimed,
    achievementsClaimed,
  };
  return {
    ...mergedOwnsPayload,
    chips: mergeChipBalance(incoming.chips, existing.chips, mergedOwnsPayload, {
      ...existing,
      lifetimeChipsBought: lifetimeBought(existing),
    }),
    megapotCredits: mergeMegapotCredits(
      incoming.megapotCredits || 0,
      existing.megapotCredits || 0,
      incoming.ticketsMinted || 0,
      existing.ticketsMinted || 0
    ),
  };
}

export function payloadToRow(userId: string, payload: ProgressPayload) {
  const wins = payload.stats?.gamesWon ?? 0;
  const tickets = payload.ticketsMinted ?? 0;
  const earnings = payload.stats?.totalEarnings ?? 0;
  const avatarUrl = payload.profile?.avatarUrl;
  const publicAvatar =
    typeof avatarUrl === "string" && avatarUrl.startsWith("http") ? avatarUrl : null;
  return {
    user_id: userId,
    display_name: payload.profile?.displayName || "Player",
    avatar_url: publicAvatar,
    chips: payload.chips,
    xp: payload.xp,
    vip_tier: payload.vipTier,
    equipped_card_back: payload.equippedCardBack,
    equipped_table_felt: payload.equippedTableFelt,
    owned_card_backs: payload.ownedCardBacks,
    owned_table_felts: payload.ownedTableFelts,
    owned_frames: payload.ownedFrames?.length ? payload.ownedFrames : ["none"],
    owned_stickers: payload.ownedStickerPacks?.length ? payload.ownedStickerPacks : [],
    last_daily_bonus_time: payload.lastDailyBonusTime,
    reward_track_day: payload.rewardTrackDay,
    stats: payload.stats,
    match_history: payload.matchHistory?.slice(0, 20) ?? [],
    sound_enabled: payload.soundEnabled,
    music_enabled: payload.musicEnabled,
    profile: {
      ...payload.profile,
      avatarUrl: publicAvatar ?? payload.profile?.avatarUrl ?? null,
      ownedFrames: payload.ownedFrames?.length ? payload.ownedFrames : ["none"],
      ownedStickerPacks: payload.ownedStickerPacks?.length ? payload.ownedStickerPacks : [],
      achievementsClaimed: payload.achievementsClaimed || [],
      dailyMissionDay: payload.dailyMissionDay ?? null,
      lifetimeChipsBought: Math.max(0, Math.floor(Number(payload.lifetimeChipsBought) || 0)),
    },
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
