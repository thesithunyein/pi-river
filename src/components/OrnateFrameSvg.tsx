"use client";

import { cn } from "@/lib/cn";

function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="45%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>
  );
}

function gold(uid: string) {
  return `url(#${uid}-gold)`;
}

/** Vector ornate frames — gold + magenta gems, hole always centered. */
export function OrnateFrameSvg({
  variant,
  className,
}: {
  variant: string;
  className?: string;
}) {
  const uid = `fr-${variant}`;
  const g = gold(uid);
  const common = {
    viewBox: "0 0 100 100",
    className: cn("h-full w-full overflow-visible", className),
    "aria-hidden": true as const,
  };

  switch (variant) {
    case "shield":
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <path
            d="M18 28 C18 18 32 12 50 12 C68 12 82 18 82 28 L82 58 C82 78 50 90 50 90 C50 90 18 78 18 58 Z"
            fill="none"
            stroke={g}
            strokeWidth="5.5"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="20" r="3.2" fill="#c026d3" stroke="#f59e0b" strokeWidth="1.2" />
          <path d="M14 40 L6 34 L12 52 Z" fill={g} />
          <path d="M86 40 L94 34 L88 52 Z" fill={g} />
          <circle cx="12" cy="42" r="2.5" fill="#c026d3" />
          <circle cx="88" cy="42" r="2.5" fill="#c026d3" />
        </svg>
      );
    case "winged":
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <circle cx="50" cy="54" r="32" fill="none" stroke={g} strokeWidth="6" />
          <path d="M38 22 L50 8 L62 22" fill={g} />
          <path d="M30 26 L18 14 L22 30 Z" fill={g} />
          <path d="M70 26 L82 14 L78 30 Z" fill={g} />
          <rect x="44" y="82" width="12" height="8" rx="2" fill="#a21caf" stroke="#fbbf24" strokeWidth="1.2" />
        </svg>
      );
    case "leafy":
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <rect x="18" y="24" width="64" height="58" rx="18" fill="none" stroke={g} strokeWidth="6" />
          <path d="M36 20 C42 6 50 8 50 8 C50 8 58 6 64 20" fill={g} />
          <circle cx="28" cy="78" r="3" fill="#d946ef" />
          <circle cx="72" cy="78" r="3" fill="#d946ef" />
        </svg>
      );
    case "flanked":
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <circle cx="50" cy="50" r="30" fill="none" stroke={g} strokeWidth="6" />
          <ellipse cx="16" cy="50" rx="10" ry="16" fill={g} />
          <ellipse cx="84" cy="50" rx="10" ry="16" fill={g} />
          <circle cx="16" cy="50" r="4" fill="#c026d3" />
          <circle cx="84" cy="50" r="4" fill="#c026d3" />
        </svg>
      );
    case "horned":
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <polygon
            points="50,14 78,30 78,70 50,86 22,70 22,30"
            fill="none"
            stroke={g}
            strokeWidth="5.5"
            strokeLinejoin="round"
          />
          <path d="M26 22 L18 6 L34 18" fill="#e879f9" stroke="#f59e0b" strokeWidth="1" />
          <path d="M74 22 L82 6 L66 18" fill="#e879f9" stroke="#f59e0b" strokeWidth="1" />
        </svg>
      );
    case "batwing":
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <circle cx="50" cy="48" r="28" fill="none" stroke={g} strokeWidth="6" />
          <path d="M24 56 C8 72 6 88 22 84 C18 70 22 62 28 56 Z" fill={g} />
          <path d="M76 56 C92 72 94 88 78 84 C82 70 78 62 72 56 Z" fill={g} />
          <path d="M20 70 L14 78 L24 76 Z" fill="#c026d3" />
          <path d="M80 70 L86 78 L76 76 Z" fill="#c026d3" />
        </svg>
      );
    case "crowned":
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <circle cx="50" cy="56" r="30" fill="none" stroke={g} strokeWidth="6" />
          <path d="M34 30 L42 12 L50 26 L58 12 L66 30 L50 24 Z" fill={g} />
          <circle cx="50" cy="16" r="5" fill="#db2777" stroke="#fbbf24" strokeWidth="1.4" />
        </svg>
      );
    case "diamond":
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <polygon
            points="50,16 80,50 50,84 20,50"
            fill="none"
            stroke={g}
            strokeWidth="5.5"
            strokeLinejoin="round"
          />
          <circle cx="40" cy="18" r="3" fill="#d946ef" />
          <circle cx="60" cy="18" r="3" fill="#d946ef" />
          <path d="M38 10 L40 2 L42 10" fill={g} />
          <path d="M58 10 L60 2 L62 10" fill={g} />
        </svg>
      );
    case "valkyrie":
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <circle cx="50" cy="52" r="28" fill="none" stroke={g} strokeWidth="6" />
          <path d="M22 40 C10 20 18 8 28 18 C24 28 24 36 28 42 Z" fill={g} />
          <path d="M78 40 C90 20 82 8 72 18 C76 28 76 36 72 42 Z" fill={g} />
          <path d="M20 28 L16 16 L26 24" fill="#e879f9" />
          <path d="M80 28 L84 16 L74 24" fill="#e879f9" />
        </svg>
      );
    case "hexwing":
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <polygon
            points="50,18 74,32 74,68 50,82 26,68 26,32"
            fill="none"
            stroke={g}
            strokeWidth="5.5"
            strokeLinejoin="round"
          />
          <path d="M22 44 L10 40 L22 56 Z" fill={g} />
          <path d="M78 44 L90 40 L78 56 Z" fill={g} />
          <circle cx="50" cy="18" r="3.5" fill="#c026d3" stroke="#fbbf24" strokeWidth="1" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <Defs uid={uid} />
          <circle cx="50" cy="50" r="34" fill="none" stroke={g} strokeWidth="5" />
        </svg>
      );
  }
}
