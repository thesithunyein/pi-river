"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon, SettingsIcon, TrophyIcon } from "@/components/icons";
import { AVATAR_OPTIONS, useGame } from "@/context/GameContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
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

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then((result: { data: { user: User | null } }) => {
      setUser(result.data.user ?? null);
    });
  }, []);

  const avatar = useMemo(
    () => AVATAR_OPTIONS.find((item) => item.id === profile.avatarId) ?? AVATAR_OPTIONS[0],
    [profile.avatarId]
  );

  const statsItems = [
    { label: "Hands played", value: stats.handsPlayed.toLocaleString() },
    {
      label: "Win rate",
      value:
        stats.handsPlayed === 0
          ? "0%"
          : `${((stats.gamesWon / Math.max(1, stats.handsPlayed)) * 100).toFixed(1)}%`,
    },
    { label: "Biggest win", value: `${stats.biggestWin.toLocaleString()} chips` },
    { label: "Current streak", value: `${stats.currentStreak}` },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Profile"
        title="Player identity and progression"
        description="Tune your profile, review local progression, and reset the demo state when you need a clean run."
      />

      {notice ? (
        <div className="rounded-2xl border border-river-violet/25 bg-river-violet/12 px-4 py-3 text-sm font-bold text-river-white">
          {notice}
        </div>
      ) : null}

      <GlassCard accent="purple" className="space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br ${avatar.bgGradient} text-2xl font-black text-white shadow-mi-glow`}
            >
              {getInitials(profile.displayName)}
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-river-gold">{vipTier} tier</p>
              <h2 className="text-2xl font-black text-river-white">{profile.displayName}</h2>
              <p className="text-sm text-river-grey">{profile.bio}</p>
              <p className="text-xs text-river-grey">{user?.email ?? "Guest mode"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-river-line/15 bg-river-bg1/55 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-river-grey">Balance</p>
              <p className="font-mono text-lg font-bold tabular-nums text-river-white">{chips.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-river-line/15 bg-river-bg1/55 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-river-grey">XP</p>
              <p className="font-mono text-lg font-bold tabular-nums text-river-white">{xp.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard className="space-y-4 bg-river-bg1/55 p-4">
            <SectionHeader
              eyebrow="Identity"
              title="Profile settings"
              description="Simple local profile data used across the shell."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {AVATAR_OPTIONS.map((option) => {
                const active = option.id === draft.avatarId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`rounded-[22px] border p-4 text-left transition ${
                      active
                        ? "border-river-violet/30 bg-river-violet/10"
                        : "border-river-line/15 bg-river-bg/40 hover:border-river-line/30"
                    }`}
                    onClick={() => setDraft((current) => ({ ...current, avatarId: option.id }))}
                  >
                    <div
                      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${option.bgGradient} text-sm font-black text-white`}
                    >
                      {option.emoji}
                    </div>
                    <p className="text-sm font-bold text-river-white">{option.name}</p>
                    <p className="text-xs leading-5 text-river-grey">{option.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-river-grey">Display name</span>
                <input
                  type="text"
                  value={draft.displayName}
                  onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                  className="w-full rounded-2xl border border-river-line/20 bg-river-bg/55 px-4 py-3 text-river-white"
                  autoComplete="nickname"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-river-grey">Country</span>
                <input
                  type="text"
                  value={draft.country}
                  onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}
                  className="w-full rounded-2xl border border-river-line/20 bg-river-bg/55 px-4 py-3 text-river-white"
                  autoComplete="country-name"
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-river-grey">Bio</span>
                <input
                  type="text"
                  value={draft.bio}
                  onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
                  className="w-full rounded-2xl border border-river-line/20 bg-river-bg/55 px-4 py-3 text-river-white"
                  autoComplete="off"
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-river-grey">Favorite hand</span>
                <input
                  type="text"
                  value={draft.favHand}
                  onChange={(event) => setDraft((current) => ({ ...current, favHand: event.target.value }))}
                  className="w-full rounded-2xl border border-river-line/20 bg-river-bg/55 px-4 py-3 text-river-white"
                  autoComplete="off"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <GradientButton
                onClick={() => {
                  updateProfile(draft);
                  setNotice("Profile updated.");
                  window.setTimeout(() => setNotice(null), 1800);
                }}
                icon={<CheckIcon className="h-4 w-4" />}
              >
                Save changes
              </GradientButton>
              <GradientButton
                variant="secondary"
                onClick={() => {
                  setDraft(profile);
                }}
              >
                Reset draft
              </GradientButton>
            </div>
          </GlassCard>

          <div className="space-y-4">
            <GlassCard className="space-y-4 bg-river-bg1/55 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-river-cyan/10 text-river-cyan">
                  <TrophyIcon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-river-grey">Level progress</p>
                  <p className="text-sm font-bold text-river-white">{vipTier} progression</p>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-river-bg/70">
                <div
                  className="h-full rounded-full bg-mi-cta"
                  style={{ width: `${Math.min(100, (xp / 12000) * 100)}%` }}
                />
              </div>
              <p className="font-mono text-xs tabular-nums text-river-grey">{xp.toLocaleString()} / 12,000 XP</p>
            </GlassCard>

            <GlassCard className="space-y-4 bg-river-bg1/55 p-4">
              <SectionHeader eyebrow="Stats" title="Session numbers" />
              <div className="grid gap-3 sm:grid-cols-2">
                {statsItems.map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-river-line/15 bg-river-bg/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-river-grey">{item.label}</p>
                    <p className="mt-2 text-sm font-bold text-river-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="space-y-4 bg-river-bg1/55 p-4">
              <SectionHeader eyebrow="Preferences" title="Local settings" />
              <div className="flex items-center justify-between rounded-[22px] border border-river-line/15 bg-river-bg/40 p-4">
                <div>
                  <p className="text-sm font-bold text-river-white">Audio</p>
                  <p className="text-xs text-river-grey">Control click, chip, and table sounds in this session.</p>
                </div>
                <GradientButton variant="secondary" onClick={() => setSoundEnabled(!soundEnabled)}>
                  {soundEnabled ? "On" : "Off"}
                </GradientButton>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-river-line/15 bg-river-bg/40 p-4">
                <div>
                  <p className="text-sm font-bold text-river-white">Reset local state</p>
                  <p className="text-xs text-river-grey">Clear chips, cosmetics, rewards, and recent table history.</p>
                </div>
                <GradientButton
                  variant="secondary"
                  onClick={() => {
                    resetProgress();
                    setNotice("Local progression reset.");
                    window.setTimeout(() => setNotice(null), 1800);
                  }}
                  icon={<SettingsIcon className="h-4 w-4" />}
                >
                  Reset
                </GradientButton>
              </div>
            </GlassCard>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4">
        <SectionHeader
          eyebrow="Recent Hands"
          title="Match history"
          description="The table route writes local hand results here so the shell feels continuous."
        />
        {matchHistory.length === 0 ? (
          <div className="rounded-[24px] border border-river-line/15 bg-river-bg1/55 p-6 text-sm text-river-grey">
            No hands logged yet. Play a few rounds at the table and your latest results will appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {matchHistory.map((match, index) => (
              <div
                key={`${match.opponent}-${index}`}
                className="flex items-center justify-between gap-4 rounded-[24px] border border-river-line/15 bg-river-bg1/55 p-4"
              >
                <div>
                  <p className="text-sm font-bold text-river-white">vs {match.opponent}</p>
                  <p className="text-xs text-river-grey">{match.hand}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold tabular-nums text-river-white">{match.chips}</p>
                  <p className="text-xs text-river-grey">{match.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
