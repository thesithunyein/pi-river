"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { sound } from "@/lib/sound";
import { createClient } from "@/lib/supabase/client";
import { readLinkedIdentity } from "@/lib/identity";
import { MISSIONS, getPlayerLevel } from "@/lib/missions";
import { dailyRewardForDay, STARTING_CHIPS, vipTierForLevel, xpFromHand } from "@/lib/progression";
import {
  applyVeteranChipCap,
  ECONOMY_VERSION,
  type ProgressPayload,
} from "@/lib/progressSync";
import { readFriends, writeFriends } from "@/lib/friends";
import { getPlayAddress } from "@/lib/wallet/playWallet";
import { burnSelfRiverChips } from "@/lib/economy/burnSelf";

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
  /** One-shot sync / economy notices */
  cloudNotice: string | null;
  /** On-chain rCHIP balance (mirrors fun chips via house mint/burn) */
  onchainChips: number | null;
  updateProfile: (newProfile: Partial<UserProfile>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
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
  bumpMission: (id: string, by?: number) => void;
  claimMission: (id: string) => boolean;
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
    setMatchHistory(normalizeMatchHistory(save.matchHistory));
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
    });
    setMegapotCredits(typeof save.megapotCredits === "number" ? save.megapotCredits : 0);
    setTicketsMinted(typeof save.ticketsMinted === "number" ? save.ticketsMinted : 0);
    setMissionProgress(
      save.missionProgress && typeof save.missionProgress === "object" ? save.missionProgress : {}
    );
    setMissionsClaimed(Array.isArray(save.missionsClaimed) ? save.missionsClaimed : []);
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
        setChips(remoteChips);
        setXp(remote.xp);
        setVipTier(remote.vipTier || getTierForXp(remote.xp, remote.stats?.gamesWon));
        setEquippedCardBack(remote.equippedCardBack || "classic");
        setEquippedTableFelt(remote.equippedTableFelt || "green");
        setOwnedCardBacks(remote.ownedCardBacks?.length ? remote.ownedCardBacks : ["classic"]);
        setOwnedTableFelts(remote.ownedTableFelts?.length ? remote.ownedTableFelts : ["green"]);
        setLastDailyBonusTime(remote.lastDailyBonusTime);
        setRewardTrackDay(remote.rewardTrackDay || 1);
        setStats({ ...INITIAL_STATS, ...remote.stats });
        // Merge so empty cloud mh never wipes real local hands; login/logout keeps log
        setMatchHistory((prev) =>
          mergeMatchHistory(prev, normalizeMatchHistory(remote.matchHistory))
        );
        setSoundEnabledState(remote.soundEnabled !== false);
        sound.sfxEnabled = remote.soundEnabled !== false;
        setMusicEnabledState(remote.musicEnabled !== false);
        sound.musicEnabled = remote.musicEnabled !== false;
        setProfile({
          ...INITIAL_PROFILE,
          ...remote.profile,
          avatarUrl: remote.profile?.avatarUrl ?? null,
          usePresetAvatar: Boolean(remote.profile?.usePresetAvatar),
        });
        setMegapotCredits(remote.megapotCredits || 0);
        setTicketsMinted(remote.ticketsMinted || 0);
        setMissionProgress(remote.missionProgress || {});
        setMissionsClaimed(remote.missionsClaimed || []);
        setEconomyVersion(ECONOMY_VERSION);
        const src = data.source === "table" ? "cloud" : "account sync";
        setCloudNotice(`Progress synced (${src}).`);
        window.setTimeout(() => setCloudNotice(null), 2500);
      } catch {
        // offline — keep local
      } finally {
        window.setTimeout(() => {
          skipNextCloudPush.current = false;
        }, 800);
      }
    })();

    return () => {
      cancelled = true;
    };
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
        musicEnabled,
        economyVersion: ECONOMY_VERSION,
        profile,
        megapotCredits,
        ticketsMinted,
        missionProgress,
        missionsClaimed,
      };
      localStorage.setItem(accountStorageKey(accountRef.current), JSON.stringify(stateToSave));
    } catch {
      // Ignore
    }

    if (!accountRef.current.startsWith("google:") || skipNextCloudPush.current) return;
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      const payload: ProgressPayload = {
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
        economyVersion: ECONOMY_VERSION,
        friends: readFriends(),
      };
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
            chips,
            displayName: profile.displayName || "Player",
            wins: stats.gamesWon,
            tickets: ticketsMinted,
            totalEarnings: stats.totalEarnings,
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
    }, 1200);
  }, [chips, xp, vipTier, equippedCardBack, equippedTableFelt, ownedCardBacks, ownedTableFelts, lastDailyBonusTime, rewardTrackDay, stats, matchHistory, soundEnabled, musicEnabled, profile, megapotCredits, ticketsMinted, missionProgress, missionsClaimed, economyVersion, isLoaded]);

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
    setMissionsClaimed((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setChips((c) => c + def.rewardChips);
    addXp(def.rewardXp);
    sound.playMission();
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

  const buyCardBack = (id: string, priceChips: number): boolean => {
    if (ownedCardBacks.includes(id)) {
      setEquippedCardBack(id);
      sound.playEquip();
      return true;
    }
    if (chips < priceChips) return false;
    setChips((prev) => prev - priceChips);
    setOwnedCardBacks((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setEquippedCardBack(id);
    addXp(40);
    bumpMission("shop-style");
    sound.playEquip();
    return true;
  };

  const buyTableFelt = (id: string, priceChips: number): boolean => {
    if (ownedTableFelts.includes(id)) {
      setEquippedTableFelt(id);
      sound.playEquip();
      return true;
    }
    if (chips < priceChips) return false;
    setChips((prev) => prev - priceChips);
    setOwnedTableFelts((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setEquippedTableFelt(id);
    addXp(40);
    bumpMission("shop-style");
    sound.playEquip();
    return true;
  };

  const claimDailyBonus = (): boolean => {
    const now = Date.now();
    if (lastDailyBonusTime && now - lastDailyBonusTime < DAILY_REWARD_COOLDOWN) {
      return false;
    }

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

    setStats((prev) => {
      const newStreak = win ? prev.currentStreak + 1 : 0;
      return {
        handsPlayed: prev.handsPlayed + 1,
        gamesWon: win ? prev.gamesWon + 1 : prev.gamesWon,
        biggestWin: win ? Math.max(prev.biggestWin, Math.max(0, ledger)) : prev.biggestWin,
        currentStreak: newStreak,
        totalEarnings: win ? prev.totalEarnings + Math.max(0, ledger) : prev.totalEarnings,
      };
    });

    setMissionProgress((prev) => {
      const next = { ...prev };
      next["first-hand"] = Math.max(next["first-hand"] || 0, 1);
      next["play-three"] = (next["play-three"] || 0) + 1;
      if (win) {
        next["win-one"] = Math.max(next["win-one"] || 0, 1);
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

    setMatchHistory((prev) => [
      {
        opponent: opponentName,
        result: win ? "win" : "loss",
        hand: handName,
        chipsDelta: win ? Math.max(0, ledger) : Math.min(0, ledger),
        at: Date.now(),
      },
      ...prev.slice(0, 19),
    ]);
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
        cloudNotice,
        onchainChips,
        updateProfile,
        setSoundEnabled,
        setMusicEnabled,
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
        bumpMission,
        claimMission,
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
