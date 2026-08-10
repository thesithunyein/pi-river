"use client";

import { useState, type ReactNode } from "react";
import { ChevronIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Collapsed-by-default disclosure — keeps secondary gaming detail off the main surface. */
export function SoftExpand({
  title,
  hint,
  badge,
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  bare = false,
  className,
}: {
  title: string;
  hint?: string;
  badge?: string | number | null;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** No card chrome — title row sits on the page background. */
  bare?: boolean;
  className?: string;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const controlled = typeof openProp === "boolean";
  const open = controlled ? openProp : uncontrolled;

  function setOpen(next: boolean) {
    if (!controlled) setUncontrolled(next);
    onOpenChange?.(next);
  }

  return (
    <div
      className={cn(
        bare
          ? "overflow-hidden"
          : "overflow-hidden rounded-[22px] border border-white/10 bg-black/25",
        className
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 text-left transition",
          bare
            ? "rounded-xl px-0.5 py-2 hover:opacity-90"
            : "px-4 py-3.5 hover:bg-white/[0.04]"
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">{title}</p>
          {hint ? (
            <p className="mt-0.5 truncate text-[11px] font-semibold text-[#9AA0B4]">{hint}</p>
          ) : null}
        </div>
        {badge != null && badge !== "" ? (
          <span className="shrink-0 rounded-full border border-[#F5C518]/35 bg-[#F5C518]/12 px-2 py-0.5 text-[10px] font-black text-[#F5C518]">
            {badge}
          </span>
        ) : null}
        <ChevronIcon
          className={cn(
            "h-4 w-4 shrink-0 text-[#9AA0B4] transition-transform duration-200",
            open && "rotate-180 text-[#F5C518]"
          )}
        />
      </button>
      {open ? (
        <div
          className={cn(
            "animate-fade-in",
            bare ? "pt-2" : "border-t border-white/8 px-3 pb-3.5 pt-3"
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
