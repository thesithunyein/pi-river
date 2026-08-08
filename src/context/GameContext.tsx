"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sound } from "@/lib/sound";

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

const STORAGE_KEY = "pi_river_player_state_v1";
const DAILY_REWARD_COOLDOWN = 24 * 60 * 60 * 1000;

function getTierForXp(totalXp: number) {
  if (totalXp >= 12000) return "Diamond";
  if (totalXp >= 7000) return "Gold";
  if (totalXp >= 3000) return "Silver";
  return "Bronze";
}

export function GameProvider({ children }: { children: React.ReactNode }) {
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

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chips !== undefined) setChips(parsed.chips);
        if (parsed.xp !== undefined) setXp(parsed.xp);
        if (parsed.vipTier) setVipTier(parsed.vipTier);
        if (parsed.equippedCardBack) setEquippedCardBack(parsed.equippedCardBack);
        if (parsed.equippedTableFelt) setEquippedTableFelt(parsed.equippedTableFelt);
        if (parsed.ownedCardBacks) setOwnedCardBacks(parsed.ownedCardBacks);
        if (parsed.ownedTableFelts) setOwnedTableFelts(parsed.ownedTableFelts);
        if (parsed.lastDailyBonusTime) setLastDailyBonusTime(parsed.lastDailyBonusTime);
        if (parsed.rewardTrackDay) setRewardTrackDay(parsed.rewardTrackDay);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.matchHistory) setMatchHistory(parsed.matchHistory);
        if (parsed.profile) {
          setProfile((prev) => ({
            ...prev,
            ...parsed.profile,
            avatarUrl: parsed.profile.avatarUrl ?? prev.avatarUrl ?? null,
            usePresetAvatar: Boolean(parsed.profile.usePresetAvatar),
          }));
        }
        if (parsed.xp !== undefined) setVipTier(getTierForXp(parsed.xp));
        if (parsed.soundEnabled !== undefined) {
          setSoundEnabledState(parsed.soundEnabled);
          sound.enabled = parsed.soundEnabled;
        }
        if (typeof parsed.megapotCredits === "number") setMegapotCredits(parsed.megapotCredits);
        if (typeof parsed.ticketsMinted === "number") setTicketsMinted(parsed.ticketsMinted);
      }
    } catch {
      // Ignore fallback
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage on changes
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
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
    if (ownedCardBacks.includes(id)) {
      setEquippedCardBack(id);
      sound.playClick();
    }
  };

  const equipTableFelt = (id: string) => {
    if (ownedTableFelts.includes(id)) {
      setEquippedTableFelt(id);
      sound.playClick();
    }
  };

  const buyCardBack = (id: string, priceChips: number): boolean => {
    if (ownedCardBacks.includes(id)) {
      equipCardBack(id);
      return true;
    }
    if (deductChips(priceChips)) {
      setOwnedCardBacks((prev) => [...prev, id]);
      setEquippedCardBack(id);
      addXp(120);
      sound.playWin();
      return true;
    }
    return false;
  };

  const buyTableFelt = (id: string, priceChips: number): boolean => {
    if (ownedTableFelts.includes(id)) {
      equipTableFelt(id);
      return true;
    }
    if (deductChips(priceChips)) {
      setOwnedTableFelts((prev) => [...prev, id]);
      setEquippedTableFelt(id);
      addXp(120);
      sound.playWin();
      return true;
    }
    return false;
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
    localStorage.removeItem(STORAGE_KEY);
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
