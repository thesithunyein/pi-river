import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Consistent premium page atmosphere for shell tabs. */
export function PremiumPageShell({
  children,
  className,
  tone = "gold",
}: {
  children: ReactNode;
  className?: string;
  tone?: "gold" | "green" | "purple" | "rose";
}) {
  const glow =
    tone === "green"
      ? "rgba(52,211,153,0.16)"
      : tone === "purple"
        ? "rgba(123,92,255,0.18)"
        : tone === "rose"
          ? "rgba(251,113,133,0.14)"
          : "rgba(245,197,24,0.18)";

  return (
    <div className={cn("relative animate-fade-in space-y-6", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-8 h-44 rounded-[40px] blur-2xl"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${glow}, transparent 70%)`,
        }}
      />
      <div className="relative space-y-6">{children}</div>
    </div>
  );
}
