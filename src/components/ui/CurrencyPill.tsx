import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type CurrencyPillProps = {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "gold" | "purple" | "blue";
  className?: string;
};

const toneClassName = {
  gold: "border-river-gold/20 bg-river-gold/10 text-river-gold",
  purple: "border-river-violet/20 bg-river-violet/10 text-river-violet",
  blue: "border-river-cyan/20 bg-river-cyan/10 text-river-cyan",
};

export function CurrencyPill({
  icon,
  label,
  value,
  tone = "gold",
  className,
}: CurrencyPillProps) {
  return (
    <div
      className={cn(
        "inline-flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2",
        toneClassName[tone],
        className
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black/20 text-current">
        {icon}
      </span>
      <span className="leading-tight">
        <span className="block text-[11px] uppercase tracking-[0.2em] text-river-grey">{label}</span>
        <span className="font-mono text-sm font-bold tabular-nums text-river-white">{value}</span>
      </span>
    </div>
  );
}
