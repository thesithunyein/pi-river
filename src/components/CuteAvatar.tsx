"use client";

import type { ReactElement } from "react";
import { cn } from "@/lib/cn";

export type CuteAvatarId =
  | "club-runner"
  | "gold-stack"
  | "night-bluff"
  | "felt-core"
  | "violet-read"
  | "river-ace";

type Props = {
  id: string;
  size?: number;
  className?: string;
  showRing?: boolean;
};

/** Cute cartoon seat avatars — distinct characters, not letter badges. */
export function CuteAvatar({ id, size = 40, className, showRing = false }: Props) {
  const Art = ART_BY_ID[id as CuteAvatarId] ?? ClubRunnerArt;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full",
        showRing ? "ring-2 ring-[#F5C518]/50" : "",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 80 80" width={size} height={size} className="block h-full w-full">
        <Art />
      </svg>
    </div>
  );
}

function FaceBase({
  skin,
  blush = "#fda4af",
}: {
  skin: string;
  blush?: string;
}) {
  return (
    <>
      <circle cx="40" cy="42" r="22" fill={skin} />
      <ellipse cx="30" cy="46" rx="4" ry="2.5" fill={blush} opacity="0.55" />
      <ellipse cx="50" cy="46" rx="4" ry="2.5" fill={blush} opacity="0.55" />
      <circle cx="32" cy="40" r="2.4" fill="#1e1b2e" />
      <circle cx="48" cy="40" r="2.4" fill="#1e1b2e" />
      <circle cx="32.7" cy="39.3" r="0.7" fill="#fff" />
      <circle cx="48.7" cy="39.3" r="0.7" fill="#fff" />
      <path
        d="M35 48c2.2 2.8 7.8 2.8 10 0"
        fill="none"
        stroke="#1e1b2e"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  );
}

function ClubRunnerArt() {
  return (
    <>
      <rect width="80" height="80" fill="#0e7490" />
      <circle cx="40" cy="40" r="38" fill="#22d3ee" opacity="0.25" />
      {/* fox-ish ears */}
      <path d="M22 30 L28 14 L36 28 Z" fill="#f97316" />
      <path d="M44 28 L52 14 L58 30 Z" fill="#f97316" />
      <path d="M25 28 L29 18 L34 27 Z" fill="#fdba74" />
      <path d="M46 27 L51 18 L55 28 Z" fill="#fdba74" />
      <FaceBase skin="#fdba74" />
      {/* club badge */}
      <circle cx="40" cy="58" r="6" fill="#164e63" />
      <path
        d="M40 54c-2 0-3.5 1.4-3.5 3s1.5 2.5 3.5 3.5c2-1 3.5-1.9 3.5-3.5s-1.5-3-3.5-3z"
        fill="#67e8f9"
      />
    </>
  );
}

function GoldStackArt() {
  return (
    <>
      <rect width="80" height="80" fill="#b45309" />
      <circle cx="40" cy="40" r="38" fill="#fbbf24" opacity="0.28" />
      {/* chip crown */}
      <ellipse cx="40" cy="22" rx="16" ry="5" fill="#f59e0b" />
      <ellipse cx="40" cy="19" rx="16" ry="5" fill="#fde68a" />
      <ellipse cx="40" cy="16" rx="16" ry="5" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
      <FaceBase skin="#fde68a" blush="#fbbf24" />
      <path d="M34 42h3M43 42h3" stroke="#b45309" strokeWidth="1.4" strokeLinecap="round" />
      {/* sparkle eyes vibe via brows */}
      <path d="M28 35h7M45 35h7" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function NightBluffArt() {
  return (
    <>
      <rect width="80" height="80" fill="#1e1b4b" />
      <circle cx="40" cy="40" r="38" fill="#6366f1" opacity="0.3" />
      {/* hood */}
      <path d="M18 48c0-18 10-32 22-32s22 14 22 32v6H18z" fill="#312e81" />
      <FaceBase skin="#c7d2fe" blush="#a5b4fc" />
      {/* mask */}
      <path d="M26 39h28v6c0 2-2 4-5 4H31c-3 0-5-2-5-4z" fill="#1e1b4b" opacity="0.85" />
      <circle cx="32" cy="41.5" r="1.6" fill="#a5b4fc" />
      <circle cx="48" cy="41.5" r="1.6" fill="#a5b4fc" />
      {/* moon */}
      <path d="M58 18c-1 4-4 7-8 7 4 1 8-2 9-7z" fill="#e0e7ff" />
    </>
  );
}

function FeltCoreArt() {
  return (
    <>
      <rect width="80" height="80" fill="#065f46" />
      <circle cx="40" cy="40" r="38" fill="#34d399" opacity="0.28" />
      {/* leaf ears / panda-ish */}
      <ellipse cx="24" cy="28" rx="9" ry="11" fill="#064e3b" />
      <ellipse cx="56" cy="28" rx="9" ry="11" fill="#064e3b" />
      <FaceBase skin="#ecfdf5" blush="#6ee7b7" />
      <ellipse cx="32" cy="39" rx="5" ry="6" fill="#064e3b" opacity="0.35" />
      <ellipse cx="48" cy="39" rx="5" ry="6" fill="#064e3b" opacity="0.35" />
      <circle cx="32" cy="40" r="2.2" fill="#022c22" />
      <circle cx="48" cy="40" r="2.2" fill="#022c22" />
      {/* tiny leaf */}
      <path d="M40 56c4-6 10-6 10 0-4 2-7 2-10 0z" fill="#34d399" />
    </>
  );
}

function VioletReadArt() {
  return (
    <>
      <rect width="80" height="80" fill="#4c1d95" />
      <circle cx="40" cy="40" r="38" fill="#c4b5fd" opacity="0.25" />
      {/* owl tufts */}
      <path d="M26 26 L30 14 L36 26 Z" fill="#7c3aed" />
      <path d="M44 26 L50 14 L54 26 Z" fill="#7c3aed" />
      <ellipse cx="40" cy="44" rx="20" ry="18" fill="#ddd6fe" />
      {/* big owl eyes */}
      <circle cx="32" cy="40" r="7" fill="#fff" />
      <circle cx="48" cy="40" r="7" fill="#fff" />
      <circle cx="32" cy="41" r="3.2" fill="#1e1b4b" />
      <circle cx="48" cy="41" r="3.2" fill="#1e1b4b" />
      <circle cx="33" cy="40" r="1" fill="#fff" />
      <circle cx="49" cy="40" r="1" fill="#fff" />
      <path d="M38 46 L40 50 L42 46 Z" fill="#f59e0b" />
      <path
        d="M34 54c3 3 9 3 12 0"
        fill="none"
        stroke="#5b21b6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  );
}

function RiverAceArt() {
  return (
    <>
      <rect width="80" height="80" fill="#9f1239" />
      <circle cx="40" cy="40" r="38" fill="#fb7185" opacity="0.28" />
      {/* shark-ish fin */}
      <path d="M40 10 L48 26 L32 26 Z" fill="#e11d48" />
      <FaceBase skin="#fecdd3" blush="#fb7185" />
      {/* determined brows */}
      <path d="M27 35l8 2M45 37l8-2" stroke="#881337" strokeWidth="1.8" strokeLinecap="round" />
      {/* ace badge */}
      <rect x="33" y="54" width="14" height="12" rx="2" fill="#fff1f2" />
      <text
        x="40"
        y="63"
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        fill="#be123c"
        fontFamily="system-ui,sans-serif"
      >
        A
      </text>
    </>
  );
}

const ART_BY_ID: Record<CuteAvatarId, () => ReactElement> = {
  "club-runner": ClubRunnerArt,
  "gold-stack": GoldStackArt,
  "night-bluff": NightBluffArt,
  "felt-core": FeltCoreArt,
  "violet-read": VioletReadArt,
  "river-ace": RiverAceArt,
};
