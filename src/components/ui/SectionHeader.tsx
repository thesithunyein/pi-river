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
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-river-gold">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-black text-river-white sm:text-[2rem]">{title}</h2>
        {description ? <p className="max-w-prose text-sm text-river-grey">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
