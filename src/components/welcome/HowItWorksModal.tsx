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
    body: "Only you see your hole cards until showdown. Real hidden cards, not a fake flip.",
  },
  {
    icon: CardsIcon,
    title: "Fold · Check · Raise",
    body: "Play full streets: preflop, flop, turn, river. Pick Fold, Check/Call, or Raise when it is your turn.",
  },
  {
    icon: TrophyIcon,
    title: "Wins earn tickets",
    body: "You win if they fold or your hand is better at showdown. Green banner means win. Red means lose.",
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
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-title"
      onClick={onClose}
    >
      <div
        className="animate-rise w-full max-w-md overflow-hidden rounded-[28px] border border-white/12 bg-[#161322] shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/8 bg-gradient-to-br from-[#F5C518]/15 via-transparent to-[#7B5CFF]/10 px-5 pb-4 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#F5C518]">Tips</p>
          <h2 id="how-it-works-title" className="mt-1 font-display text-2xl font-black text-white">
            How it works
          </h2>
          <p className="mt-1 text-sm text-[#9AA0B4]">
            Sixty seconds. Then you are ready to sit down.
          </p>
        </div>

        <ul className="max-h-[min(58vh,420px)] space-y-3 overflow-y-auto px-5 py-4">
          {TIPS.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="flex gap-3 rounded-2xl border border-white/6 bg-white/[0.03] p-3"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5C518]/12 text-[#F5C518]">
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
            className="brand-gradient flex min-h-12 w-full items-center justify-center rounded-2xl text-sm font-black text-[#1A1400] shadow-[0_10px_28px_rgba(245,197,24,0.28)] transition hover:brightness-105"
          >
            Got it. Let&apos;s go
          </button>
        </div>
      </div>
    </div>
  );
}
