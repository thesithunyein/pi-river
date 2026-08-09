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

/** Glossy 3D-style seat mascots — Coin Master / best-seller energy in pure SVG. */
export function CuteAvatar({ id, size = 40, className, showRing = false }: Props) {
  const Art = ART_BY_ID[id as CuteAvatarId] ?? ClubRunnerArt;
  const pref = (id as CuteAvatarId) in ART_BY_ID ? (id as string) : "club-runner";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full shadow-[0_10px_28px_rgba(0,0,0,0.45)]",
        showRing ? "ring-2 ring-[#F5C518]/60 ring-offset-2 ring-offset-[#0B0A14]" : "",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 80 80" width={size} height={size} className="block h-full w-full">
        <Art uid={pref.replace(/[^a-z0-9]/gi, "")} />
      </svg>
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent" />
    </div>
  );
}

type ArtProps = { uid: string };

function GlossFace({
  uid,
  skinA,
  skinB,
  blush = "#fda4af",
  eye = "#1e1b2e",
}: {
  uid: string;
  skinA: string;
  skinB: string;
  blush?: string;
  eye?: string;
}) {
  const g = `${uid}-skin`;
  return (
    <>
      <defs>
        <radialGradient id={g} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={skinA} />
          <stop offset="100%" stopColor={skinB} />
        </radialGradient>
      </defs>
      <ellipse cx="40" cy="56" rx="16" ry="4" fill="#000" opacity="0.18" />
      <circle cx="40" cy="42" r="22" fill={`url(#${g})`} />
      <ellipse cx="32" cy="34" rx="8" ry="5" fill="#fff" opacity="0.28" />
      <ellipse cx="30" cy="46" rx="5" ry="3" fill={blush} opacity="0.55" />
      <ellipse cx="50" cy="46" rx="5" ry="3" fill={blush} opacity="0.55" />
      <ellipse cx="32" cy="40" rx="3.2" ry="3.6" fill="#fff" />
      <ellipse cx="48" cy="40" rx="3.2" ry="3.6" fill="#fff" />
      <circle cx="32.4" cy="40.4" r="1.8" fill={eye} />
      <circle cx="48.4" cy="40.4" r="1.8" fill={eye} />
      <circle cx="33.1" cy="39.6" r="0.65" fill="#fff" />
      <circle cx="49.1" cy="39.6" r="0.65" fill="#fff" />
      <path
        d="M34 49c2.4 3.2 9.6 3.2 12 0"
        fill="none"
        stroke={eye}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  );
}

function Bg({ uid, a, b, glow }: { uid: string; a: string; b: string; glow: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor={glow} stopOpacity="0.55" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="80" height="80" fill={`url(#${uid}-bg)`} />
      <circle cx="40" cy="36" r="34" fill={`url(#${uid}-glow)`} />
    </>
  );
}

function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x} ${y - 3 * s} L${x + 1.1 * s} ${y - 1.1 * s} L${x + 3 * s} ${y} L${x + 1.1 * s} ${y + 1.1 * s} L${x} ${y + 3 * s} L${x - 1.1 * s} ${y + 1.1 * s} L${x - 3 * s} ${y} L${x - 1.1 * s} ${y - 1.1 * s} Z`}
      fill="#fff"
      opacity="0.9"
    />
  );
}

function ClubRunnerArt({ uid }: ArtProps) {
  return (
    <>
      <Bg uid={uid} a="#0e7490" b="#155e75" glow="#67e8f9" />
      <path d="M20 32 L27 10 L37 30 Z" fill="#ea580c" />
      <path d="M43 30 L53 10 L60 32 Z" fill="#ea580c" />
      <path d="M24 30 L28 16 L34 28 Z" fill="#fdba74" />
      <path d="M46 28 L52 16 L56 30 Z" fill="#fdba74" />
      <GlossFace uid={uid} skinA="#fed7aa" skinB="#fb923c" blush="#fb7185" />
      <defs>
        <linearGradient id={`${uid}-club`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="60" r="8" fill={`url(#${uid}-club)`} stroke="#ecfeff" strokeWidth="1.2" />
      <path
        d="M40 55c-2.4 0-4 1.6-4 3.2 0 2.2 2 3 4 4.2 2-1.2 4-2 4-4.2 0-1.6-1.6-3.2-4-3.2z"
        fill="#fff"
        opacity="0.9"
      />
      <Sparkle x={62} y={18} />
    </>
  );
}

function GoldStackArt({ uid }: ArtProps) {
  return (
    <>
      <Bg uid={uid} a="#b45309" b="#78350f" glow="#fde68a" />
      <defs>
        <linearGradient id={`${uid}-chip`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="24" rx="18" ry="5.5" fill="#92400e" opacity="0.45" />
      <ellipse cx="40" cy="22" rx="17" ry="5" fill={`url(#${uid}-chip)`} />
      <ellipse cx="40" cy="19" rx="17" ry="5" fill={`url(#${uid}-chip)`} stroke="#fef3c7" strokeWidth="1" />
      <ellipse cx="40" cy="16" rx="17" ry="5" fill={`url(#${uid}-chip)`} stroke="#fff7ed" strokeWidth="1.2" />
      <circle cx="40" cy="16" r="5" fill="#b45309" />
      <path d="M40 13v6M37 16h6" stroke="#fde68a" strokeWidth="1.4" strokeLinecap="round" />
      <GlossFace uid={uid} skinA="#fef3c7" skinB="#f59e0b" blush="#fbbf24" eye="#78350f" />
      <path d="M27 34h8M45 34h8" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
      <Sparkle x={14} y={22} s={0.85} />
      <Sparkle x={64} y={28} />
    </>
  );
}

function NightBluffArt({ uid }: ArtProps) {
  return (
    <>
      <Bg uid={uid} a="#1e1b4b" b="#0f0a2a" glow="#818cf8" />
      <path d="M14 52c2-22 12-36 26-36s24 14 26 36v8H14z" fill="#312e81" />
      <path d="M18 50c3-18 11-30 22-30s19 12 22 30" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.5" />
      <GlossFace uid={uid} skinA="#e0e7ff" skinB="#a5b4fc" blush="#818cf8" eye="#1e1b4b" />
      <path d="M24 38h32v7c0 2.5-2.5 4.5-6 4.5H30c-3.5 0-6-2-6-4.5z" fill="#0f0a2a" opacity="0.92" />
      <circle cx="32" cy="41" r="2" fill="#67e8f9" />
      <circle cx="48" cy="41" r="2" fill="#67e8f9" />
      <circle cx="32" cy="41" r="0.7" fill="#fff" />
      <circle cx="48" cy="41" r="0.7" fill="#fff" />
      <path d="M58 16c-1.2 5-5 8.5-9.5 8.5 4.5 1.2 9.5-2.5 10.5-8.5z" fill="#e0e7ff" />
      <Sparkle x={18} y={20} s={0.7} />
    </>
  );
}

function FeltCoreArt({ uid }: ArtProps) {
  return (
    <>
      <Bg uid={uid} a="#065f46" b="#022c22" glow="#6ee7b7" />
      <ellipse cx="22" cy="28" rx="10" ry="12" fill="#064e3b" />
      <ellipse cx="58" cy="28" rx="10" ry="12" fill="#064e3b" />
      <ellipse cx="22" cy="28" rx="5" ry="6" fill="#34d399" opacity="0.35" />
      <ellipse cx="58" cy="28" rx="5" ry="6" fill="#34d399" opacity="0.35" />
      <GlossFace uid={uid} skinA="#ecfdf5" skinB="#a7f3d0" blush="#6ee7b7" eye="#022c22" />
      <ellipse cx="31" cy="39" rx="6" ry="7" fill="#064e3b" opacity="0.4" />
      <ellipse cx="49" cy="39" rx="6" ry="7" fill="#064e3b" opacity="0.4" />
      <circle cx="31.5" cy="40" r="2.4" fill="#022c22" />
      <circle cx="49.5" cy="40" r="2.4" fill="#022c22" />
      <circle cx="32.2" cy="39.2" r="0.7" fill="#fff" />
      <circle cx="50.2" cy="39.2" r="0.7" fill="#fff" />
      <path d="M40 56c5-7 12-6 12 1-5 2.5-8 2.5-12-1z" fill="#34d399" />
      <Sparkle x={64} y={16} />
    </>
  );
}

function VioletReadArt({ uid }: ArtProps) {
  return (
    <>
      <Bg uid={uid} a="#4c1d95" b="#2e1065" glow="#c4b5fd" />
      <path d="M24 28 L30 10 L38 28 Z" fill="#7c3aed" />
      <path d="M42 28 L50 10 L56 28 Z" fill="#7c3aed" />
      <path d="M27 26 L31 14 L35 26 Z" fill="#ddd6fe" />
      <path d="M45 26 L49 14 L53 26 Z" fill="#ddd6fe" />
      <defs>
        <radialGradient id={`${uid}-owl`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </radialGradient>
      </defs>
      <ellipse cx="40" cy="44" rx="22" ry="20" fill={`url(#${uid}-owl)`} />
      <circle cx="31" cy="40" r="8.5" fill="#fff" />
      <circle cx="49" cy="40" r="8.5" fill="#fff" />
      <circle cx="31" cy="41" r="4" fill="#1e1b4b" />
      <circle cx="49" cy="41" r="4" fill="#1e1b4b" />
      <circle cx="32.4" cy="39.6" r="1.3" fill="#fff" />
      <circle cx="50.4" cy="39.6" r="1.3" fill="#fff" />
      <path d="M37 48 L40 54 L43 48 Z" fill="#f59e0b" />
      <path
        d="M33 56c3.5 3.5 10.5 3.5 14 0"
        fill="none"
        stroke="#5b21b6"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Sparkle x={14} y={20} />
      <Sparkle x={66} y={24} s={0.75} />
    </>
  );
}

function RiverAceArt({ uid }: ArtProps) {
  return (
    <>
      <Bg uid={uid} a="#9f1239" b="#4c0519" glow="#fb7185" />
      <defs>
        <linearGradient id={`${uid}-fin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      <path d="M40 8 L52 30 L28 30 Z" fill={`url(#${uid}-fin)`} stroke="#ffe4e6" strokeWidth="1" />
      <GlossFace uid={uid} skinA="#fff1f2" skinB="#fb7185" blush="#e11d48" eye="#881337" />
      <path d="M26 34l10 2.5M44 36.5l10-2.5" stroke="#881337" strokeWidth="2.2" strokeLinecap="round" />
      <defs>
        <linearGradient id={`${uid}-badge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#fecdd3" />
        </linearGradient>
      </defs>
      <rect x="31" y="54" width="18" height="14" rx="3" fill={`url(#${uid}-badge)`} stroke="#be123c" strokeWidth="1.2" />
      <text
        x="40"
        y="65"
        textAnchor="middle"
        fontSize="10"
        fontWeight="900"
        fill="#be123c"
        fontFamily="system-ui,sans-serif"
      >
        A
      </text>
      <Sparkle x={60} y={18} />
    </>
  );
}

const ART_BY_ID: Record<CuteAvatarId, (p: ArtProps) => ReactElement> = {
  "club-runner": ClubRunnerArt,
  "gold-stack": GoldStackArt,
  "night-bluff": NightBluffArt,
  "felt-core": FeltCoreArt,
  "violet-read": VioletReadArt,
  "river-ace": RiverAceArt,
};
