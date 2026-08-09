"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BoltIcon,
  CardsIcon,
  CheckIcon,
  CoinIcon,
  DiamondIcon,
  SettingsIcon,
  SpadeIcon,
  TrophyIcon,
  UserIcon,
  WalletIcon,
} from "@/components/icons";
import { useAuthGate } from "@/components/AuthGate";
import { CuteAvatar } from "@/components/CuteAvatar";
import { PlayerAvatar, usePlayerAvatarSrc } from "@/components/PlayerAvatar";
import { AVATAR_OPTIONS, useGame } from "@/context/GameContext";
import { PlayerLevelBadge } from "@/components/PlayerLevelBadge";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PremiumPageShell } from "@/components/ui/PremiumPageShell";
import { getPlayerLevel, XP_PER_LEVEL } from "@/lib/progression";
import { buildClubLadder, formatMatchChips, mergeLiveLadder, type LadderEntry } from "@/lib/clubLadder";
import { formatRelativeTime } from "@/lib/time";
import { useLadderPresence } from "@/hooks/useLadderPresence";
import { getPlayAddress } from "@/lib/wallet/playWallet";
import { useAccount, useDisconnect } from "wagmi";

export default function ProfilePage() {
  const { googleUser, walletConnected, linkGoogle, linkWallet, logoutAll, rememberedWallet } = useAuthGate();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [notice, setNotice] = useState<string | null>(null);
  const {
    chips,
    xp,
    vipTier,
    stats,
    matchHistory,
    profile,
    soundEnabled,
    musicEnabled,
    ticketsMinted,
    cloudNotice,
    onchainChips,
    setSoundEnabled,
    setMusicEnabled,
    updateProfile,
    resetProgress,
  } = useGame();

  const [draft, setDraft] = useState(profile);
  const [now, setNow] = useState(() => Date.now());
  const [ladder, setLadder] = useState<LadderEntry[]>([]);
  const [ladderLive, setLadderLive] = useState(false);
  const [ladderSource, setLadderSource] = useState<"chain" | "table" | "presence" | "empty">("empty");
  const ladderSourceRef = useRef(ladderSource);
  ladderSourceRef.current = ladderSource;
  const presenceActiveRef = useRef(false);
  const liveAvatarSrc = usePlayerAvatarSrc();

  // Presence is secondary — only fill if chain/SQL empty
  useLadderPresence((peers) => {
    if (!peers.length) return;
    if (ladderSourceRef.current === "chain" || ladderSourceRef.current === "table") return;
    presenceActiveRef.current = true;
    const you = {
      displayName: profile.displayName || "You",
      wins: stats.gamesWon,
      tickets: ticketsMinted,
      totalEarnings: stats.totalEarnings,
    };
    setLadder(mergeLiveLadder(peers, you));
    setLadderLive(true);
    setLadderSource("presence");
  }, Boolean(googleUser));

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  useEffect(() => {
    if (cloudNotice) {
      setNotice(cloudNotice);
      window.setTimeout(() => setNotice(null), 3200);
    }
  }, [cloudNotice]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const you = {
      displayName: profile.displayName || "You",
      wins: stats.gamesWon,
      tickets: ticketsMinted,
      totalEarnings: stats.totalEarnings,
    };
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/leaderboard");
        const data = (await res.json()) as {
          ok?: boolean;
          entries?: LadderEntry[];
          source?: string;
        };
        if (cancelled) return;
        let entries = Array.isArray(data.entries) ? data.entries : [];
        if (googleUser?.id && entries.length) {
          try {
            const play = getPlayAddress(googleUser.id).toLowerCase();
            entries = entries.map((e) =>
              e.id.toLowerCase() === play ? { ...e, isYou: true, name: you.displayName } : e
            );
          } catch {
            // ignore
          }
        }
        if (data.ok && entries.length) {
          setLadder(mergeLiveLadder(entries, you));
          setLadderLive(true);
          setLadderSource(data.source === "chain" ? "chain" : "table");
          return;
        }
        // Keep presence board if already live; else just you
        if (presenceActiveRef.current) return;
      } catch {
        // fall through
      }
      if (!cancelled && !presenceActiveRef.current) {
        setLadder(buildClubLadder(you));
        setLadderLive(false);
        setLadderSource("empty");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.displayName, stats.gamesWon, stats.totalEarnings, ticketsMinted, googleUser?.id]);

  useEffect(() => {
    if (!googleUser) return;
    const meta = googleUser.user_metadata as Record<string, unknown> | undefined;
    const googleName =
      (typeof meta?.full_name === "string" && meta.full_name) ||
      (typeof meta?.name === "string" && meta.name) ||
      null;
    const googlePic =
      (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta?.picture === "string" && meta.picture) ||
      null;
    const patch: Partial<typeof profile> = {};
    if (googleName && (profile.displayName === "Player" || !profile.displayName)) {
      patch.displayName = googleName;
    }
    // Seed name from Google; photo is read live from OAuth metadata in PlayerAvatar
    if (Object.keys(patch).length) updateProfile(patch);
    if (googlePic) {
      // no-op store — avatar comes from Google metadata; ensure we don't block it with emoji avatar
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleUser?.id]);

  const avatar = useMemo(
    () => AVATAR_OPTIONS.find((item) => item.id === profile.avatarId) ?? AVATAR_OPTIONS[0],
    [profile.avatarId]
  );

  const short = (address ?? rememberedWallet)
    ? `${(address ?? rememberedWallet)!.slice(0, 6)}…${(address ?? rememberedWallet)!.slice(-4)}`
    : null;

  function onPickPhoto(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Choose an image file.");
      window.setTimeout(() => setNotice(null), 1800);
      return;
    }
    if (file.size > 1_200_000) {
      setNotice("Keep photos under about 1MB.");
      window.setTimeout(() => setNotice(null), 1800);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      updateProfile({ avatarUrl: result, usePresetAvatar: false });
      setDraft((current) => ({ ...current, avatarUrl: result, usePresetAvatar: false }));
      setNotice("Profile photo saved.");
      window.setTimeout(() => setNotice(null), 1800);
    };
    reader.readAsDataURL(file);
  }

  const statsItems = [
    { label: "Hands", value: stats.handsPlayed.toLocaleString(), icon: CardsIcon, tone: "text-[#F5C518]" },
    {
      label: "Win rate",
      value:
        stats.handsPlayed === 0
          ? "0%"
          : `${((stats.gamesWon / Math.max(1, stats.handsPlayed)) * 100).toFixed(1)}%`,
      icon: TrophyIcon,
      tone: "text-[#86efac]",
    },
    {
      label: "Biggest win",
      value: stats.biggestWin.toLocaleString(),
      icon: CoinIcon,
      tone: "text-[#F5C518]",
    },
    { label: "Streak", value: `${stats.currentStreak}`, icon: BoltIcon, tone: "text-[#F5C518]" },
  ];

  return (
    <PremiumPageShell tone="gold">
      <SectionHeader
        eyebrow="Your seat"
        title="Player card"
        description="Photo, level, and career stats — your identity at the table."
      />

      {notice ? (
        <div className="rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/10 px-4 py-3 text-sm font-bold text-white">
          {notice}
        </div>
      ) : null}

      <GlassCard accent="gold" className="space-y-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <PlayerAvatar size={80} showRing />
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#161322] bg-[#F5C518] text-[#1A1400]">
                <SpadeIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5C518]">
                {vipTier} tier
              </p>
              <h2 className="text-2xl font-black text-white">{profile.displayName}</h2>
              <div className="pt-1">
                <PlayerLevelBadge xp={xp} wins={stats.gamesWon} compact />
              </div>
              <p className="text-sm text-[#9AA0B4]">{profile.bio}</p>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-[#9AA0B4]">
                {liveAvatarSrc
                  ? googleUser && !profile.avatarUrl
                    ? "Photo from Google"
                    : "Custom profile photo"
                  : `Cute avatar · ${avatar.name}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="mb-1 flex items-center gap-1.5 text-[#F5C518]">
                <CoinIcon className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">Chips</span>
              </div>
              <p className="font-mono text-lg font-black tabular-nums text-white">
                {chips.toLocaleString()}
              </p>
              {onchainChips != null ? (
                <p className="mt-1 text-[10px] font-semibold text-[#9AA0B4]">
                  On-chain {onchainChips.toLocaleString()} rCHIP
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="mb-1 flex items-center gap-1.5 text-[#F5C518]">
                <DiamondIcon className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">XP</span>
              </div>
              <p className="font-mono text-lg font-black tabular-nums text-white">
                {xp.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#12101c] px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white">
              <UserIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">Google</p>
              <p className="truncate text-sm font-bold text-white">
                {googleUser?.email ?? "Not linked yet"}
              </p>
            </div>
            {!googleUser ? (
              <GradientButton variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => linkGoogle()}>
                Link
              </GradientButton>
            ) : null}
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#12101c] px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5C518]/12 text-[#F5C518]">
              <WalletIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">Wallet</p>
              <p className="truncate font-mono text-sm font-bold text-white">
                {isConnected && short
                  ? short
                  : rememberedWallet && short
                    ? `${short} (saved)`
                    : walletConnected
                      ? "Connected"
                      : "Not linked yet"}
              </p>
            </div>
            {!isConnected ? (
              <GradientButton
                variant="secondary"
                className="relative z-10 min-h-10 touch-manipulation px-3 text-xs"
                onClick={() => linkWallet()}
              >
                {rememberedWallet ? "Reconnect" : "Optional link"}
              </GradientButton>
            ) : null}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-[#9AA0B4]">
          Google is enough to play — your silent seat wallet handles tables. Linking MetaMask is optional (useful on desktop).
        </p>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-[#F5C518]">
              <UserIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5C518]">Identity</p>
              <h3 className="text-lg font-black text-white">Edit profile</h3>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#12101c] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA0B4]">
              Profile photo
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#9AA0B4]">
              {googleUser
                ? "Google photo shows by default. Pick a cute avatar below, or upload your own."
                : "Pick a cute avatar or upload a photo. It stays on this device."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white transition hover:bg-white/10">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => onPickPhoto(event.target.files?.[0] ?? null)}
                />
              </label>
              {googleUser ? (
                <GradientButton
                  variant="secondary"
                  className="min-h-10 px-4 text-xs"
                  onClick={() => {
                    updateProfile({ avatarUrl: null, usePresetAvatar: false });
                    setDraft((current) => ({
                      ...current,
                      avatarUrl: null,
                      usePresetAvatar: false,
                    }));
                    setNotice("Using Google photo.");
                    window.setTimeout(() => setNotice(null), 1800);
                  }}
                >
                  Use Google photo
                </GradientButton>
              ) : null}
              {profile.avatarUrl ? (
                <GradientButton
                  variant="secondary"
                  className="min-h-10 px-4 text-xs"
                  onClick={() => {
                    updateProfile({ avatarUrl: null, usePresetAvatar: true });
                    setDraft((current) => ({
                      ...current,
                      avatarUrl: null,
                      usePresetAvatar: true,
                    }));
                    setNotice("Back to cute avatar.");
                    window.setTimeout(() => setNotice(null), 1800);
                  }}
                >
                  Clear custom photo
                </GradientButton>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            {AVATAR_OPTIONS.map((option) => {
              const active = option.id === draft.avatarId && draft.usePresetAvatar;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "group relative overflow-hidden rounded-[22px] border p-3 text-left transition soft-card-hover",
                    active
                      ? "border-[#F5C518]/50 bg-gradient-to-b from-[#3a2d0a]/90 to-[#161322] shadow-[0_12px_36px_rgba(245,197,24,0.2)]"
                      : "border-white/10 bg-gradient-to-b from-[#1a1730] to-[#100e1a] hover:border-white/25"
                  )}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      avatarId: option.id,
                      avatarUrl: null,
                      usePresetAvatar: true,
                    }))
                  }
                >
                  <div className="mb-3 flex items-center gap-3">
                    <CuteAvatar id={option.id} size={56} className="rounded-2xl" showRing={active} />
                    {active ? (
                      <span className="rounded-full bg-[#F5C518]/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#F5C518]">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-black text-white">{option.name}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#9AA0B4]">{option.description}</p>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA0B4]">
                Display name
              </span>
              <input
                type="text"
                value={draft.displayName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, displayName: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-[#12101c] px-4 py-3 text-white"
                autoComplete="nickname"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA0B4]">Bio</span>
              <input
                type="text"
                value={draft.bio}
                onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#12101c] px-4 py-3 text-white"
                autoComplete="off"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA0B4]">
                Favorite hand
              </span>
              <input
                type="text"
                value={draft.favHand}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, favHand: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-[#12101c] px-4 py-3 text-white"
                autoComplete="off"
              />
            </label>
          </div>

          <GradientButton
            onClick={() => {
              updateProfile(draft);
              setNotice("Profile saved.");
              window.setTimeout(() => setNotice(null), 1800);
            }}
            icon={<CheckIcon className="h-4 w-4" />}
          >
            Save profile
          </GradientButton>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5C518]/12 text-[#F5C518]">
                <TrophyIcon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9AA0B4]">
                  Level
                </p>
                <p className="text-sm font-bold text-white">
                  Lv.{getPlayerLevel(xp, stats.gamesWon)} · {vipTier}
                </p>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F5C518] to-[#E29A12]"
                style={{ width: `${Math.min(100, (xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100)}%` }}
              />
            </div>
            <p className="font-mono text-xs tabular-nums text-[#9AA0B4]">
              {xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP this level · {xp.toLocaleString()} total
            </p>
          </GlassCard>

          <GlassCard className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5C518]">Stats</p>
            <div className="grid grid-cols-2 gap-2">
              {statsItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/8 bg-[#12101c] p-3"
                  >
                    <div className={`mb-2 flex items-center gap-1.5 ${item.tone}`}>
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">
                        {item.label}
                      </span>
                    </div>
                    <p className="font-mono text-sm font-black tabular-nums text-white">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[#9AA0B4]">
                <SettingsIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">Audio</p>
                <p className="text-xs text-[#9AA0B4]">
                  SFX for chips &amp; cards · lounge music bed (quieter on phone)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/8 bg-black/25 px-3 py-2.5">
                <span className="text-xs font-bold text-white">Table SFX</span>
                <GradientButton
                  variant="secondary"
                  className="min-h-9 px-3 text-xs"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? "On" : "Off"}
                </GradientButton>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/8 bg-black/25 px-3 py-2.5">
                <span className="text-xs font-bold text-white">Lounge music</span>
                <GradientButton
                  variant="secondary"
                  className="min-h-9 px-3 text-xs"
                  onClick={() => setMusicEnabled(!musicEnabled)}
                >
                  {musicEnabled ? "On" : "Off"}
                </GradientButton>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isConnected ? (
                <GradientButton
                  variant="secondary"
                  className="flex-1"
                  onClick={() => disconnect()}
                >
                  Unlink wallet
                </GradientButton>
              ) : null}
              <GradientButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  resetProgress();
                  setNotice("Local progress reset.");
                  window.setTimeout(() => setNotice(null), 1800);
                }}
              >
                Reset chips
              </GradientButton>
              <GradientButton
                className="w-full"
                onClick={async () => {
                  await logoutAll();
                }}
              >
                Log out of pi River
              </GradientButton>
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="space-y-4 overflow-hidden border-[#F5C518]/20 bg-gradient-to-b from-[#2a2210] via-[#161322] to-[#0f0d18]">
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F5C518]/35 bg-[#F5C518]/15 text-[#F5C518] shadow-[0_0_24px_rgba(245,197,24,0.25)]">
            <TrophyIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#F5C518]">
              {ladderLive ? "Live club ladder" : "Club ladder"}
            </p>
            <h3 className="text-lg font-black text-white">
              {ladderSource === "chain"
                ? "On-chain rankings"
                : ladderSource === "table"
                  ? "Cloud rankings"
                  : ladderSource === "presence"
                    ? "Players online now"
                    : "Your rank"}
            </h3>
            <p className="mt-0.5 text-[12px] text-[#9AA0B4]">
              {ladderSource === "chain"
                ? "Real scores on Base Sepolia (RiverClub). No house fillers."
                : ladderSource === "table"
                  ? "Synced from cloud progress."
                  : ladderSource === "presence"
                    ? "Live presence while friends are signed in."
                    : "Play a hand — your score posts on-chain after sync."}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {ladder.map((entry, index) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
                entry.isYou
                  ? "border-[#F5C518]/40 bg-gradient-to-r from-[#F5C518]/15 to-transparent shadow-[0_0_24px_rgba(245,197,24,0.12)]"
                  : "border-white/8 bg-black/25",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black",
                  index === 0
                    ? "bg-gradient-to-b from-[#F5C518] to-[#E29A12] text-[#1A1400]"
                    : index === 1
                      ? "bg-[#c0c7d4] text-[#1a1f2e]"
                      : index === 2
                        ? "bg-[#d4a574] text-[#2a1a0a]"
                        : "bg-white/10 text-white",
                )}
              >
                {index + 1}
              </span>
              {entry.isYou ? (
                <PlayerAvatar size={40} showRing />
              ) : entry.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <CuteAvatar id={entry.avatarId ?? "felt-core"} size={40} className="rounded-full" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">
                  {entry.name}
                  {entry.isYou ? (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#F5C518]">
                      You
                    </span>
                  ) : entry.isHouse ? (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">
                      House
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] font-semibold text-[#9AA0B4]">
                  {entry.wins} wins · {entry.tickets} tickets
                </p>
              </div>
              <p className="font-mono text-sm font-black tabular-nums text-[#F5C518]">
                {entry.score.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard accent="gold" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/15 text-[#F5C518]">
            <CardsIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#F5C518]">
              Hand log
            </p>
            <h3 className="text-lg font-black text-white">Your recent runs</h3>
            <p className="text-[11px] text-[#9AA0B4]">
              Real settled hands from this account — syncs on Google login.
            </p>
          </div>
        </div>
        {matchHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-6 text-sm text-[#9AA0B4]">
            No hands yet. Sit at a table — wins climb the ladder; folds just close that pot.
          </div>
        ) : (
          <div className="space-y-2">
            {matchHistory.map((match, index) => (
              <div
                key={`${match.at}-${match.opponent}-${index}`}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
                  match.result === "win"
                    ? "border-emerald-400/25 bg-emerald-500/10"
                    : "border-white/8 bg-black/30",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-wider",
                    match.result === "win"
                      ? "bg-emerald-400/20 text-emerald-300"
                      : "bg-white/10 text-[#9AA0B4]",
                  )}
                >
                  {match.result === "win" ? "W" : "L"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">vs {match.opponent}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">
                    {match.hand}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-mono text-sm font-black tabular-nums",
                      match.result === "win" ? "text-emerald-300" : "text-[#9AA0B4]",
                    )}
                  >
                    {formatMatchChips(match.chipsDelta, match.result, match.hand)}
                  </p>
                  <p className="text-[10px] font-semibold text-[#6b728a]">
                    {formatRelativeTime(match.at, now)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </PremiumPageShell>
  );
}
