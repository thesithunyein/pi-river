"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { sound } from "@/lib/sound";

export interface UserProfile {
  displayName: string;
  bio: string;
  avatarId: string;
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
  { id: "cyber-fox", name: "Cyber Fox", emoji: "🦊", bgGradient: "from-cyan-500 to-blue-700", borderColor: "border-cyan-400", description: "Sly, fast bluff master" },
  { id: "poker-cat", name: "Poker Cat", emoji: "🐱", bgGradient: "from-amber-400 to-yellow-600", borderColor: "border-yellow-300", description: "Lucky paws & golden whiskers" },
  { id: "shark-king", name: "Neon Shark", emoji: "🦈", bgGradient: "from-blue-600 to-indigo-900", borderColor: "border-indigo-400", description: "High roller table predator" },
  { id: "panda-boss", name: "Golden Panda", emoji: "🐼", bgGradient: "from-emerald-500 to-teal-800", borderColor: "border-emerald-400", description: "Calm, strategic chip stacked boss" },
  { id: "shadow-ninja", name: "Shadow Ninja", emoji: "🥷", bgGradient: "from-purple-600 to-violet-950", borderColor: "border-purple-400", description: "Silent killer with encrypted hands" },
  { id: "crypto-ape", name: "Crypto Ape", emoji: "🦍", bgGradient: "from-rose-500 to-red-800", borderColor: "border-rose-400", description: "All-in diamond hands king" },
];

export interface MissionItem {
  id: number;
  icon: string;
  title: string;
  rewardChips: number;
  rewardXP: number;
  rewardText: string;
  progress: number; // 0 to 100
  completed: boolean;
  claimed: boolean;
}

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
  missions: MissionItem[];
  stats: PlayerStats;
  matchHistory: MatchRecord[];
  soundEnabled: boolean;
  profile: UserProfile;
  walletAddress: string | null;
  isWalletConnected: boolean;
  chainId: string | null;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  switchNetworkToInco: () => Promise<void>;
  updateProfile: (newProfile: Partial<UserProfile>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  addChips: (amount: number) => void;
  deductChips: (amount: number) => boolean;
  equipCardBack: (id: string) => void;
  equipTableFelt: (id: string) => void;
  buyCardBack: (id: string, priceChips: number) => boolean;
  buyTableFelt: (id: string, priceChips: number) => boolean;
  claimMission: (id: number) => boolean;
  claimDailyBonus: () => boolean;
  recordHandResult: (win: boolean, netChips: number, opponentName: string, handName: string) => void;
  resetProgress: () => void;
}

const INITIAL_MISSIONS: MissionItem[] = [
  { id: 1, icon: "🃏", title: "Play 10 hands of Texas Hold'em", rewardChips: 20000, rewardXP: 500, rewardText: "+500 XP · +20,000 chips", progress: 0, completed: false, claimed: false },
  { id: 2, icon: "🔥", title: "Win 3 hands in a row", rewardChips: 50000, rewardXP: 1000, rewardText: "+1,000 XP · Streak x2", progress: 0, completed: false, claimed: false },
  { id: 3, icon: "🛍", title: "Equip or purchase a Card Back", rewardChips: 15000, rewardXP: 300, rewardText: "+300 XP · Exclusive card back", progress: 0, completed: false, claimed: false },
  { id: 4, icon: "👑", title: "Reach Gold tier this week", rewardChips: 100000, rewardXP: 2500, rewardText: "VIP chest · 100,000 chips", progress: 0, completed: false, claimed: false },
  { id: 5, icon: "🎁", title: "Claim Daily Chip Bonus", rewardChips: 50000, rewardXP: 500, rewardText: "Trophy · 50,000 chips", progress: 0, completed: false, claimed: false },
];

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
  bio: "Inco FHE Onchain Poker player 🃏",
  avatarId: "cyber-fox",
  country: "🌐 Global",
  favHand: "A♠ K♠ Ace King Suited",
};

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_KEY = "river_poker_player_state_v1";

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [chips, setChips] = useState<number>(50000);
  const [xp, setXp] = useState<number>(0);
  const [vipTier, setVipTier] = useState<string>("Bronze");
  const [equippedCardBack, setEquippedCardBack] = useState<string>("classic");
  const [equippedTableFelt, setEquippedTableFelt] = useState<string>("green");
  const [ownedCardBacks, setOwnedCardBacks] = useState<string[]>(["classic"]);
  const [ownedTableFelts, setOwnedTableFelts] = useState<string[]>(["green"]);
  const [lastDailyBonusTime, setLastDailyBonusTime] = useState<number | null>(null);
  const [missions, setMissions] = useState<MissionItem[]>(INITIAL_MISSIONS);
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>(INITIAL_MATCHES);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>("0x2105"); // Default Inco Gentry testnet
  const [isLoaded, setIsLoaded] = useState(false);

  // MetaMask wallet connect
  const connectWallet = async (): Promise<boolean> => {
    sound.playClick();
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts && accounts[0]) {
          setWalletAddress(accounts[0]);
          const currentChain = await (window as any).ethereum.request({ method: "eth_chainId" });
          setChainId(currentChain);
          sound.playWin();
          return true;
        }
      } catch (err) {
        console.warn("Wallet connection rejected:", err);
      }
    }
    // Fallback: Generate demo Web3 wallet address if no extension present
    const demoAddr = "0x71C" + Math.random().toString(16).substring(2, 8).toUpperCase() + "4F89";
    setWalletAddress(demoAddr);
    sound.playWin();
    return true;
  };

  const disconnectWallet = () => {
    sound.playClick();
    setWalletAddress(null);
  };

  const switchNetworkToInco = async () => {
    sound.playClick();
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x2105",
              chainName: "Inco Gentry Testnet",
              rpcUrls: ["https://gentry.inco.org"],
              nativeCurrency: { name: "INCO", symbol: "INCO", decimals: 18 },
              blockExplorerUrls: ["https://explorer.gentry.inco.org"],
            },
          ],
        });
        setChainId("0x2105");
      } catch {
        setChainId("0x2105");
      }
    } else {
      setChainId("0x2105");
    }
  };

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
        if (parsed.missions) setMissions(parsed.missions);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.matchHistory) setMatchHistory(parsed.matchHistory);
        if (parsed.profile) setProfile((prev) => ({ ...prev, ...parsed.profile }));
        if (parsed.soundEnabled !== undefined) {
          setSoundEnabledState(parsed.soundEnabled);
          sound.enabled = parsed.soundEnabled;
        }
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
        missions,
        stats,
        matchHistory,
        soundEnabled,
        profile,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {
      // Ignore
    }
  }, [chips, xp, vipTier, equippedCardBack, equippedTableFelt, ownedCardBacks, ownedTableFelts, lastDailyBonusTime, missions, stats, matchHistory, soundEnabled, profile, isLoaded]);

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
      sound.playWin();
      return true;
    }
    return false;
  };

  const claimMission = (id: number): boolean => {
    const target = missions.find((m) => m.id === id);
    if (!target || target.claimed || target.progress < 100) return false;

    setMissions((prev) =>
      prev.map((m) => (m.id === id ? { ...m, claimed: true, completed: true } : m))
    );
    addChips(target.rewardChips);
    setXp((prev) => prev + target.rewardXP);
    sound.playWin();
    return true;
  };

  const claimDailyBonus = (): boolean => {
    const now = Date.now();
    const COOLDOWN = 24 * 60 * 60 * 1000;
    if (lastDailyBonusTime && now - lastDailyBonusTime < COOLDOWN) {
      return false;
    }

    setLastDailyBonusTime(now);
    addChips(100000);
    setXp((prev) => prev + 1000);

    // Update mission #5 if present
    setMissions((prev) =>
      prev.map((m) => (m.id === 5 ? { ...m, progress: 100, completed: true } : m))
    );

    sound.playWin();
    return true;
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

    // Add match history item
    const newMatch: MatchRecord = {
      opponent: opponentName,
      result: win ? "win" : "loss",
      hand: handName,
      chips: win ? `+${netChips.toLocaleString()}` : `${netChips.toLocaleString()}`,
      time: "Just now",
    };

    setMatchHistory((prev) => [newMatch, ...prev.slice(0, 9)]);

    // Increment mission progress
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === 1 && m.progress < 100) {
          const nextProg = Math.min(100, m.progress + 10);
          return { ...m, progress: nextProg, completed: nextProg >= 100 };
        }
        if (m.id === 2 && win && m.progress < 100) {
          const nextProg = Math.min(100, m.progress + 34);
          return { ...m, progress: nextProg, completed: nextProg >= 100 };
        }
        return m;
      })
    );
  };

  const resetProgress = () => {
    setChips(50000);
    setXp(0);
    setVipTier("Bronze");
    setMissions(INITIAL_MISSIONS);
    setStats(INITIAL_STATS);
    setMatchHistory(INITIAL_MATCHES);
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
        missions,
        stats,
        matchHistory,
        soundEnabled,
        profile,
        walletAddress,
        isWalletConnected: !!walletAddress,
        chainId,
        connectWallet,
        disconnectWallet,
        switchNetworkToInco,
        updateProfile,
        setSoundEnabled,
        addChips,
        deductChips,
        equipCardBack,
        equipTableFelt,
        buyCardBack,
        buyTableFelt,
        claimMission,
        claimDailyBonus,
        recordHandResult,
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
