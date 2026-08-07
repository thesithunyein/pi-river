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
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#F5C518]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-black text-white sm:text-[2rem]">{title}</h2>
        {description ? <p className="max-w-prose text-sm text-[#9AA0B4]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
