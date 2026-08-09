import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#F5C518]/90">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full bg-[#F5C518] shadow-[0_0_10px_rgba(245,197,24,0.8)]"
            />
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-[28px] font-black leading-none tracking-tight text-white sm:text-[32px]">
          {title}
        </h2>
        {description ? (
          <p className="max-w-md text-[13px] leading-relaxed text-[#9AA0B4]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
