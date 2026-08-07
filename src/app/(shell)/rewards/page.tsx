"use client";

import { useMemo, useState } from "react";
import { CoinIcon, GiftIcon, TrophyIcon } from "@/components/icons";
import { useGame } from "@/context/GameContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";

const dailyRewards = Array.from({ length: 16 }, (_, index) => ({
  day: index + 1,
  chips: 10000 + index * 5000,
  xp: 120 + index * 30,
}));

function formatCooldown(lastClaim: number | null) {
  if (!lastClaim) return "Ready now";
  const remaining = Math.max(0, 24 * 60 * 60 * 1000 - (Date.now() - lastClaim));
  if (remaining === 0) return "Ready now";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export default function RewardsPage() {
  const { chips, xp, rewardTrackDay, lastDailyBonusTime, claimDailyBonus } = useGame();
  const [notice, setNotice] = useState<string | null>(null);

  const nextClaimState = useMemo(() => formatCooldown(lastDailyBonusTime), [lastDailyBonusTime]);
  const canClaim = nextClaimState === "Ready now";

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Rewards"
        title="Daily reward grid"
        description="Claim once every 24 hours to move through the 16 day progression track."
      />

      {notice ? (
        <div className="rounded-2xl border border-river-gold/20 bg-river-gold/10 px-4 py-3 text-sm font-bold text-river-white">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard accent="gold">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-river-gold/10 text-river-gold">
              <CoinIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-river-grey">Current Balance</p>
              <p className="font-mono text-2xl font-bold tabular-nums text-river-white">{chips.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard accent="purple">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-river-violet/10 text-river-violet">
              <TrophyIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-river-grey">Track Day</p>
              <p className="font-mono text-2xl font-bold tabular-nums text-river-white">{rewardTrackDay} / 16</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard accent="blue">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-river-cyan/10 text-river-cyan">
              <GiftIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-river-grey">XP Bank</p>
              <p className="font-mono text-2xl font-bold tabular-nums text-river-white">{xp.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-river-gold">16 Day Track</p>
            <h2 className="mt-1 text-2xl font-black text-river-white">Claim and keep your run going</h2>
            <p className="mt-2 text-sm text-river-grey">
              Rewards are local to this build and help show the full shell flow.
            </p>
          </div>
          <GradientButton
            onClick={() => {
              const claimed = claimDailyBonus();
              setNotice(claimed ? "Daily reward claimed." : "Next reward is not ready yet.");
              window.setTimeout(() => setNotice(null), 1800);
            }}
            className="sm:min-w-[180px]"
            disabled={!canClaim}
          >
            Claim Reward
          </GradientButton>
        </div>

        <div className="rounded-[24px] border border-river-line/15 bg-river-bg1/55 px-4 py-3 text-sm text-river-grey">
          Next claim window: <span className="font-mono tabular-nums text-river-white">{nextClaimState}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {dailyRewards.map((reward) => {
            const claimed = reward.day < rewardTrackDay;
            const current = reward.day === rewardTrackDay;

            return (
              <div
                key={reward.day}
                className={`rounded-[24px] border p-4 text-center shadow-mi-panel ${
                  claimed
                    ? "border-river-gold/25 bg-river-gold/10"
                    : current
                    ? "border-river-violet/30 bg-river-violet/10"
                    : "border-river-line/15 bg-river-bg1/55"
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-river-grey">Day {reward.day}</p>
                <p className="mt-3 font-mono text-lg font-bold tabular-nums text-river-white">
                  {reward.chips.toLocaleString()}
                </p>
                <p className="text-xs text-river-grey">{reward.xp} XP</p>
                <p className="mt-3 text-xs font-bold text-river-white">
                  {claimed ? "Claimed" : current ? "Current" : "Upcoming"}
                </p>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
