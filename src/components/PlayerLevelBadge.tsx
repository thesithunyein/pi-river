"use client";

import { cn } from "@/lib/cn";
import { getPlayerLevel, levelTitle, xpIntoLevel } from "@/lib/missions";

export function PlayerLevelBadge({
  xp,
  wins,
  compact = false,
  className,
}: {
  xp: number;
  wins: number;
  compact?: boolean;
  className?: string;
}) {
  const level = getPlayerLevel(xp, wins);
  const title = levelTitle(level);
  const { pct, into, span, toNext } = xpIntoLevel(xp);

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[#F5C518]/30 bg-[#F5C518]/10 px-2.5 py-1 text-[10px] font-black text-[#F5C518]",
          className
        )}
        title={`${into}/${span} XP · ${toNext} to next`}
      >
        Lv.{level} · {title}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9AA0B4]">
          Level {level} · {title}
        </p>
        <span className="font-mono text-[11px] font-black text-[#F5C518]">
          {into}/{span} XP
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#F5C518] to-[#E8791A] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] font-semibold text-[#7d8398]">
        {toNext} XP to Level {level + 1} · {wins} wins
      </p>
    </div>
  );
}
