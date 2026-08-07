import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  accent?: "default" | "purple" | "gold" | "blue";
};

const accentMap = {
  default: "border-river-line/20",
  purple: "border-river-violet/30 shadow-mi-glow",
  gold: "border-river-gold/30 shadow-[0_18px_42px_rgba(245,197,24,0.12)]",
  blue: "border-river-cyan/30 shadow-[0_18px_42px_rgba(59,130,246,0.14)]",
} satisfies Record<NonNullable<GlassCardProps["accent"]>, string>;

export function GlassCard({
  children,
  className,
  accent = "default",
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-panel rounded-[28px] p-5 text-river-white soft-card-hover",
        accentMap[accent],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
