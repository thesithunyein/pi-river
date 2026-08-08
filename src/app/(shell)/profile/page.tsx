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
import { PlayerAvatar, usePlayerAvatarSrc } from "@/components/PlayerAvatar";
import { AVATAR_OPTIONS, useGame } from "@/context/GameContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
    setSoundEnabled,
    updateProfile,
    resetProgress,
  } = useGame();

  const [draft, setDraft] = useState(profile);
  const liveAvatarSrc = usePlayerAvatarSrc();

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

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
      updateProfile({ avatarUrl: result });
      setDraft((current) => ({ ...current, avatarUrl: result }));
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
            <div className="relative">
              <PlayerAvatar className="rounded-[26px]" size={80} showRing />
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
              <p className="text-[11px] font-semibold text-[#7d8398]">
                {liveAvatarSrc
                  ? googleUser && !profile.avatarUrl
                    ? "Photo from Google"
                    : "Custom profile photo"
                  : `Style: ${avatar.name}`}
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
              <GradientButton variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => linkWallet()}>
                {rememberedWallet ? "Reconnect" : "Link"}
              </GradientButton>
            ) : null}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-[#9AA0B4]">
          Google and wallet belong to the same player profile. Link both so you can browse with Google and play tables with your wallet.
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
                ? "Google photo shows automatically. Upload a custom photo anytime to override it."
                : "Upload a photo for your wallet profile. It stays on this device."}
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
              {profile.avatarUrl ? (
                <GradientButton
                  variant="secondary"
                  className="min-h-10 px-4 text-xs"
                  onClick={() => {
                    updateProfile({ avatarUrl: null });
                    setDraft((current) => ({ ...current, avatarUrl: null }));
                    setNotice(googleUser ? "Back to Google photo." : "Photo cleared.");
                    window.setTimeout(() => setNotice(null), 1800);
                  }}
                >
                  Clear custom photo
                </GradientButton>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
            {AVATAR_OPTIONS.map((option) => {
              const active = option.id === draft.avatarId && !liveAvatarSrc;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-[#F5C518]/40 bg-[#F5C518]/10"
                      : "border-white/8 bg-[#12101c] hover:border-white/20"
                  }`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      avatarId: option.id,
                      avatarUrl: null,
                    }))
                  }
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
