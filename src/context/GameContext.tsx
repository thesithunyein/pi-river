"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { sound } from "@/lib/sound";
import { createClient } from "@/lib/supabase/client";
import { readLinkedIdentity } from "@/lib/identity";
import { MISSIONS, ACHIEVEMENTS, applyDailyMissionRollover, achievementProgress, alreadyClaimedDailyBonusToday } from "@/lib/missions";
import { dailyRewardForDay, STARTING_CHIPS, vipTierForLevel, xpFromHand, getPlayerLevel } from "@/lib/progression";
import {
  applyVeteranChipCap,
  ECONOMY_VERSION,
  mergeOwnedIds,
  mergePlayerStats,
  mergeChipBalance,
  mergeMegapotCredits,
  normalizeCareerStats,
  type ProgressPayload,
} from "@/lib/progressSync";
import { walletForGoogleUser } from "@/lib/identity";
import { readFriends, writeFriends } from "@/lib/friends";
import { getPlayAddress } from "@/lib/wallet/playWallet";
import { burnSelfRiverChips } from "@/lib/economy/burnSelf";
import { AVATAR_FRAMES, resolveFrameId } from "@/lib/frames";
import { packById } from "@/lib/stickers";

export interface UserProfile {
  displayName: string;
  bio: string;
  avatarId: string;
  /** Custom photo as data URL (wallet users). Google photo comes from OAuth. */
  avatarUrl: string | null;
  /** When true, show the chosen cute avatar instead of Google/upload photo. */
  usePresetAvatar: boolean;
  country: string;
  favHand: string;
  equippedFrame: string;
}

export interface AvatarOption {
  id: string;
  name: string;
  emoji: string;
  bgGradient: string;
  borderColor: string;
  description: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: "club-runner",
    name: "Club Runner",
    emoji: "🦊",
    bgGradient: "from-cyan-400 to-orange-500",
    borderColor: "border-cyan-300",
    description: "Speedy fox — opens pots early",
  },
  {
    id: "gold-stack",
    name: "Gold Stack",
    emoji: "🪙",
    bgGradient: "from-amber-300 to-yellow-600",
    borderColor: "border-yellow-300",
    description: "Chip crown. Stacks big pots",
  },
  {
    id: "night-bluff",
    name: "Night Bluff",
    emoji: "🥷",
    bgGradient: "from-indigo-500 to-violet-900",
    borderColor: "border-indigo-300",
    description: "Hooded pressure specialist",
  },
  {
    id: "felt-core",
    name: "Felt Core",
    emoji: "🐼",
    bgGradient: "from-emerald-400 to-teal-800",
    borderColor: "border-emerald-300",
    description: "Calm panda. Wait for nuts",
  },
  {
    id: "violet-read",
    name: "Rail Owl",
    emoji: "🦉",
    bgGradient: "from-slate-400 to-slate-900",
    borderColor: "border-slate-300",
    description: "Owl eyes. Spots every tell",
  },
  {
    id: "river-ace",
    name: "River Ace",
    emoji: "🦈",
    bgGradient: "from-rose-400 to-red-800",
    borderColor: "border-rose-300",
    description: "Shark fin. Closes on river",
  },
];

export interface MatchRecord {
  opponent: string;
  result: "win" | "loss";
  hand: string;
  /** Signed fun-chip delta (0 on fold / soft losses). */
  chipsDelta: number;
  /** Unix ms when the hand settled. */
  at: number;
}

export interface PlayerStats {
  handsPlayed: number;
  gamesWon: number;
  biggestWin: number;
  currentStreak: number;
  totalEarnings: number;
}

interface GameContextType {
  chips: number;
  xp: number;
  vipTier: string;
  equippedCardBack: string;
  equippedTableFelt: string;
  ownedCardBacks: string[];
  ownedTableFelts: string[];
  lastDailyBonusTime: number | null;
  rewardTrackDay: number;
  stats: PlayerStats;
  matchHistory: MatchRecord[];
  soundEnabled: boolean;
  musicEnabled: boolean;
  profile: UserProfile;
  chainId: number;
  /** Unclaimed Megapot ticket credits earned from sealed river play */
  megapotCredits: number;
  ticketsMinted: number;
  sessionStake: number;
  /** Mission progress counts keyed by mission id */
  missionProgress: Record<string, number>;
  /** Claimed mission ids */
  missionsClaimed: string[];
  ownedFrames: string[];
  ownedStickerPacks: string[];
  achievementsClaimed: string[];
  dailyMissionDay: string | null;
  /** One-shot sync / economy notices */
  cloudNotice: string | null;
  /** On-chain rCHIP balance (mirrors fun chips via house mint/burn) */
  onchainChips: number | null;
  updateProfile: (newProfile: Partial<UserProfile>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  addChips: (amount: number) => void;
  /**
   * Credit ETH pack purchase: bumps chips + lifetimeChipsBought synchronously,
   * then flushes cloud so merge can't Math.min the deposit away.
   */
  creditPurchasedChips: (amount: number, opts?: { newBalance?: number; lifetimeChipsBought?: number }) => Promise<number>;
  deductChips: (amount: number) => boolean;
  equipCardBack: (id: string) => void;
  equipTableFelt: (id: string) => void;
  equipFrame: (id: string) => void;
  buyCardBack: (id: string, priceChips: number) => boolean;
  buyTableFelt: (id: string, priceChips: number) => boolean;
  buyFrame: (id: string, priceChips: number) => boolean;
  buyStickerPack: (packId: string, priceChips: number) => boolean;
  recordHandResult: (win: boolean, netChips: number, opponentName: string, handName: string) => void;
  startMegapotSession: (mode: "bot" | "friend") => number;
  awardMegapotWin: (opts?: { showdown?: boolean }) => number;
  consumeMegapotCredit: () => boolean;
  markTicketMinted: () => void;
  bumpMission: (id: string, by?: number) => void;
  claimDailyBonus: () => boolean | Promise<boolean>;
  claimMission: (id: string) => boolean;
  claimAchievement: (id: string) => boolean;
  resetProgress: () => void;
  /** Push local progress to cloud immediately (call before logout). */
  flushCloudProgress: () => Promise<void>;
}

const INITIAL_STATS: PlayerStats = {
  handsPlayed: 0,
  gamesWon: 0,
  biggestWin: 0,
  currentStreak: 0,
  totalEarnings: 0,
};

const INITIAL_MATCHES: MatchRecord[] = [];

const INITIAL_PROFILE: UserProfile = {
  displayName: "Player",
  bio: "Building reads one hand at a time.",
  avatarId: "club-runner",
  avatarUrl: null,
  usePresetAvatar: false,
  country: "Global",
  favHand: "A-K suited",
  equippedFrame: "none",
};

const GameContext = createContext<GameContextType | undefined>(undefined);

const LEGACY_STORAGE_KEY = "pi_river_player_state_v1";
const STORAGE_PREFIX = "pi_river_player_state_v2:";
const DAILY_REWARD_COOLDOWN = 24 * 60 * 60 * 1000; // legacy fallback for guests
void DAILY_REWARD_COOLDOWN;

function getTierForXp(totalXp: number, wins = 0) {
  return vipTierForLevel(getPlayerLevel(totalXp, wins));
}

function accountStorageKey(accountKey: string) {
  return `${STORAGE_PREFIX}${accountKey}`;
}

function emptySave() {
  return {
    chips: STARTING_CHIPS,
    xp: 0,
    vipTier: getTierForXp(0),
    equippedCardBack: "classic",
    equippedTableFelt: "green",
    ownedCardBacks: ["classic"] as string[],
    ownedTableFelts: ["green"] as string[],
    lastDailyBonusTime: null as number | null,
    rewardTrackDay: 1,
    stats: { ...INITIAL_STATS },
    matchHistory: [] as MatchRecord[],
    soundEnabled: true,
    musicEnabled: true,
    economyVersion: ECONOMY_VERSION,
    profile: { ...INITIAL_PROFILE },
    megapotCredits: 0,
    ticketsMinted: 0,
    missionProgress: {} as Record<string, number>,
    missionsClaimed: [] as string[],
    ownedFrames: ["none"] as string[],
    ownedStickerPacks: [] as string[],
    achievementsClaimed: [] as string[],
    dailyMissionDay: null as string | null,
  };
}

/** Migrate legacy string chips/time rows into structured MatchRecord. */
function normalizeMatchHistory(raw: unknown): MatchRecord[] {
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  const seen = new Set<string>();
  const out: MatchRecord[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const opponent = typeof r.opponent === "string" ? r.opponent : "Opponent";
    const result = r.result === "win" ? "win" : "loss";
    const hand = typeof r.hand === "string" ? r.hand : "Hand";
    let chipsDelta = 0;
    if (typeof r.chipsDelta === "number" && Number.isFinite(r.chipsDelta)) {
      chipsDelta = Math.trunc(r.chipsDelta);
    } else if (typeof r.chips === "string") {
      const parsed = Number(String(r.chips).replace(/[^0-9.-]/g, ""));
      chipsDelta = Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
    } else if (typeof r.chips === "number" && Number.isFinite(r.chips)) {
      chipsDelta = Math.trunc(r.chips);
    }
    let at = typeof r.at === "number" && r.at > 0 ? r.at : 0;
    if (!at) {
      at = now - (i + 1) * 60_000;
    }
    const key = `${at}|${opponent}|${hand}|${result}|${chipsDelta}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ opponent, result, hand, chipsDelta, at });
    if (out.length >= 20) break;
  }
  return out;
}

function mergeMatchHistory(local: MatchRecord[], remote: MatchRecord[]): MatchRecord[] {
  return normalizeMatchHistory([...remote, ...local]).sort((a, b) => b.at - a.at).slice(0, 20);
}

function mergeSaves(
  primary: ReturnType<typeof emptySave>,
  secondary: ReturnType<typeof emptySave>
): ReturnType<typeof emptySave> {
  const ownedCardBacks = mergeOwnedIds(primary.ownedCardBacks, secondary.ownedCardBacks, ["classic"]);
  const ownedTableFelts = mergeOwnedIds(primary.ownedTableFelts, secondary.ownedTableFelts, ["green"]);
  const ownedFrames = mergeOwnedIds(primary.ownedFrames, secondary.ownedFrames, ["none"]);
  const ownedStickerPacks = mergeOwnedIds(primary.ownedStickerPacks, secondary.ownedStickerPacks, []);
  const equippedCardBack = ownedCardBacks.includes(primary.equippedCardBack)
    ? primary.equippedCardBack
    : ownedCardBacks.includes(secondary.equippedCardBack)
      ? secondary.equippedCardBack
      : ownedCardBacks[0] || "classic";
  const equippedTableFelt = ownedTableFelts.includes(primary.equippedTableFelt)
    ? primary.equippedTableFelt
    : ownedTableFelts.includes(secondary.equippedTableFelt)
      ? secondary.equippedTableFelt
      : ownedTableFelts[0] || "green";
  const primaryFrame = primary.profile?.equippedFrame || "none";
  const secondaryFrame = secondary.profile?.equippedFrame || "none";
  const equippedFrame =
    primaryFrame !== "none" && ownedFrames.includes(primaryFrame)
      ? primaryFrame
      : secondaryFrame !== "none" && ownedFrames.includes(secondaryFrame)
        ? secondaryFrame
        : "none";
  return {
    ...primary,
    chips: mergeChipBalance(primary.chips, secondary.chips, primary, secondary),
    xp: Math.max(primary.xp || 0, secondary.xp || 0),
    ownedCardBacks,
    ownedTableFelts,
    ownedFrames,
    ownedStickerPacks,
    equippedCardBack,
    equippedTableFelt,
    megapotCredits: mergeMegapotCredits(
      primary.megapotCredits || 0,
      secondary.megapotCredits || 0,
      primary.ticketsMinted || 0,
      secondary.ticketsMinted || 0
    ),
    ticketsMinted: Math.max(primary.ticketsMinted || 0, secondary.ticketsMinted || 0),
    stats: mergePlayerStats(primary.stats, secondary.stats),
    matchHistory: mergeMatchHistory(
      normalizeMatchHistory(primary.matchHistory),
      normalizeMatchHistory(secondary.matchHistory)
    ),
    profile: {
      ...primary.profile,
      ...secondary.profile,
      ...primary.profile,
      equippedFrame,
    },
  };
}

function readSave(accountKey: string) {
  try {
    const raw = localStorage.getItem(accountStorageKey(accountKey));
    let primary = raw ? (JSON.parse(raw) as ReturnType<typeof emptySave>) : null;

    // One-time migrate from legacy shared key — then delete so it never seeds other accounts
    if (!primary) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        primary = JSON.parse(legacy) as ReturnType<typeof emptySave>;
        localStorage.setItem(accountStorageKey(accountKey), legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }

    // Fold wallet-only progress into Google once — never overwrite richer Google save
    if (accountKey.startsWith("google:")) {
      const googleId = accountKey.slice("google:".length);
      const wallet = walletForGoogleUser(googleId);
      if (wallet) {
        const walletKey = accountStorageKey(`wallet:${wallet}`);
        const walletRaw = localStorage.getItem(walletKey);
        if (walletRaw) {
          const walletSave = JSON.parse(walletRaw) as ReturnType<typeof emptySave>;
          if (!primary) {
            primary = walletSave;
          } else {
            primary = mergeSaves(primary, walletSave);
          }
          localStorage.setItem(accountStorageKey(accountKey), JSON.stringify(primary));
          localStorage.removeItem(walletKey);
        }
      }
      // Fold guest progress so win rate / history survive first Google login
      const guestRaw = localStorage.getItem(accountStorageKey("guest"));
      if (guestRaw) {
        try {
          const guestSave = JSON.parse(guestRaw) as ReturnType<typeof emptySave>;
          if (!primary) {
            primary = guestSave;
          } else {
            primary = mergeSaves(primary, guestSave);
          }
          localStorage.setItem(accountStorageKey(accountKey), JSON.stringify(primary));
          localStorage.removeItem(accountStorageKey("guest"));
        } catch {
          // ignore bad guest blob
        }
      }
    }

    if (primary) return primary;
  } catch {
    // ignore
  }
  return emptySave();
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [accountKey, setAccountKey] = useState<string>("guest");
  const [chips, setChips] = useState<number>(STARTING_CHIPS);
  const [xp, setXp] = useState<number>(0);
  const [vipTier, setVipTier] = useState<string>(getTierForXp(0));
  const [equippedCardBack, setEquippedCardBack] = useState<string>("classic");
  const [equippedTableFelt, setEquippedTableFelt] = useState<string>("green");
  const [ownedCardBacks, setOwnedCardBacks] = useState<string[]>(["classic"]);
  const [ownedTableFelts, setOwnedTableFelts] = useState<string[]>(["green"]);
  const [lastDailyBonusTime, setLastDailyBonusTime] = useState<number | null>(null);
  const [rewardTrackDay, setRewardTrackDay] = useState<number>(1);
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>(INITIAL_MATCHES);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabledState] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [chainId] = useState<number>(84532);
  const [megapotCredits, setMegapotCredits] = useState(0);
  const [ticketsMinted, setTicketsMinted] = useState(0);
  const [sessionStake, setSessionStake] = useState(1);
  const [missionProgress, setMissionProgress] = useState<Record<string, number>>({});
  const [missionsClaimed, setMissionsClaimed] = useState<string[]>([]);
  const [ownedFrames, setOwnedFrames] = useState<string[]>(["none"]);
  const [ownedStickerPacks, setOwnedStickerPacks] = useState<string[]>([]);
  const [achievementsClaimed, setAchievementsClaimed] = useState<string[]>([]);
  const [dailyMissionDay, setDailyMissionDay] = useState<string | null>(null);
  const [economyVersion, setEconomyVersion] = useState(ECONOMY_VERSION);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [onchainChips, setOnchainChips] = useState<number | null>(null);
  const accountRef = useRef(accountKey);
  accountRef.current = accountKey;
  const syncTimer = useRef<number | null>(null);
  const economyTimer = useRef<number | null>(null);
  const skipNextCloudPush = useRef(false);
  const lastEconomyNotice = useRef(0);
  const latestPayloadRef = useRef<ProgressPayload | null>(null);
  const catchUpTimer = useRef<number | null>(null);
  const [lifetimeChipsBought, setLifetimeChipsBought] = useState(0);
  const snapshotRef = useRef({
    chips: STARTING_CHIPS,
    xp: 0,
    vipTier: getTierForXp(0),
    equippedCardBack: "classic",
    equippedTableFelt: "green",
    ownedCardBacks: ["classic"] as string[],
    ownedTableFelts: ["green"] as string[],
    ownedFrames: ["none"] as string[],
    ownedStickerPacks: [] as string[],
    lastDailyBonusTime: null as number | null,
    rewardTrackDay: 1,
    stats: { ...INITIAL_STATS },
    matchHistory: [] as MatchRecord[],
    soundEnabled: true,
    musicEnabled: true,
    profile: { ...INITIAL_PROFILE },
    megapotCredits: 0,
    ticketsMinted: 0,
    missionProgress: {} as Record<string, number>,
    missionsClaimed: [] as string[],
    achievementsClaimed: [] as string[],
    dailyMissionDay: null as string | null,
    lifetimeChipsBought: 0,
  });

  // Always keep a sync snapshot so logout flush never writes stale owns
  snapshotRef.current = {
    chips,
    xp,
    vipTier,
    equippedCardBack,
    equippedTableFelt,
    ownedCardBacks,
    ownedTableFelts,
    ownedFrames,
    ownedStickerPacks,
    lastDailyBonusTime,
    rewardTrackDay,
    stats,
    matchHistory,
    soundEnabled,
    musicEnabled,
    profile,
    megapotCredits,
    ticketsMinted,
    missionProgress,
    missionsClaimed,
    achievementsClaimed,
    dailyMissionDay,
    lifetimeChipsBought,
  };

  function buildPayloadFromSnapshot(): ProgressPayload {
    const s = snapshotRef.current;
    return {
      chips: s.chips,
      xp: s.xp,
      vipTier: s.vipTier,
      equippedCardBack: s.equippedCardBack,
      equippedTableFelt: s.equippedTableFelt,
      ownedCardBacks: s.ownedCardBacks,
      ownedTableFelts: s.ownedTableFelts,
      lastDailyBonusTime: s.lastDailyBonusTime,
      rewardTrackDay: s.rewardTrackDay,
      stats: s.stats,
      matchHistory: s.matchHistory,
      soundEnabled: s.soundEnabled,
      musicEnabled: s.musicEnabled,
      profile: s.profile,
      megapotCredits: s.megapotCredits,
      ticketsMinted: s.ticketsMinted,
      missionProgress: s.missionProgress,
      missionsClaimed: s.missionsClaimed,
      ownedFrames: s.ownedFrames,
      ownedStickerPacks: s.ownedStickerPacks,
      achievementsClaimed: s.achievementsClaimed,
      dailyMissionDay: s.dailyMissionDay,
      lifetimeChipsBought: Math.max(0, Math.floor(Number(s.lifetimeChipsBought) || 0)),
      economyVersion: ECONOMY_VERSION,
      friends: readFriends(),
    };
  }

  function lockLocalSave(forKey: string) {
    const payload = buildPayloadFromSnapshot();
    latestPayloadRef.current = payload;
    try {
      localStorage.setItem(
        accountStorageKey(forKey),
        JSON.stringify({
          ...payload,
          economyVersion: ECONOMY_VERSION,
        })
      );
    } catch {
      // ignore
    }
    return payload;
  }

  // Resolve Google / wallet account so shop + stats stick per real user
  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    function applyKey(next: string) {
      if (!alive) return;
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
      if (economyTimer.current) window.clearTimeout(economyTimer.current);
      if (catchUpTimer.current) window.clearTimeout(catchUpTimer.current);
      const prev = accountRef.current;
      // Lock Google shop owns to disk before flipping to guest/wallet
      if (prev.startsWith("google:") && next !== prev) {
        lockLocalSave(prev);
      }
      setIsLoaded(false);
      setAccountKey(next);
    }

    async function sync() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      if (data.user?.id) {
        applyKey(`google:${data.user.id}`);
        return;
      }
      const linked = readLinkedIdentity().walletAddress;
      applyKey(linked ? `wallet:${linked.toLowerCase()}` : "guest");
    }

    void sync();
    const { data: sub } = supabase.auth.onAuthStateChange((_e: string, session: { user: { id: string } | null } | null) => {
      if (session?.user?.id) {
        applyKey(`google:${session.user.id}`);
        return;
      }
      const linked = readLinkedIdentity().walletAddress;
      applyKey(linked ? `wallet:${linked.toLowerCase()}` : "guest");
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
    // lockLocalSave reads snapshotRef — stable across mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load this account's save whenever accountKey changes
  useEffect(() => {
    const save = readSave(accountKey);
    const rawChips = typeof save.chips === "number" ? save.chips : STARTING_CHIPS;
    const priorVersion = typeof (save as { economyVersion?: number }).economyVersion === "number"
      ? (save as { economyVersion: number }).economyVersion
      : 0;
    const { chips: cappedChips, capped } = applyVeteranChipCap(rawChips, priorVersion);
    setChips(cappedChips);
    setEconomyVersion(ECONOMY_VERSION);
    if (capped) {
      setCloudNotice("Stack balanced for the new economy — cosmetics kept.");
      window.setTimeout(() => setCloudNotice(null), 4000);
    }
    setXp(typeof save.xp === "number" ? save.xp : 0);
    setEquippedCardBack(save.equippedCardBack || "classic");
    setEquippedTableFelt(save.equippedTableFelt || "green");
    setOwnedCardBacks(
      Array.isArray(save.ownedCardBacks) && save.ownedCardBacks.length
        ? save.ownedCardBacks
        : ["classic"]
    );
    setOwnedTableFelts(
      Array.isArray(save.ownedTableFelts) && save.ownedTableFelts.length
        ? save.ownedTableFelts
        : ["green"]
    );
    setLastDailyBonusTime(save.lastDailyBonusTime ?? null);
    setRewardTrackDay(save.rewardTrackDay || 1);
    {
      const history = normalizeMatchHistory(save.matchHistory);
      const base = save.stats ? { ...INITIAL_STATS, ...save.stats } : { ...INITIAL_STATS };
      const healed = normalizeCareerStats(base, { history });
      setMatchHistory(history);
      setStats(healed);
      setVipTier(save.vipTier || getTierForXp(save.xp || 0, healed.gamesWon));
    }
    setSoundEnabledState(save.soundEnabled !== false);
    sound.sfxEnabled = save.soundEnabled !== false;
    const musicOn = (save as { musicEnabled?: boolean }).musicEnabled !== false;
    setMusicEnabledState(musicOn);
    sound.musicEnabled = musicOn;
    if (musicOn) sound.bindUnlockOnce();
    else sound.stopMusic();
    setProfile({
      ...INITIAL_PROFILE,
      ...(save.profile || {}),
      avatarUrl: save.profile?.avatarUrl ?? null,
      usePresetAvatar: Boolean(save.profile?.usePresetAvatar),
      equippedFrame: resolveFrameId(save.profile?.equippedFrame || "none"),
    });
    setMegapotCredits(typeof save.megapotCredits === "number" ? save.megapotCredits : 0);
    setTicketsMinted(typeof save.ticketsMinted === "number" ? save.ticketsMinted : 0);
    const rolled = applyDailyMissionRollover(
      (save as { dailyMissionDay?: string | null }).dailyMissionDay,
      save.missionProgress && typeof save.missionProgress === "object" ? save.missionProgress : {},
      Array.isArray(save.missionsClaimed) ? save.missionsClaimed : []
    );
    setMissionProgress(rolled.missionProgress);
    setMissionsClaimed(rolled.missionsClaimed);
    setDailyMissionDay(rolled.dailyMissionDay);
    setOwnedFrames(
      Array.isArray((save as { ownedFrames?: string[] }).ownedFrames) &&
        (save as { ownedFrames: string[] }).ownedFrames.length
        ? (save as { ownedFrames: string[] }).ownedFrames
        : ["none"]
    );
    setOwnedStickerPacks(
      Array.isArray((save as { ownedStickerPacks?: string[] }).ownedStickerPacks)
        ? (save as { ownedStickerPacks: string[] }).ownedStickerPacks
        : []
    );
    setAchievementsClaimed(
      Array.isArray((save as { achievementsClaimed?: string[] }).achievementsClaimed)
        ? (save as { achievementsClaimed: string[] }).achievementsClaimed
        : []
    );
    setLifetimeChipsBought(
      Math.max(
        0,
        Math.floor(
          Number(
            (save as { lifetimeChipsBought?: number }).lifetimeChipsBought ||
              (save.profile as { lifetimeChipsBought?: number } | undefined)?.lifetimeChipsBought ||
              0
          )
        )
      )
    );
    setIsLoaded(true);

    // Pull cloud progress for Google accounts (survives device switch)
    if (!accountKey.startsWith("google:")) return;
    let cancelled = false;
    skipNextCloudPush.current = true;
    void (async () => {
      try {
        const res = await fetch("/api/progress");
        const data = (await res.json()) as {
          ok?: boolean;
          progress?: ProgressPayload | null;
          needsMigration?: boolean;
          source?: string;
        };
        if (cancelled || !data.ok || !data.progress) {
          if (data.needsMigration && !data.progress) {
            // Auth metadata sync still works on first save; table is optional for durable ladder
          }
          return;
        }
        const remote = data.progress;
        if (remote.friends?.length) writeFriends(remote.friends);
        const { chips: remoteChips } = applyVeteranChipCap(remote.chips, remote.economyVersion);
        // Prefer snapshot (post-local-load) over stale closure owns from prior account
        setChips((prev) =>
          mergeChipBalance(remoteChips, prev, remote, {
            ...snapshotRef.current,
            lifetimeChipsBought: Math.max(
              snapshotRef.current.lifetimeChipsBought,
              Math.floor(Number(remote.lifetimeChipsBought) || 0)
            ),
          })
        );
        setLifetimeChipsBought((prev) =>
          Math.max(prev, Math.floor(Number(remote.lifetimeChipsBought) || 0))
        );
        setXp((prev) => Math.max(prev, remote.xp || 0));
        setVipTier(remote.vipTier || getTierForXp(remote.xp, remote.stats?.gamesWon));
        setOwnedCardBacks((prev) => {
          const next = mergeOwnedIds(prev, remote.ownedCardBacks, ["classic"]);
          setEquippedCardBack((eq) => {
            const remoteEq = remote.equippedCardBack || "classic";
            if (next.includes(remoteEq)) return remoteEq;
            if (next.includes(eq)) return eq;
            return next[0] || "classic";
          });
          return next;
        });
        setOwnedTableFelts((prev) => {
          const next = mergeOwnedIds(prev, remote.ownedTableFelts, ["green"]);
          setEquippedTableFelt((eq) => {
            const remoteEq = remote.equippedTableFelt || "green";
            if (next.includes(remoteEq)) return remoteEq;
            if (next.includes(eq)) return eq;
            return next[0] || "green";
          });
          return next;
        });
        setOwnedFrames((prev) => {
          const next = mergeOwnedIds(prev, remote.ownedFrames, ["none"]);
          setProfile((p) => {
            const remoteFrame = resolveFrameId(remote.profile?.equippedFrame || "none");
            const localFrame = p.equippedFrame || "none";
            const keepFrame =
              remoteFrame !== "none" && next.includes(remoteFrame)
                ? remoteFrame
                : localFrame !== "none" && next.includes(localFrame)
                  ? localFrame
                  : next.find((id) => id !== "none") || "none";
            return {
              ...INITIAL_PROFILE,
              ...p,
              ...remote.profile,
              avatarUrl: remote.profile?.avatarUrl ?? p.avatarUrl ?? null,
              usePresetAvatar: Boolean(remote.profile?.usePresetAvatar ?? p.usePresetAvatar),
              equippedFrame: keepFrame,
              displayName: remote.profile?.displayName || p.displayName || "Player",
            };
          });
          return next;
        });
        setOwnedStickerPacks((prev) => mergeOwnedIds(prev, remote.ownedStickerPacks, []));
        setLastDailyBonusTime((prev) => {
          const remoteTs = Number(remote.lastDailyBonusTime) || 0;
          const localTs = Number(prev) || 0;
          const max = Math.max(remoteTs, localTs);
          return max > 0 ? max : null;
        });
        setRewardTrackDay((prev) => {
          const remoteTs = Number(remote.lastDailyBonusTime) || 0;
          const localTs = Number(snapshotRef.current.lastDailyBonusTime) || 0;
          if (remoteTs > localTs) return remote.rewardTrackDay || 1;
          if (localTs > remoteTs) return prev || 1;
          return Math.max(prev || 1, remote.rewardTrackDay || 1);
        });
        // Merge (don't replace) so stale/empty cloud never wipes real wins
        setMatchHistory((prev) => {
          const merged = mergeMatchHistory(prev, normalizeMatchHistory(remote.matchHistory));
          setStats((prevStats) =>
            normalizeCareerStats(mergePlayerStats(prevStats, remote.stats || INITIAL_STATS), {
              history: merged,
            })
          );
          return merged;
        });
        setTicketsMinted((prev) => Math.max(prev, remote.ticketsMinted || 0));
        setMegapotCredits((prev) =>
          mergeMegapotCredits(
            remote.megapotCredits || 0,
            prev,
            remote.ticketsMinted || 0,
            snapshotRef.current.ticketsMinted
          )
        );
        setSoundEnabledState(remote.soundEnabled !== false);
        sound.sfxEnabled = remote.soundEnabled !== false;
        setMusicEnabledState(remote.musicEnabled !== false);
        sound.musicEnabled = remote.musicEnabled !== false;
        const mergedClaimed = Array.from(
          new Set([
            ...(snapshotRef.current.missionsClaimed || []),
            ...(remote.missionsClaimed || []),
          ])
        );
        const mergedProgress = {
          ...(remote.missionProgress || {}),
          ...snapshotRef.current.missionProgress,
        };
        // Prefer higher progress per key
        for (const [k, v] of Object.entries(remote.missionProgress || {})) {
          mergedProgress[k] = Math.max(Number(mergedProgress[k]) || 0, Number(v) || 0);
        }
        const rolledRemote = applyDailyMissionRollover(
          remote.dailyMissionDay || snapshotRef.current.dailyMissionDay,
          mergedProgress,
          mergedClaimed
        );
        setMissionProgress(rolledRemote.missionProgress);
        setMissionsClaimed(rolledRemote.missionsClaimed);
        setDailyMissionDay(rolledRemote.dailyMissionDay);
        setAchievementsClaimed((prev) =>
          Array.from(new Set([...(prev || []), ...(remote.achievementsClaimed || [])]))
        );
        setEconomyVersion(ECONOMY_VERSION);
        const src = data.source === "table" ? "cloud" : "account sync";
        setCloudNotice(`Progress synced (${src}).`);
        window.setTimeout(() => setCloudNotice(null), 2500);
      } catch {
        // offline — keep local
      } finally {
        if (catchUpTimer.current) window.clearTimeout(catchUpTimer.current);
        catchUpTimer.current = window.setTimeout(() => {
          skipNextCloudPush.current = false;
          // Catch-up push from live snapshot so owns bought during load still sync
          if (!accountRef.current.startsWith("google:")) return;
          const payload = buildPayloadFromSnapshot();
          latestPayloadRef.current = payload;
          void fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).catch(() => {});
        }, 800);
      }
    })();

    return () => {
      cancelled = true;
      if (catchUpTimer.current) window.clearTimeout(catchUpTimer.current);
    };
  }, [accountKey]);

  // Daily mission UTC rollover
  useEffect(() => {
    if (!isLoaded) return;
    const rolled = applyDailyMissionRollover(dailyMissionDay, missionProgress, missionsClaimed);
    if (rolled.rolled) {
      setDailyMissionDay(rolled.dailyMissionDay);
      setMissionProgress(rolled.missionProgress);
      setMissionsClaimed(rolled.missionsClaimed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Persist to this account only
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const stateToSave = {
        chips,
        xp,
        vipTier,
        equippedCardBack,
        equippedTableFelt,
        ownedCardBacks,
        ownedTableFelts,
        lastDailyBonusTime,
        rewardTrackDay,
        stats,
        matchHistory,
        soundEnabled,
        musicEnabled,
        economyVersion: ECONOMY_VERSION,
        profile,
        megapotCredits,
        ticketsMinted,
        missionProgress,
        missionsClaimed,
        ownedFrames,
        ownedStickerPacks,
        achievementsClaimed,
        dailyMissionDay,
        lifetimeChipsBought,
      };
      localStorage.setItem(accountStorageKey(accountRef.current), JSON.stringify(stateToSave));
    } catch {
      // Ignore
    }

    const cloudPayload: ProgressPayload = {
      chips,
      xp,
      vipTier,
      equippedCardBack,
      equippedTableFelt,
      ownedCardBacks,
      ownedTableFelts,
      lastDailyBonusTime,
      rewardTrackDay,
      stats,
      matchHistory,
      soundEnabled,
      musicEnabled,
      profile,
      megapotCredits,
      ticketsMinted,
      missionProgress,
      missionsClaimed,
      ownedFrames,
      ownedStickerPacks,
      achievementsClaimed,
      dailyMissionDay,
      economyVersion: ECONOMY_VERSION,
      lifetimeChipsBought,
      friends: readFriends(),
    };
    latestPayloadRef.current = cloudPayload;

    if (!accountRef.current.startsWith("google:") || skipNextCloudPush.current) return;
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      const payload = latestPayloadRef.current || cloudPayload;
      void fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});

      // Mirror chips + ladder on-chain (rCHIP + RiverClub)
      if (economyTimer.current) window.clearTimeout(economyTimer.current);
      economyTimer.current = window.setTimeout(() => {
        const googleId = accountRef.current.startsWith("google:")
          ? accountRef.current.slice("google:".length)
          : "";
        if (!googleId) return;
        let playAddress: `0x${string}`;
        try {
          playAddress = getPlayAddress(googleId);
        } catch {
          return;
        }
        void fetch("/api/economy/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playAddress,
            chips: payload.chips,
            displayName: payload.profile.displayName || "Player",
            wins: payload.stats.gamesWon,
            tickets: payload.ticketsMinted,
            totalEarnings: payload.stats.totalEarnings,
          }),
        })
          .then(async (res) => {
            const data = (await res.json()) as {
              ok?: boolean;
              chips?: { balance?: number; minted?: number; needsSelfBurn?: number };
              club?: { ok?: boolean };
            };
            if (!data.ok) return;

            let balance = data.chips?.balance;
            const needBurn = Math.floor(Number(data.chips?.needsSelfBurn) || 0);
            if (needBurn > 0) {
              try {
                const burned = await burnSelfRiverChips(googleId, needBurn);
                if (burned.ok && typeof burned.balance === "number") balance = burned.balance;
              } catch {
                // will retry next sync
              }
            }
            if (typeof balance === "number") setOnchainChips(balance);

            const now = Date.now();
            if (
              ((data.chips?.minted || 0) > 0 || needBurn > 0 || data.club?.ok) &&
              now - lastEconomyNotice.current > 20_000
            ) {
              lastEconomyNotice.current = now;
              setCloudNotice(
                needBurn > 0
                  ? `You burned ${needBurn.toLocaleString()} rCHIP · ladder synced`
                  : data.club?.ok
                    ? `On-chain: ${(balance ?? 0).toLocaleString()} rCHIP · ladder updated`
                    : `On-chain: ${(balance ?? 0).toLocaleString()} rCHIP`
              );
              window.setTimeout(() => setCloudNotice(null), 2800);
            }
          })
          .catch(() => {});
      }, 2200);
    }, 400);
  }, [chips, xp, vipTier, equippedCardBack, equippedTableFelt, ownedCardBacks, ownedTableFelts, lastDailyBonusTime, rewardTrackDay, stats, matchHistory, soundEnabled, musicEnabled, profile, megapotCredits, ticketsMinted, missionProgress, missionsClaimed, ownedFrames, ownedStickerPacks, achievementsClaimed, dailyMissionDay, economyVersion, isLoaded]);

  const updateProfile = (newProfile: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...newProfile }));
    sound.playClick();
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    sound.sfxEnabled = enabled;
  };

  const setMusicEnabled = (enabled: boolean) => {
    setMusicEnabledState(enabled);
    sound.setMusicEnabled(enabled);
    if (enabled) sound.unlock();
  };

  const addChips = (amount: number) => {
    setChips((prev) => prev + amount);
    sound.playWin();
  };

  const addXp = (amount: number) => {
    setXp((prev) => {
      const next = prev + amount;
      setVipTier(getTierForXp(next, stats.gamesWon));
      return next;
    });
  };

  const deductChips = (amount: number): boolean => {
    if (chips < amount) return false;
    setChips((prev) => prev - amount);
    sound.playChip();
    return true;
  };

  const bumpMission = (id: string, by = 1) => {
    setMissionProgress((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + by),
    }));
  };

  const claimMission = (id: string): boolean => {
    const def = MISSIONS.find((m) => m.id === id);
    if (!def) return false;
    if (missionsClaimed.includes(id)) return false;
    if ((missionProgress[id] || 0) < def.target) return false;
    const nextClaimed = missionsClaimed.includes(id) ? missionsClaimed : [...missionsClaimed, id];
    setMissionsClaimed(nextClaimed);
    snapshotRef.current = {
      ...snapshotRef.current,
      missionsClaimed: nextClaimed,
      chips: snapshotRef.current.chips + def.rewardChips,
    };
    setChips((c) => c + def.rewardChips);
    addXp(def.rewardXp);
    sound.playMission();
    window.setTimeout(() => {
      void flushCloudProgress();
    }, 40);
    return true;
  };

  const claimAchievement = (id: string): boolean => {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return false;
    if (achievementsClaimed.includes(id)) return false;
    const progress = achievementProgress(def, stats, ticketsMinted, missionProgress);
    if (progress < def.target) return false;
    const nextClaimed = achievementsClaimed.includes(id)
      ? achievementsClaimed
      : [...achievementsClaimed, id];
    setAchievementsClaimed(nextClaimed);
    snapshotRef.current = {
      ...snapshotRef.current,
      achievementsClaimed: nextClaimed,
      chips: snapshotRef.current.chips + def.rewardChips,
    };
    setChips((c) => c + def.rewardChips);
    addXp(def.rewardXp);
    sound.playMission();
    window.setTimeout(() => {
      void flushCloudProgress();
    }, 40);
    return true;
  };

  const equipCardBack = (id: string) => {
    if (!ownedCardBacks.includes(id)) return;
    setEquippedCardBack(id);
    sound.playEquip();
  };

  const equipTableFelt = (id: string) => {
    if (!ownedTableFelts.includes(id)) return;
    setEquippedTableFelt(id);
    sound.playEquip();
  };

  const equipFrame = (id: string) => {
    if (!ownedFrames.includes(id)) return;
    setProfile((prev) => ({ ...prev, equippedFrame: id }));
    sound.playEquip();
  };

  const buyCardBack = (id: string, priceChips: number): boolean => {
    if (ownedCardBacks.includes(id)) {
      setEquippedCardBack(id);
      sound.playEquip();
      return true;
    }
    if (chips < priceChips) return false;
    const nextOwned = ownedCardBacks.includes(id) ? ownedCardBacks : [...ownedCardBacks, id];
    const nextChips = chips - priceChips;
    setChips(nextChips);
    setOwnedCardBacks(nextOwned);
    setEquippedCardBack(id);
    // Sync snapshot before any logout race / deferred flush
    snapshotRef.current = {
      ...snapshotRef.current,
      chips: nextChips,
      ownedCardBacks: nextOwned,
      equippedCardBack: id,
    };
    addXp(40);
    bumpMission("shop-style");
    sound.playEquip();
    window.setTimeout(() => {
      void flushCloudProgress();
    }, 50);
    return true;
  };

  const buyTableFelt = (id: string, priceChips: number): boolean => {
    if (ownedTableFelts.includes(id)) {
      setEquippedTableFelt(id);
      sound.playEquip();
      return true;
    }
    if (chips < priceChips) return false;
    const nextOwned = ownedTableFelts.includes(id) ? ownedTableFelts : [...ownedTableFelts, id];
    const nextChips = chips - priceChips;
    setChips(nextChips);
    setOwnedTableFelts(nextOwned);
    setEquippedTableFelt(id);
    snapshotRef.current = {
      ...snapshotRef.current,
      chips: nextChips,
      ownedTableFelts: nextOwned,
      equippedTableFelt: id,
    };
    addXp(40);
    bumpMission("shop-style");
    sound.playEquip();
    window.setTimeout(() => {
      void flushCloudProgress();
    }, 50);
    return true;
  };

  const buyFrame = (id: string, priceChips: number): boolean => {
    const resolved = id === "none" ? null : AVATAR_FRAMES.find((f) => f.id === id);
    if (!resolved) return false;
    if (ownedFrames.includes(id)) {
      setProfile((prev) => ({ ...prev, equippedFrame: id }));
      sound.playEquip();
      return true;
    }
    if (chips < priceChips) return false;
    const nextOwned = ownedFrames.includes(id) ? ownedFrames : [...ownedFrames, id];
    const nextChips = chips - priceChips;
    const nextProfile = { ...snapshotRef.current.profile, equippedFrame: id };
    setChips(nextChips);
    setOwnedFrames(nextOwned);
    setProfile((prev) => ({ ...prev, equippedFrame: id }));
    snapshotRef.current = {
      ...snapshotRef.current,
      chips: nextChips,
      ownedFrames: nextOwned,
      profile: nextProfile,
    };
    addXp(50);
    bumpMission("shop-style");
    sound.playEquip();
    // Push cloud ASAP so logout never races a deferred sync
    window.setTimeout(() => {
      void flushCloudProgress();
    }, 50);
    return true;
  };

  const buyStickerPack = (packId: string, priceChips: number): boolean => {
    if (!packById(packId)) return false;
    if (ownedStickerPacks.includes(packId)) return true;
    if (chips < priceChips) return false;
    const nextOwned = ownedStickerPacks.includes(packId)
      ? ownedStickerPacks
      : [...ownedStickerPacks, packId];
    const nextChips = chips - priceChips;
    setChips(nextChips);
    setOwnedStickerPacks(nextOwned);
    snapshotRef.current = {
      ...snapshotRef.current,
      chips: nextChips,
      ownedStickerPacks: nextOwned,
    };
    bumpMission("shop-style");
    addXp(45);
    sound.playEquip();
    window.setTimeout(() => {
      void flushCloudProgress();
    }, 50);
    return true;
  };

  const claimDailyBonus = (): boolean | Promise<boolean> => {
    if (alreadyClaimedDailyBonusToday(lastDailyBonusTime)) {
      return false;
    }

    // Google accounts: server is source of truth (blocks logout→login re-claim)
    if (accountRef.current.startsWith("google:")) {
      return (async () => {
        try {
          const res = await fetch("/api/rewards/daily", {
            method: "POST",
            credentials: "include",
          });
          const data = (await res.json()) as {
            ok?: boolean;
            alreadyClaimed?: boolean;
            chips?: number;
            xp?: number;
            megapotCredits?: number;
            lastDailyBonusTime?: number;
            rewardTrackDay?: number;
            vipTier?: string;
            chipsGranted?: number;
            xpGranted?: number;
          };
          if (!res.ok || !data.ok) {
            if (data.alreadyClaimed && data.lastDailyBonusTime) {
              setLastDailyBonusTime(data.lastDailyBonusTime);
              if (data.rewardTrackDay) setRewardTrackDay(data.rewardTrackDay);
            }
            return false;
          }
          if (typeof data.chips === "number") setChips(data.chips);
          if (typeof data.xp === "number") setXp(data.xp);
          if (typeof data.megapotCredits === "number") setMegapotCredits(data.megapotCredits);
          if (typeof data.lastDailyBonusTime === "number") {
            setLastDailyBonusTime(data.lastDailyBonusTime);
          }
          if (typeof data.rewardTrackDay === "number") setRewardTrackDay(data.rewardTrackDay);
          if (data.vipTier) setVipTier(data.vipTier);
          snapshotRef.current = {
            ...snapshotRef.current,
            chips: typeof data.chips === "number" ? data.chips : snapshotRef.current.chips,
            xp: typeof data.xp === "number" ? data.xp : snapshotRef.current.xp,
            megapotCredits:
              typeof data.megapotCredits === "number"
                ? data.megapotCredits
                : snapshotRef.current.megapotCredits,
            lastDailyBonusTime: data.lastDailyBonusTime ?? Date.now(),
            rewardTrackDay: data.rewardTrackDay ?? snapshotRef.current.rewardTrackDay,
          };
          sound.playWin();
          void flushCloudProgress();
          return true;
        } catch {
          return false;
        }
      })();
    }

    // Guest / wallet local fallback (UTC day)
    const now = Date.now();
    const reward = dailyRewardForDay(rewardTrackDay);
    setLastDailyBonusTime(now);
    setRewardTrackDay((prev) => (prev >= 16 ? 1 : prev + 1));
    addChips(reward.chips);
    addXp(reward.xp);
    setMegapotCredits((c) => c + 1);
    sound.playWin();
    return true;
  };

  const startMegapotSession = (mode: "bot" | "friend") => {
    const stake = mode === "friend" ? 2 : 1;
    setSessionStake(stake);
    return stake;
  };

  const awardMegapotWin = (opts?: { showdown?: boolean }) => {
    // Base stake (+1 showdown). Streak bonus when this win continues a streak.
    const bonus = (opts?.showdown ? 1 : 0) + (stats.currentStreak >= 1 ? 1 : 0);
    const gained = sessionStake + bonus;
    setMegapotCredits((c) => c + gained);
    sound.playWin();
    return gained;
  };

  const consumeMegapotCredit = () => {
    if (megapotCredits <= 0) return false;
    setMegapotCredits((c) => Math.max(0, c - 1));
    return true;
  };

  const markTicketMinted = () => {
    setTicketsMinted((n) => n + 1);
    bumpMission("claim-ticket");
  };

  const recordHandResult = (
    win: boolean,
    netChips: number,
    opponentName: string,
    handName: string
  ) => {
    const ledger = Math.trunc(netChips);
    if (win) {
      addChips(Math.max(0, ledger));
    } else if (ledger < 0) {
      setChips((prev) => Math.max(0, prev + ledger));
    }

    const xpGain = xpFromHand(win, Math.abs(ledger) || (win ? 800 : 400));
    const oldLevel = getPlayerLevel(xp, stats.gamesWon);
    const nextWins = win ? stats.gamesWon + 1 : stats.gamesWon;
    const nextStats = {
      handsPlayed: Math.max(stats.handsPlayed + 1, nextWins),
      gamesWon: nextWins,
      biggestWin: win ? Math.max(stats.biggestWin, Math.max(0, ledger)) : stats.biggestWin,
      currentStreak: win ? stats.currentStreak + 1 : 0,
      totalEarnings: win ? stats.totalEarnings + Math.max(0, ledger) : stats.totalEarnings,
    };
    const nextHistory: MatchRecord[] = [
      {
        opponent: opponentName,
        result: win ? "win" : "loss",
        hand: handName,
        chipsDelta: win ? Math.max(0, ledger) : Math.min(0, ledger),
        at: Date.now(),
      },
      ...matchHistory.slice(0, 19),
    ];
    // Lock stats into snapshot before logout can flush a stale payload
    snapshotRef.current = {
      ...snapshotRef.current,
      stats: nextStats,
      matchHistory: nextHistory,
      xp: xp + xpGain,
      vipTier: getTierForXp(xp + xpGain, nextWins),
    };
    setStats(nextStats);
    setMatchHistory(nextHistory);

    setMissionProgress((prev) => {
      const next = { ...prev };
      next["first-hand"] = Math.max(next["first-hand"] || 0, 1);
      next["play-three"] = (next["play-three"] || 0) + 1;
      next["daily-hands"] = (next["daily-hands"] || 0) + 1;
      if (/showdown/i.test(handName)) {
        next["showdowns"] = (next["showdowns"] || 0) + 1;
        next["daily-showdown"] = Math.max(next["daily-showdown"] || 0, 1);
      }
      if (win) {
        next["win-one"] = Math.max(next["win-one"] || 0, 1);
        next["daily-win"] = Math.max(next["daily-win"] || 0, 1);
        next["streak-two"] = Math.max(next["streak-two"] || 0, stats.currentStreak + 1);
      } else {
        next["streak-two"] = 0;
      }
      return next;
    });

    addXp(xpGain);
    setVipTier(getTierForXp(xp + xpGain, nextWins));
    if (getPlayerLevel(xp + xpGain, nextWins) > oldLevel) {
      window.setTimeout(() => sound.playLevelUp(), 180);
    }
  };

  const flushCloudProgress = async () => {
    if (!accountRef.current.startsWith("google:")) return;
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    skipNextCloudPush.current = false;
    // Always use live snapshot — never a stale latestPayloadRef from before a buy
    const payload = buildPayloadFromSnapshot();
    latestPayloadRef.current = payload;
    lockLocalSave(accountRef.current);
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // offline — local save already written
    }
  };

  const creditPurchasedChips = async (
    amount: number,
    opts?: { newBalance?: number; lifetimeChipsBought?: number }
  ): Promise<number> => {
    const grant = Math.max(0, Math.floor(Number(amount) || 0));
    const prevChips = snapshotRef.current.chips;
    const prevBought = snapshotRef.current.lifetimeChipsBought;
    const nextBought = Math.max(
      prevBought + grant,
      Math.floor(Number(opts?.lifetimeChipsBought) || 0)
    );
    const serverBal =
      typeof opts?.newBalance === "number" && Number.isFinite(opts.newBalance)
        ? Math.floor(opts.newBalance)
        : 0;
    const nextChips = Math.max(prevChips + grant, serverBal, prevChips);

    snapshotRef.current = {
      ...snapshotRef.current,
      chips: nextChips,
      lifetimeChipsBought: nextBought,
    };
    setChips(nextChips);
    setLifetimeChipsBought(nextBought);
    sound.playWin();
    await flushCloudProgress();
    return nextChips;
  };

  const resetProgress = () => {
    setChips(STARTING_CHIPS);
    setXp(0);
    setVipTier(getTierForXp(0));
    setEquippedCardBack("classic");
    setEquippedTableFelt("green");
    setOwnedCardBacks(["classic"]);
    setOwnedTableFelts(["green"]);
    setLastDailyBonusTime(null);
    setRewardTrackDay(1);
    setStats(INITIAL_STATS);
    setMatchHistory(INITIAL_MATCHES);
    setProfile(INITIAL_PROFILE);
    setMegapotCredits(0);
    setTicketsMinted(0);
    setSessionStake(1);
    setMissionProgress({});
    setMissionsClaimed([]);
    setOwnedFrames(["none"]);
    setOwnedStickerPacks([]);
    setAchievementsClaimed([]);
    setLifetimeChipsBought(0);
    setDailyMissionDay(null);
    try {
      localStorage.removeItem(accountStorageKey(accountRef.current));
    } catch {
      // ignore
    }
  };

  return (
    <GameContext.Provider
      value={{
        chips,
        xp,
        vipTier,
        equippedCardBack,
        equippedTableFelt,
        ownedCardBacks,
        ownedTableFelts,
        lastDailyBonusTime,
        rewardTrackDay,
        stats,
        matchHistory,
        soundEnabled,
        musicEnabled,
        profile,
        chainId,
        megapotCredits,
        ticketsMinted,
        sessionStake,
        missionProgress,
        missionsClaimed,
        ownedFrames,
        ownedStickerPacks,
        achievementsClaimed,
        dailyMissionDay,
        cloudNotice,
        onchainChips,
        updateProfile,
        setSoundEnabled,
        setMusicEnabled,
        addChips,
        creditPurchasedChips,
        deductChips,
        equipCardBack,
        equipTableFelt,
        equipFrame,
        buyCardBack,
        buyTableFelt,
        buyFrame,
        buyStickerPack,
        claimDailyBonus,
        recordHandResult,
        startMegapotSession,
        awardMegapotWin,
        consumeMegapotCredit,
        markTicketMinted,
        bumpMission,
        claimMission,
        claimAchievement,
        resetProgress,
        flushCloudProgress,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return ctx;
}
