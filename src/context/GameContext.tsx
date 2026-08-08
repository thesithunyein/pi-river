"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { sound } from "@/lib/sound";
import { createClient } from "@/lib/supabase/client";
import { readLinkedIdentity } from "@/lib/identity";

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
    description: "Speedy fox who loves early pots",
  },
  {
    id: "gold-stack",
    name: "Gold Stack",
    emoji: "🪙",
    bgGradient: "from-amber-300 to-yellow-600",
    borderColor: "border-yellow-300",
    description: "Chip-crowned value hunter",
  },
  {
    id: "night-bluff",
    name: "Night Bluff",
    emoji: "🥷",
    bgGradient: "from-indigo-500 to-violet-900",
    borderColor: "border-indigo-300",
    description: "Hooded midnight bluffer",
  },
  {
    id: "felt-core",
    name: "Felt Core",
    emoji: "🐼",
    bgGradient: "from-emerald-400 to-teal-800",
    borderColor: "border-emerald-300",
    description: "Calm green-table panda",
  },
  {
    id: "violet-read",
    name: "Violet Read",
    emoji: "🦉",
    bgGradient: "from-purple-400 to-violet-900",
    borderColor: "border-purple-300",
    description: "Big-eyed read specialist",
  },
  {
    id: "river-ace",
    name: "River Ace",
    emoji: "🦈",
    bgGradient: "from-rose-400 to-red-800",
    borderColor: "border-rose-300",
    description: "Ace-finishing river shark",
  },
];

export interface MatchRecord {
  opponent: string;
  result: "win" | "loss";
  hand: string;
  chips: string;
  time: string;
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
  profile: UserProfile;
  chainId: number;
  /** Unclaimed Megapot ticket credits earned from sealed river play */
  megapotCredits: number;
  ticketsMinted: number;
  sessionStake: number;
  updateProfile: (newProfile: Partial<UserProfile>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  addChips: (amount: number) => void;
  deductChips: (amount: number) => boolean;
  equipCardBack: (id: string) => void;
  equipTableFelt: (id: string) => void;
  buyCardBack: (id: string, priceChips: number) => boolean;
  buyTableFelt: (id: string, priceChips: number) => boolean;
  claimDailyBonus: () => boolean;
  recordHandResult: (win: boolean, netChips: number, opponentName: string, handName: string) => void;
  startMegapotSession: (mode: "bot" | "friend") => number;
  awardMegapotWin: (opts?: { showdown?: boolean }) => number;
  consumeMegapotCredit: () => boolean;
  markTicketMinted: () => void;
  resetProgress: () => void;
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
};

const GameContext = createContext<GameContextType | undefined>(undefined);

const LEGACY_STORAGE_KEY = "pi_river_player_state_v1";
const STORAGE_PREFIX = "pi_river_player_state_v2:";
const DAILY_REWARD_COOLDOWN = 24 * 60 * 60 * 1000;

function getTierForXp(totalXp: number) {
  if (totalXp >= 12000) return "Diamond";
  if (totalXp >= 7000) return "Gold";
  if (totalXp >= 3000) return "Silver";
  return "Bronze";
}

function accountStorageKey(accountKey: string) {
  return `${STORAGE_PREFIX}${accountKey}`;
}

function emptySave() {
  return {
    chips: 50000,
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
    profile: { ...INITIAL_PROFILE },
    megapotCredits: 0,
    ticketsMinted: 0,
  };
}

function readSave(accountKey: string) {
  try {
    const raw = localStorage.getItem(accountStorageKey(accountKey));
    if (raw) return JSON.parse(raw) as ReturnType<typeof emptySave>;

    // One-time migrate from legacy shared key into this account
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as ReturnType<typeof emptySave>;
      localStorage.setItem(accountStorageKey(accountKey), legacy);
      return parsed;
    }
  } catch {
    // ignore
  }
  return emptySave();
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [accountKey, setAccountKey] = useState<string>("guest");
  const [chips, setChips] = useState<number>(50000);
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
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [chainId] = useState<number>(84532);
  const [megapotCredits, setMegapotCredits] = useState(0);
  const [ticketsMinted, setTicketsMinted] = useState(0);
  const [sessionStake, setSessionStake] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const accountRef = useRef(accountKey);
  accountRef.current = accountKey;

  // Resolve Google / wallet account so shop + stats stick per real user
  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    function applyKey(next: string) {
      if (!alive) return;
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
  }, []);

  // Load this account's save whenever accountKey changes
  useEffect(() => {
    const save = readSave(accountKey);
    setChips(typeof save.chips === "number" ? save.chips : 50000);
    setXp(typeof save.xp === "number" ? save.xp : 0);
    setVipTier(save.vipTier || getTierForXp(save.xp || 0));
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
    setStats(save.stats ? { ...INITIAL_STATS, ...save.stats } : INITIAL_STATS);
    setMatchHistory(Array.isArray(save.matchHistory) ? save.matchHistory : []);
    setSoundEnabledState(save.soundEnabled !== false);
    sound.enabled = save.soundEnabled !== false;
    setProfile({
      ...INITIAL_PROFILE,
      ...(save.profile || {}),
      avatarUrl: save.profile?.avatarUrl ?? null,
      usePresetAvatar: Boolean(save.profile?.usePresetAvatar),
    });
    setMegapotCredits(typeof save.megapotCredits === "number" ? save.megapotCredits : 0);
    setTicketsMinted(typeof save.ticketsMinted === "number" ? save.ticketsMinted : 0);
    setIsLoaded(true);
  }, [accountKey]);

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
        profile,
        megapotCredits,
        ticketsMinted,
      };
      localStorage.setItem(accountStorageKey(accountRef.current), JSON.stringify(stateToSave));
    } catch {
      // Ignore
    }
  }, [chips, xp, vipTier, equippedCardBack, equippedTableFelt, ownedCardBacks, ownedTableFelts, lastDailyBonusTime, rewardTrackDay, stats, matchHistory, soundEnabled, profile, megapotCredits, ticketsMinted, isLoaded]);

  const updateProfile = (newProfile: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...newProfile }));
    sound.playClick();
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    sound.enabled = enabled;
  };

  const addChips = (amount: number) => {
    setChips((prev) => prev + amount);
    sound.playWin();
  };

  const addXp = (amount: number) => {
    setXp((prev) => {
      const next = prev + amount;
      setVipTier(getTierForXp(next));
      return next;
    });
  };

  const deductChips = (amount: number): boolean => {
    if (chips < amount) return false;
    setChips((prev) => prev - amount);
    sound.playChip();
    return true;
  };

  const equipCardBack = (id: string) => {
    if (!ownedCardBacks.includes(id)) return;
    setEquippedCardBack(id);
    sound.playClick();
  };

  const equipTableFelt = (id: string) => {
    if (!ownedTableFelts.includes(id)) return;
    setEquippedTableFelt(id);
    sound.playClick();
  };

  const buyCardBack = (id: string, priceChips: number): boolean => {
    if (ownedCardBacks.includes(id)) {
      setEquippedCardBack(id);
      sound.playClick();
      return true;
    }
    if (chips < priceChips) return false;
    setChips((prev) => prev - priceChips);
    setOwnedCardBacks((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setEquippedCardBack(id);
    addXp(120);
    sound.playWin();
    return true;
  };

  const buyTableFelt = (id: string, priceChips: number): boolean => {
    if (ownedTableFelts.includes(id)) {
      setEquippedTableFelt(id);
      sound.playClick();
      return true;
    }
    if (chips < priceChips) return false;
    setChips((prev) => prev - priceChips);
    setOwnedTableFelts((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setEquippedTableFelt(id);
    addXp(120);
    sound.playWin();
    return true;
  };

  const claimDailyBonus = (): boolean => {
    const now = Date.now();
    if (lastDailyBonusTime && now - lastDailyBonusTime < DAILY_REWARD_COOLDOWN) {
      return false;
    }

    setLastDailyBonusTime(now);
    setRewardTrackDay((prev) => (prev >= 16 ? 1 : prev + 1));
    addChips(100000);
    addXp(1000);
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
    const bonus = opts?.showdown ? 1 : 0;
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
  };

  const recordHandResult = (
    win: boolean,
    netChips: number,
    opponentName: string,
    handName: string
  ) => {
    if (win) {
      addChips(netChips);
    } else if (netChips < 0) {
      setChips((prev) => Math.max(0, prev + netChips));
    }

    // Update player stats
    setStats((prev) => {
      const newStreak = win ? prev.currentStreak + 1 : 0;
      const newHandsPlayed = prev.handsPlayed + 1;
      const newGamesWon = win ? prev.gamesWon + 1 : prev.gamesWon;
      const newBiggestWin = win ? Math.max(prev.biggestWin, netChips) : prev.biggestWin;
      const newTotal = win ? prev.totalEarnings + netChips : prev.totalEarnings;
      return {
        handsPlayed: newHandsPlayed,
        gamesWon: newGamesWon,
        biggestWin: newBiggestWin,
        currentStreak: newStreak,
        totalEarnings: newTotal,
      };
    });

    addXp(win ? 240 : 80);

    // Add match history item
    const newMatch: MatchRecord = {
      opponent: opponentName,
      result: win ? "win" : "loss",
      hand: handName,
      chips: win ? `+${netChips.toLocaleString()}` : `${netChips.toLocaleString()}`,
      time: "Just now",
    };

    setMatchHistory((prev) => [newMatch, ...prev.slice(0, 9)]);
  };

  const resetProgress = () => {
    setChips(50000);
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
        profile,
        chainId,
        megapotCredits,
        ticketsMinted,
        sessionStake,
        updateProfile,
        setSoundEnabled,
        addChips,
        deductChips,
        equipCardBack,
        equipTableFelt,
        buyCardBack,
        buyTableFelt,
        claimDailyBonus,
        recordHandResult,
        startMegapotSession,
        awardMegapotWin,
        consumeMegapotCredit,
        markTicketMinted,
        resetProgress,
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
