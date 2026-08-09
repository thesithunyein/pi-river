import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  accent?: "default" | "purple" | "gold" | "blue" | "green";
  padded?: boolean;
};

const accentMap = {
  default:
    "border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)]",
  purple:
    "border-violet-400/25 shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(167,139,250,0.12)]",
  gold: "border-[#F5C518]/28 shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(245,197,24,0.14)]",
  blue: "border-sky-400/25 shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(56,189,248,0.12)]",
  green:
    "border-emerald-400/25 shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(52,211,153,0.12)]",
} satisfies Record<NonNullable<GlassCardProps["accent"]>, string>;

export function GlassCard({
  children,
  className,
  accent = "default",
  padded = true,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[26px] border bg-[linear-gradient(165deg,rgba(28,26,40,0.96),rgba(14,12,22,0.98))] text-white backdrop-blur-xl soft-card-hover",
        padded && "p-5",
        accentMap[accent],
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      {children}
    </div>
  );
}
