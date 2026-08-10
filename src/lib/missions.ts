export type MissionKind = "daily" | "timeless";

export type MissionId =
  | "first-hand"
  | "win-one"
  | "play-three"
  | "shop-style"
  | "claim-ticket"
  | "streak-two"
  | "daily-hands"
  | "daily-win"
  | "daily-showdown";

export type MissionDef = {
  id: MissionId;
  kind: MissionKind;
  title: string;
  blurb: string;
  target: number;
  rewardChips: number;
  rewardXp: number;
};

export type AchievementId =
  | "ach-first-pot"
  | "ach-ten-hands"
  | "ach-streak-three"
  | "ach-ticket"
  | "ach-styled"
  | "ach-showdown";

export type AchievementDef = {
  id: AchievementId;
  title: string;
  blurb: string;
  /** Progress key in missionProgress or special */
  track: "wins" | "hands" | "streak" | "tickets" | "shop" | "showdowns";
  target: number;
  rewardChips: number;
  rewardXp: number;
};

export const DAILY_MISSIONS: MissionDef[] = [
  {
    id: "daily-hands",
    kind: "daily",
    title: "Daily volume",
    blurb: "Finish 3 hands today.",
    target: 3,
    rewardChips: 500,
    rewardXp: 30,
  },
  {
    id: "daily-win",
    kind: "daily",
    title: "Daily scoop",
    blurb: "Win 1 hand today.",
    target: 1,
    rewardChips: 650,
    rewardXp: 40,
  },
  {
    id: "daily-showdown",
    kind: "daily",
    title: "Go to river",
    blurb: "Reach showdown once today.",
    target: 1,
    rewardChips: 550,
    rewardXp: 35,
  },
];

export const TIMELESS_MISSIONS: MissionDef[] = [
  {
    id: "first-hand",
    kind: "timeless",
    title: "Ante up",
    blurb: "Finish 1 live hand.",
    target: 1,
    rewardChips: 400,
    rewardXp: 25,
  },
  {
    id: "win-one",
    kind: "timeless",
    title: "Take the pot",
    blurb: "Win 1 hand vs bot or friend.",
    target: 1,
    rewardChips: 700,
    rewardXp: 40,
  },
  {
    id: "play-three",
    kind: "timeless",
    title: "Session grind",
    blurb: "Play 5 hands total.",
    target: 5,
    rewardChips: 900,
    rewardXp: 50,
  },
  {
    id: "shop-style",
    kind: "timeless",
    title: "Dress the rail",
    blurb: "Buy any Shop item (back, felt, or frame).",
    target: 1,
    rewardChips: 250,
    rewardXp: 20,
  },
  {
    id: "claim-ticket",
    kind: "timeless",
    title: "Jackpot entry",
    blurb: "Claim 1 Megapot ticket.",
    target: 1,
    rewardChips: 400,
    rewardXp: 30,
  },
  {
    id: "streak-two",
    kind: "timeless",
    title: "Back-to-back",
    blurb: "Win 2 hands in a row.",
    target: 2,
    rewardChips: 1_100,
    rewardXp: 65,
  },
];

export const MISSIONS: MissionDef[] = [...DAILY_MISSIONS, ...TIMELESS_MISSIONS];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "ach-first-pot",
    title: "First pot",
    blurb: "Win your first hand.",
    track: "wins",
    target: 1,
    rewardChips: 800,
    rewardXp: 50,
  },
  {
    id: "ach-ten-hands",
    title: "Felt regular",
    blurb: "Play 10 hands.",
    track: "hands",
    target: 10,
    rewardChips: 1_200,
    rewardXp: 80,
  },
  {
    id: "ach-streak-three",
    title: "Hot run",
    blurb: "Reach a 3-win streak.",
    track: "streak",
    target: 3,
    rewardChips: 1_500,
    rewardXp: 100,
  },
  {
    id: "ach-ticket",
    title: "Jackpot hunter",
    blurb: "Mint 1 Megapot ticket.",
    track: "tickets",
    target: 1,
    rewardChips: 600,
    rewardXp: 40,
  },
  {
    id: "ach-styled",
    title: "Table fashion",
    blurb: "Buy a Shop cosmetic.",
    track: "shop",
    target: 1,
    rewardChips: 400,
    rewardXp: 25,
  },
  {
    id: "ach-showdown",
    title: "Showdown ready",
    blurb: "Finish 3 showdowns.",
    track: "showdowns",
    target: 3,
    rewardChips: 1_000,
    rewardXp: 70,
  },
];

export function utcDayKey(ms = Date.now()) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** One daily-bonus claim per UTC calendar day (survives 24h-window edge cases). */
export function alreadyClaimedDailyBonusToday(lastDailyBonusTime: number | null | undefined) {
  if (!lastDailyBonusTime || lastDailyBonusTime <= 0) return false;
  return utcDayKey(lastDailyBonusTime) === utcDayKey();
}

const DAILY_IDS = new Set(DAILY_MISSIONS.map((m) => m.id));

/** Wipe daily mission progress/claims when the UTC day rolls. */
export function applyDailyMissionRollover(
  dailyMissionDay: string | null | undefined,
  missionProgress: Record<string, number>,
  missionsClaimed: string[]
) {
  const today = utcDayKey();
  if (dailyMissionDay === today) {
    return {
      dailyMissionDay: today,
      missionProgress,
      missionsClaimed,
      rolled: false,
    };
  }
  const nextProgress = { ...missionProgress };
  for (const id of DAILY_IDS) {
    nextProgress[id] = 0;
  }
  return {
    dailyMissionDay: today,
    missionProgress: nextProgress,
    missionsClaimed: missionsClaimed.filter((id) => !DAILY_IDS.has(id as MissionId)),
    rolled: true,
  };
}

export function achievementProgress(
  ach: AchievementDef,
  stats: {
    handsPlayed: number;
    gamesWon: number;
    currentStreak: number;
  },
  ticketsMinted: number,
  missionProgress: Record<string, number>
) {
  switch (ach.track) {
    case "wins":
      return stats.gamesWon;
    case "hands":
      return stats.handsPlayed;
    case "streak":
      return Math.max(stats.currentStreak, missionProgress["streak-two"] || 0);
    case "tickets":
      return ticketsMinted;
    case "shop":
      return missionProgress["shop-style"] || 0;
    case "showdowns":
      return missionProgress["showdowns"] || 0;
    default:
      return 0;
  }
}

export {
  getPlayerLevel,
  xpIntoLevel,
  levelTitle,
  XP_PER_LEVEL,
} from "@/lib/progression";
