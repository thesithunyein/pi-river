"use client";

import { useEffect, useMemo, useState } from "react";
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
import { AVATAR_OPTIONS, useGame } from "@/context/GameContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAccount, useDisconnect } from "wagmi";

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ProfilePage() {
  const { googleUser, walletConnected, signOutGoogle } = useAuthGate();
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
    setSoundEnabled,
    updateProfile,
    resetProgress,
  } = useGame();

  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const avatar = useMemo(
    () => AVATAR_OPTIONS.find((item) => item.id === profile.avatarId) ?? AVATAR_OPTIONS[0],
    [profile.avatarId]
  );

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

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
    {
      label: "Streak",
      value: `${stats.currentStreak}`,
      icon: BoltIcon,
      tone: "text-[#B9A8FF]",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Player card"
        title="Your seat at the table"
        description="Identity, progression, and session settings."
      />

      {notice ? (
        <div className="rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/10 px-4 py-3 text-sm font-bold text-white">
          {notice}
        </div>
      ) : null}

      <GlassCard accent="purple" className="space-y-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`relative flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br ${avatar.bgGradient} text-2xl font-black text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)]`}
            >
              {getInitials(profile.displayName)}
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#161322] bg-[#F5C518] text-[#1A1400]">
                <SpadeIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5C518]">
                {vipTier} tier
              </p>
              <h2 className="text-2xl font-black text-white">{profile.displayName}</h2>
              <p className="text-sm text-[#9AA0B4]">{profile.bio}</p>
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
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="mb-1 flex items-center gap-1.5 text-[#B9A8FF]">
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
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">Google</p>
              <p className="truncate text-sm font-bold text-white">
                {googleUser?.email ?? "Not linked"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#12101c] px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5C518]/12 text-[#F5C518]">
              <WalletIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">Wallet</p>
              <p className="truncate font-mono text-sm font-bold text-white">
                {isConnected && short ? short : walletConnected ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
        </div>
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

          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
            {AVATAR_OPTIONS.map((option) => {
              const active = option.id === draft.avatarId;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-[#F5C518]/40 bg-[#F5C518]/10"
                      : "border-white/8 bg-[#12101c] hover:border-white/20"
                  }`}
                  onClick={() => setDraft((current) => ({ ...current, avatarId: option.id }))}
                >
                  <div
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${option.bgGradient} text-xs font-black text-white`}
                  >
                    {option.emoji}
                  </div>
                  <p className="text-xs font-bold text-white">{option.name}</p>
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
                <p className="text-sm font-bold text-white">{vipTier} progression</p>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F5C518] to-[#E29A12]"
                style={{ width: `${Math.min(100, (xp / 12000) * 100)}%` }}
              />
            </div>
            <p className="font-mono text-xs tabular-nums text-[#9AA0B4]">
              {xp.toLocaleString()} / 12,000 XP
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[#9AA0B4]">
                  <SettingsIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Audio</p>
                  <p className="text-xs text-[#9AA0B4]">Table click and chip sounds</p>
                </div>
              </div>
              <GradientButton variant="secondary" onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? "On" : "Off"}
              </GradientButton>
            </div>

            <div className="flex flex-wrap gap-2">
              {googleUser ? (
                <GradientButton
                  variant="secondary"
                  className="flex-1"
                  onClick={async () => {
                    await signOutGoogle();
                  }}
                >
                  Sign out Google
                </GradientButton>
              ) : null}
              {isConnected ? (
                <GradientButton
                  variant="secondary"
                  className="flex-1"
                  onClick={() => disconnect()}
                >
                  Disconnect wallet
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
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-[#86efac]">
            <CardsIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5C518]">
              Recent hands
            </p>
            <h3 className="text-lg font-black text-white">Match history</h3>
          </div>
        </div>
        {matchHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#12101c] p-6 text-sm text-[#9AA0B4]">
            No hands yet. Sit at a table and results will land here.
          </div>
        ) : (
          <div className="space-y-2">
            {matchHistory.map((match, index) => (
              <div
                key={`${match.opponent}-${index}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-[#12101c] p-4"
              >
                <div>
                  <p className="text-sm font-bold text-white">vs {match.opponent}</p>
                  <p className="text-xs text-[#9AA0B4]">{match.hand}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold tabular-nums text-white">{match.chips}</p>
                  <p className="text-xs text-[#9AA0B4]">{match.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
