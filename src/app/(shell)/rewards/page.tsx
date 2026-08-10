"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GiftIcon, TrophyIcon } from "@/components/icons";
import { useGame } from "@/context/GameContext";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SoftExpand } from "@/components/ui/SoftExpand";
import { usePlaySession } from "@/hooks/usePlaySession";
import { useAuthGate } from "@/components/AuthGate";
import { MissionsPanel, AchievementsPanel } from "@/components/MissionsPanel";
import { PlayerLevelBadge } from "@/components/PlayerLevelBadge";
import { alreadyClaimedDailyBonusToday, utcDayKey } from "@/lib/missions";
import { dailyRewardForDay } from "@/lib/progression";
import { PremiumPageShell } from "@/components/ui/PremiumPageShell";
import Link from "next/link";

const dailyRewards = Array.from({ length: 16 }, (_, index) => ({
  day: index + 1,
  ...dailyRewardForDay(index + 1),
}));

function formatCooldown(lastClaim: number | null) {
  if (alreadyClaimedDailyBonusToday(lastClaim)) {
    // Ready again at next UTC midnight
    const tomorrow = new Date(`${utcDayKey()}T00:00:00.000Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const remaining = Math.max(0, tomorrow.getTime() - Date.now());
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `Next claim in ${hours}h ${minutes}m (UTC day)`;
  }
  return "Ready now";
}

type PoolState = {
  prizePoolUsdc?: string | null;
  ticketPriceUsdc?: string;
  drawingId?: string;
  ticketsBought?: number;
  locked?: boolean;
  error?: string;
};

export default function RewardsPage() {
  const {
    xp,
    rewardTrackDay,
    lastDailyBonusTime,
    claimDailyBonus,
    megapotCredits,
    ticketsMinted,
    consumeMegapotCredit,
    markTicketMinted,
    stats,
  } = useGame();
  const { googleUser } = useAuthGate();
  const play = usePlaySession();
  const [notice, setNotice] = useState<string | null>(null);
  const [pool, setPool] = useState<PoolState>({});
  const [claiming, setClaiming] = useState(false);
  const [showPoolMeta, setShowPoolMeta] = useState(false);

  const nextClaimState = useMemo(() => formatCooldown(lastDailyBonusTime), [lastDailyBonusTime]);
  const canClaim = nextClaimState === "Ready now";
  const todayReward = dailyRewards[Math.min(rewardTrackDay - 1, dailyRewards.length - 1)];

  const [lastClaimTx, setLastClaimTx] = useState<string | null>(null);

  const refreshPool = useCallback(() => {
    fetch("/api/megapot/claim")
      .then((r) => r.json())
      .then((d: PoolState & { ok?: boolean }) => setPool(d))
      .catch(() => setPool({ error: "Could not load Megapot pool." }));
  }, []);

  useEffect(() => {
    refreshPool();
  }, [refreshPool]);

  async function claimMegapotTicket() {
    if (megapotCredits <= 0) {
      setNotice("Win a hand first.");
      return;
    }
    if (!play.address) {
      setNotice("Sign in with Google to claim.");
      return;
    }
    setClaiming(true);
    setNotice("Minting ticket…");
    try {
      const res = await fetch("/api/megapot/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: play.address,
          googleUserId: googleUser?.id,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        txHash?: string;
        pool?: PoolState;
      };
      if (!res.ok) {
        const msg = data.error || "Claim failed.";
        setNotice(
          /refill|USDC|usdc/i.test(msg)
            ? "Jackpot desk is refilling — credits stay saved. Try again shortly."
            : msg
        );
        return;
      }
      consumeMegapotCredit();
      markTicketMinted();
      if (data.pool) setPool(data.pool);
      else refreshPool();
      if (data.txHash) setLastClaimTx(data.txHash);
      setNotice(data.txHash ? "Ticket minted." : "Ticket claimed.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Claim failed.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <PremiumPageShell tone="gold" className="space-y-4">
      <SectionHeader
        eyebrow="Jackpot"
        title="Rewards"
        description="Claim tickets. Daily bonus. Missions when you want them."
      />

      {notice ? (
        <div className="rounded-2xl border border-river-gold/20 bg-river-gold/10 px-4 py-3 text-sm font-bold text-river-white">
          {notice}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-[28px] border border-[#F5C518]/25 bg-gradient-to-br from-[#3a2a08] via-[#1a1520] to-[#0d0b14] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <div className="pointer-events-none absolute -left-6 top-0 h-40 w-40 rounded-full bg-[#F5C518]/18 blur-3xl" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#F5C518]/30 bg-[#F5C518]/12 text-[#F5C518] shadow-[0_0_24px_rgba(245,197,24,0.2)]">
              <TrophyIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setShowPoolMeta((v) => !v)}
                className="text-left"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5C518]/90">
                  Live Megapot jackpot
                </p>
                <p className="font-mono text-3xl font-black tabular-nums text-white">
                  {pool.prizePoolUsdc
                    ? `$${Number(pool.prizePoolUsdc).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : pool.error
                      ? "-"
                      : "Loading…"}
                </p>
              </button>
            </div>
          </div>
          {showPoolMeta ? (
            <p className="animate-fade-in text-xs leading-relaxed text-[#B8B4C8]">
              Drawing #{pool.drawingId ?? "-"} · ~${pool.ticketPriceUsdc ?? "1"} each ·{" "}
              {pool.ticketsBought ?? 0} tickets sold
              {pool.locked ? " · locked for draw" : ""}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#F5C518]/20 bg-black/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">Ready</p>
              <p className="font-mono text-xl font-black text-[#F5C518]">{megapotCredits}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">Owned</p>
              <p className="font-mono text-xl font-black text-white">{ticketsMinted}</p>
            </div>
          </div>
          <GradientButton
            className="w-full min-h-12"
            disabled={claiming || megapotCredits <= 0 || !play.address}
            onClick={claimMegapotTicket}
          >
            {claiming ? "Minting Megapot ticket…" : "Claim Megapot ticket"}
          </GradientButton>
          {lastClaimTx ? (
            <a
              href={`https://sepolia.basescan.org/tx/${lastClaimTx}`}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-[11px] font-bold text-[#F5C518] hover:underline"
            >
              View mint tx
            </a>
          ) : null}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-[#1c1a24] to-[#0f0d18] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#F5C518]/25 bg-[#F5C518]/10 text-[#F5C518]">
              <GiftIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9AA0B4]">
                Daily · Day {rewardTrackDay}/16
              </p>
              <p className="text-sm font-black text-white">
                {todayReward
                  ? `${todayReward.chips.toLocaleString()} chips · ${todayReward.xp} XP`
                  : "Streak complete"}
              </p>
              <p className="text-[11px] font-semibold text-[#9AA0B4]">{nextClaimState}</p>
            </div>
          </div>
          <Link href="/profile">
            <PlayerLevelBadge xp={xp} wins={stats.gamesWon} compact />
          </Link>
        </div>
        <GradientButton
          className="w-full min-h-12"
          disabled={!canClaim}
          onClick={() => {
            void (async () => {
              const claimed = await Promise.resolve(claimDailyBonus());
              setNotice(
                claimed
                  ? "Daily reward + Megapot credit claimed (1× per UTC day)."
                  : "Already claimed today — come back after UTC midnight."
              );
            })();
          }}
        >
          Claim daily bonus
        </GradientButton>
        <div className="mt-3">
          <SoftExpand title="16-day track" hint="See every day ahead" badge={`${rewardTrackDay}/16`}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {dailyRewards.map((reward) => {
                const claimed = reward.day < rewardTrackDay;
                const current = reward.day === rewardTrackDay;
                return (
                  <div
                    key={reward.day}
                    className={`rounded-2xl border p-3 ${
                      current
                        ? "border-[#F5C518]/40 bg-[#F5C518]/10"
                        : claimed
                          ? "border-white/5 bg-white/[0.03] opacity-60"
                          : "border-white/8 bg-[#161322]"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-river-grey">Day {reward.day}</p>
                    <p className="font-mono text-sm font-bold text-river-white">
                      {reward.chips.toLocaleString()}
                    </p>
                    <p className="text-xs text-river-grey">{reward.xp} XP</p>
                  </div>
                );
              })}
            </div>
          </SoftExpand>
        </div>
      </div>

      <SoftExpand title="Missions" hint="Optional extra chips & XP" badge="Extra">
        <MissionsPanel compact />
      </SoftExpand>

      <SoftExpand title="Achievements" hint="Career badges">
        <AchievementsPanel />
      </SoftExpand>
    </PremiumPageShell>
  );
}
