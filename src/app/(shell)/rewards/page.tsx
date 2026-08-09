"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CoinIcon, GiftIcon, TrophyIcon } from "@/components/icons";
import { useGame } from "@/context/GameContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { usePlaySession } from "@/hooks/usePlaySession";
import { useAuthGate } from "@/components/AuthGate";
import { MissionsPanel } from "@/components/MissionsPanel";
import { PlayerLevelBadge } from "@/components/PlayerLevelBadge";
import { dailyRewardForDay } from "@/lib/progression";
import { PremiumPageShell } from "@/components/ui/PremiumPageShell";

const dailyRewards = Array.from({ length: 16 }, (_, index) => ({
  day: index + 1,
  ...dailyRewardForDay(index + 1),
}));

function formatCooldown(lastClaim: number | null) {
  if (!lastClaim) return "Ready now";
  const remaining = Math.max(0, 24 * 60 * 60 * 1000 - (Date.now() - lastClaim));
  if (remaining === 0) return "Ready now";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
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
    chips,
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

  const nextClaimState = useMemo(() => formatCooldown(lastDailyBonusTime), [lastDailyBonusTime]);
  const canClaim = nextClaimState === "Ready now";

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
        setNotice(data.error || "Claim failed.");
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
    <PremiumPageShell tone="gold">
      <SectionHeader
        eyebrow="Jackpot"
        title="Rewards"
        description="Win hands to earn ticket credits. Claim into the live Megapot drawing."
      />

      {notice ? (
        <div className="rounded-2xl border border-river-gold/20 bg-river-gold/10 px-4 py-3 text-sm font-bold text-river-white">
          {notice}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-[28px] border border-[#F5C518]/25 bg-gradient-to-br from-[#3a2a08] via-[#1a1520] to-[#0d0b14] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <div className="pointer-events-none absolute -left-6 top-0 h-40 w-40 rounded-full bg-[#F5C518]/18 blur-3xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-32 w-32 rounded-full bg-emerald-600/15 blur-3xl" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#F5C518]/30 bg-[#F5C518]/12 text-[#F5C518] shadow-[0_0_24px_rgba(245,197,24,0.2)]">
              <TrophyIcon className="h-7 w-7" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5C518]/90">Live jackpot</p>
              <p className="font-mono text-3xl font-black tabular-nums text-white">
                {pool.prizePoolUsdc
                  ? `$${Number(pool.prizePoolUsdc).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : pool.error
                    ? "-"
                    : "Loading…"}
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[#B8B4C8]">
            Drawing #{pool.drawingId ?? "-"} · ~${pool.ticketPriceUsdc ?? "1"} each ·{" "}
            {pool.ticketsBought ?? 0} tickets sold
            {pool.locked ? " · locked for draw" : ""}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#F5C518]/20 bg-black/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">Ready to claim</p>
              <p className="font-mono text-xl font-black text-[#F5C518]">{megapotCredits}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">Tickets you own</p>
              <p className="font-mono text-xl font-black text-white">{ticketsMinted}</p>
            </div>
          </div>
          <GradientButton
            className="w-full min-h-12"
            disabled={claiming || megapotCredits <= 0 || !play.address}
            onClick={claimMegapotTicket}
          >
            {claiming ? "Claiming…" : "Claim jackpot ticket"}
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

      <SectionHeader
        eyebrow="Daily streak"
        title="Free chips every day"
        description="Claim once every 24 hours. Each claim also gives +1 jackpot ticket credit."
      />

      <PlayerLevelBadge xp={xp} wins={stats.gamesWon} className="mb-2" />

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard accent="gold">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-river-gold/10 text-river-gold">
              <CoinIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-river-grey">Fun chips</p>
              <p className="font-mono text-2xl font-bold tabular-nums text-river-white">
                {chips.toLocaleString()}
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-river-white">
              <GiftIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-river-grey">XP</p>
              <p className="font-mono text-2xl font-bold tabular-nums text-river-white">
                {xp.toLocaleString()}
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-river-grey">Streak day</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-river-white">
              {rewardTrackDay} / 16
            </p>
            <p className="mt-1 text-xs text-river-grey">{nextClaimState}</p>
          </div>
        </GlassCard>
      </div>

      <GradientButton
        className="w-full min-h-12"
        disabled={!canClaim}
        onClick={() => {
          const claimed = claimDailyBonus();
          setNotice(claimed ? "Daily reward + Megapot credit claimed." : "Next reward is not ready yet.");
        }}
      >
        Claim daily bonus
      </GradientButton>

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

      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#1c1a24] via-[#14121c] to-[#0f0d18] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="relative mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#F5C518]/25 bg-[#F5C518]/10 text-[#F5C518]">
            <TrophyIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9AA0B4]">
              Optional missions
            </p>
            <h2 className="text-lg font-black text-white">Extra chips & XP</h2>
          </div>
        </div>
        <MissionsPanel />
      </section>
    </PremiumPageShell>
  );
}
