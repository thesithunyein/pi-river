"use client";

import { BoltIcon, CardsIcon, LockIncoIcon, TrophyIcon, UserIcon } from "@/components/icons";

const TIPS = [
  {
    icon: BoltIcon,
    title: "Tap Play",
    body: "Quick Play seats you against River Bot. Challenge lets you share a table number with a friend.",
  },
  {
    icon: LockIncoIcon,
    title: "Your cards stay private",
    body: "Inco Lightning encrypts hole cards. Only you decrypt until showdown — real privacy, not a fake flip.",
  },
  {
    icon: CardsIcon,
    title: "Fold · Check · Raise",
    body: "Play full streets: preflop, flop, turn, river. Pick Fold, Check/Call, or Raise when it is your turn.",
  },
  {
    icon: TrophyIcon,
    title: "Wins earn Megapot tickets",
    body: "Beat the pot and you earn Megapot ticket credits. Claim them on the table or in Rewards — real Base tickets.",
  },
  {
    icon: UserIcon,
    title: "Google is the easy path",
    body: "Continue with Google for instant play. Wallet is optional. Add it later from Profile if you want.",
  },
] as const;

export function HowItWorksModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-4 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-title"
      onClick={onClose}
    >
      <div
        className="animate-rise relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#F5C518]/22 bg-[linear-gradient(165deg,#1c1a28,#0e0c16)] shadow-[0_32px_90px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/55 to-transparent"
        />
        <div className="relative border-b border-white/8 bg-gradient-to-br from-[#F5C518]/18 via-transparent to-emerald-900/20 px-5 pb-4 pt-5">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#F5C518]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F5C518] shadow-[0_0_8px_rgba(245,197,24,0.9)]" />
            Tips
          </p>
          <h2 id="how-it-works-title" className="mt-1.5 font-display text-2xl font-black tracking-tight text-white">
            How it works
          </h2>
          <p className="mt-1 text-sm text-[#9AA0B4]">
            Sixty seconds. Then you are ready to sit down.
          </p>
        </div>

        <ul className="max-h-[min(58vh,420px)] space-y-2.5 overflow-y-auto px-5 py-4">
          {TIPS.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#F5C518]/25 bg-[linear-gradient(160deg,rgba(245,197,24,0.22),rgba(245,197,24,0.06))] text-[#F5C518]">
                <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F5C518] text-[10px] font-black text-[#1a1208] shadow-[0_4px_10px_rgba(245,197,24,0.45)]">
                  {i + 1}
                </span>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-[#9AA0B4]">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-white/8 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="brand-gradient flex min-h-12 w-full items-center justify-center rounded-2xl border border-[#F5C518]/35 text-sm font-black text-[#1A1400] shadow-[0_10px_28px_rgba(245,197,24,0.28),inset_0_1px_0_rgba(255,255,255,0.4)] transition hover:brightness-105"
          >
            Got it. Let&apos;s go
          </button>
        </div>
      </div>
    </div>
  );
}
