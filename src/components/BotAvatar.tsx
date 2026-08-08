"use client";

import { cn } from "@/lib/cn";

/** Cute gaming bot avatar for River Bot. */
export function BotAvatar({
  size = 36,
  thinking = false,
  className,
}: {
  size?: number;
  thinking?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#F5C518]/50 bg-gradient-to-br from-[#2a1f4d] via-[#1a1430] to-[#0d0a18] shadow-[0_0_0_2px_rgba(245,197,24,0.15)]",
        thinking && "animate-pulse-soft",
        className
      )}
      style={{ width: size, height: size }}
      aria-label="River Bot"
    >
      <svg viewBox="0 0 64 64" className="h-[78%] w-[78%]" aria-hidden>
        <defs>
          <linearGradient id="botFace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F5C518" />
            <stop offset="100%" stopColor="#E29A12" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="30" r="18" fill="url(#botFace)" />
        <rect x="18" y="24" width="28" height="12" rx="6" fill="#1A1400" opacity="0.85" />
        <circle cx="24" cy="30" r="3.2" fill="#67e8f9" className={thinking ? "opacity-100" : "opacity-90"}>
          {thinking ? (
            <animate attributeName="opacity" values="0.4;1;0.4" dur="0.9s" repeatCount="indefinite" />
          ) : null}
        </circle>
        <circle cx="40" cy="30" r="3.2" fill="#67e8f9">
          {thinking ? (
            <animate attributeName="opacity" values="1;0.4;1" dur="0.9s" repeatCount="indefinite" />
          ) : null}
        </circle>
        <path d="M22 42c3 4 17 4 20 0" stroke="#1A1400" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <rect x="12" y="14" width="8" height="6" rx="2" fill="#B9A8FF" />
        <rect x="44" y="14" width="8" height="6" rx="2" fill="#B9A8FF" />
        <path d="M16 14v-4M48 14v-4" stroke="#B9A8FF" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
