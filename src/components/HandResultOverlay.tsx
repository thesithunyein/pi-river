"use client";

import Link from "next/link";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/cn";
import { BoltIcon, TrophyIcon } from "@/components/icons";
import { GradientButton } from "@/components/ui/GradientButton";
import { PremiumChip } from "@/components/PremiumChip";

export type OverlayCard = {
  rank: string;
  suit: string;
  red: boolean;
};

type Props = {
  open: boolean;
  win: boolean;
  title: string;
  subtitle?: string;
  oppCards?: OverlayCard[];
  ticketGained?: number;
  claiming?: boolean;
  claimError?: string | null;
  onClaimTicket?: () => void;
  onContinue: () => void;
  onHome?: () => void;
};

function MiniCard({ card }: { card: OverlayCard }) {
  return (
    <div
      className={cn(
        "flex h-14 w-10 flex-col items-center justify-center rounded-lg border border-black/10 bg-[#f7f4ef] shadow-md",
        card.red ? "text-[#c41e3a]" : "text-[#1a1a1a]"
      )}
    >
      <span className="text-sm font-black leading-none">{card.rank}</span>
      <span className="text-base leading-none">{card.suit}</span>
    </div>
  );
}

export function HandResultOverlay({
  open,
  win,
  title,
  subtitle,
  oppCards,
  ticketGained = 0,
  claiming = false,
  claimError = null,
  onClaimTicket,
  onContinue,
  onHome,
}: Props) {
  if (!open) return null;

  const canClaim = win && ticketGained > 0 && Boolean(onClaimTicket);
  const showOpp = Array.isArray(oppCards) && oppCards.length === 2;

  const homeBtn = onHome ? (
    <button
      type="button"
      className="w-full min-h-11 rounded-2xl border border-white/15 bg-black/30 text-sm font-bold text-white hover:border-white/25"
      onClick={() => {
        sound.playClick();
        onHome();
      }}
    >
      Home
    </button>
  ) : (
    <Link
      href="/"
      className="flex w-full min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-sm font-bold text-white hover:border-white/25"
      onClick={() => sound.playClick()}
    >
      Home
    </Link>
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-4 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hand-result-title"
    >
      <div
        className={cn(
          "animate-result-pop relative w-full max-w-sm overflow-hidden rounded-[36px] border p-6 text-center shadow-[0_32px_90px_rgba(0,0,0,0.6)]",
          win
            ? "border-[#F5C518]/45 bg-gradient-to-b from-[#4a3508] via-[#1a1528] to-[#0a0810]"
            : "border-[#FA7185]/40 bg-gradient-to-b from-[#3a1420] via-[#161322] to-[#0a0810]"
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: win
              ? "radial-gradient(ellipse at 50% 20%, rgba(245,197,24,0.35), transparent 55%)"
              : "radial-gradient(ellipse at 50% 20%, rgba(250,113,133,0.25), transparent 55%)",
          }}
        />

        {win ? (
          <div className="relative mx-auto flex h-24 w-28 items-end justify-center">
            <PremiumChip size={34} tone="green" className="absolute left-1 bottom-1 -rotate-12" />
            <PremiumChip size={34} tone="red" className="absolute right-1 bottom-1 rotate-12" />
            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[28px] border-2 border-[#F5C518]/55 bg-[#F5C518]/20 text-[#F5C518] shadow-[0_0_40px_rgba(245,197,24,0.45)] animate-bounce-soft">
              <TrophyIcon className="h-10 w-10" />
            </div>
            <PremiumChip size={40} tone="gold" className="absolute -top-1 left-1/2 z-20 -translate-x-1/2" />
          </div>
        ) : (
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border-2 border-[#FA7185]/45 bg-[#FA7185]/15 text-[#FA7185]">
            <BoltIcon className="h-10 w-10" />
          </div>
        )}

        <div
          className={cn(
            "relative mx-auto mt-4 inline-flex rounded-full px-5 py-1.5 text-[11px] font-black uppercase tracking-[0.28em] shadow-lg",
            win
              ? "bg-gradient-to-r from-[#be123c] to-[#e11d48] text-white"
              : "bg-white/10 text-[#FA7185]"
          )}
        >
          {win ? "Victory" : "Beaten"}
        </div>
        <h2 id="hand-result-title" className="relative mt-3 font-display text-3xl font-black text-white">
          {title}
        </h2>
        {subtitle ? (
          <p className="relative mt-2 text-sm leading-relaxed text-[#9AA0B4]">{subtitle}</p>
        ) : null}

        {showOpp ? (
          <div className="relative mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA0B4]">
              Opponent showed
            </p>
            <div className="flex items-center justify-center gap-2">
              {oppCards.map((c, i) => (
                <MiniCard key={`${c.rank}${c.suit}-${i}`} card={c} />
              ))}
            </div>
          </div>
        ) : null}

        {canClaim ? (
          <div className="relative mt-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F5C518]">
              Megapot · earned in this hand
            </p>
            <GradientButton
              className="w-full min-h-12"
              disabled={claiming}
              onClick={() => {
                sound.playClick();
                onClaimTicket?.();
              }}
            >
              {claiming
                ? "Minting on Base Sepolia…"
                : `Claim ${ticketGained} Megapot ticket${ticketGained === 1 ? "" : "s"}`}
            </GradientButton>
            {claimError ? (
              <div className="rounded-2xl border border-[#F5C518]/25 bg-[#F5C518]/10 px-3 py-2.5 text-left">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5C518]">
                  Almost there
                </p>
                <p className="mt-1 text-[12px] font-semibold leading-snug text-[#E8EAF2]">
                  {claimError}
                </p>
              </div>
            ) : null}
            <button
              type="button"
              className="w-full text-[12px] font-bold text-[#9AA0B4] hover:text-white"
              onClick={() => {
                sound.playClick();
                onContinue();
              }}
            >
              Keep credit · claim later in Rewards
            </button>
            {homeBtn}
          </div>
        ) : (
          <div className="relative mt-6 space-y-2">
            <GradientButton
              className="w-full min-h-12"
              onClick={() => {
                sound.playClick();
                onContinue();
              }}
            >
              {win ? "Deal again" : "Try again"}
            </GradientButton>
            {homeBtn}
          </div>
        )}
      </div>
    </div>
  );
}
