"use client";

import { cn } from "@/lib/cn";

/** Glossy casino chip — used on pot / lobby / win beats. */
export function PremiumChip({
  size = 36,
  tone = "gold",
  className,
}: {
  size?: number;
  tone?: "gold" | "red" | "green" | "purple";
  className?: string;
}) {
  const fills = {
    gold: { outer: "#F5C518", mid: "#c27803", ring: "#fff4c2", center: "#8b5a00" },
    red: { outer: "#fb7185", mid: "#be123c", ring: "#fecdd3", center: "#7f1d1d" },
    green: { outer: "#4ade80", mid: "#15803d", ring: "#bbf7d0", center: "#14532d" },
    purple: { outer: "#c084fc", mid: "#7c3aed", ring: "#e9d5ff", center: "#4c1d95" },
  }[tone];

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]">
        <defs>
          <radialGradient id={`chip-${tone}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor={fills.ring} />
            <stop offset="55%" stopColor={fills.outer} />
            <stop offset="100%" stopColor={fills.mid} />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill={`url(#chip-${tone})`} stroke="#0a0810" strokeWidth="2" />
        <circle cx="32" cy="32" r="22" fill="none" stroke={fills.ring} strokeWidth="3" strokeDasharray="6 5" />
        <circle cx="32" cy="32" r="14" fill={fills.center} stroke={fills.ring} strokeWidth="1.5" />
        <path
          d="M32 22c-4.5 0-7.5 2.8-7.5 6.4 0 4.6 4.2 5.6 7.5 7.2 3.2 1.5 5.5 2.4 5.5 5.1 0 2.6-2.2 4.3-5.5 4.3-2.8 0-5.1-1.2-5.8-3.2"
          fill="none"
          stroke={fills.ring}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/35 to-transparent opacity-70" />
    </span>
  );
}

export function RailLeds({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-4 top-2 flex justify-between gap-1 opacity-90 sm:inset-x-8",
        className
      )}
    >
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#7ef9c2] shadow-[0_0_8px_rgba(126,249,194,0.85)]"
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );
}
