"use client";

import { sound } from "@/lib/sound";
import { cn } from "@/lib/cn";
import { BoltIcon, TrophyIcon } from "@/components/icons";
import { GradientButton } from "@/components/ui/GradientButton";
import { PremiumChip } from "@/components/PremiumChip";

type Props = {
  open: boolean;
  win: boolean;
  title: string;
  subtitle?: string;
  /** Ticket credits just earned this hand (real Megapot credits). */
  ticketGained?: number;
  claiming?: boolean;
  claimError?: string | null;
  onClaimTicket?: () => void;
  onContinue: () => void;
};

/** Full-screen win/lose beat — store-app trophy energy. */
export function HandResultOverlay({
  open,
  win,
  title,
  subtitle,
  ticketGained = 0,
  claiming = false,
  claimError = null,
  onClaimTicket,
  onContinue,
}: Props) {
  if (!open) return null;

  const canClaim = win && ticketGained > 0 && Boolean(onClaimTicket);

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

        {canClaim ? (
          <div className="relative mt-5 space-y-2">
            <GradientButton
              className="w-full min-h-12"
              disabled={claiming}
              onClick={() => {
                sound.playClick();
                onClaimTicket?.();
              }}
            >
              {claiming ? "Claiming…" : `Claim ${ticketGained} jackpot ticket${ticketGained === 1 ? "" : "s"}`}
            </GradientButton>
            {claimError ? (
              <p className="text-[11px] font-semibold text-[#FA7185]">{claimError}</p>
            ) : null}
            <button
              type="button"
              className="w-full text-[12px] font-bold text-[#9AA0B4] hover:text-white"
              onClick={() => {
                sound.playClick();
                onContinue();
              }}
            >
              Later
            </button>
          </div>
        ) : (
          <GradientButton
            className="relative mt-6 w-full min-h-12"
            onClick={() => {
              sound.playClick();
              onContinue();
            }}
          >
            {win ? "Deal again" : "Try again"}
          </GradientButton>
        )}
      </div>
    </div>
  );
}
