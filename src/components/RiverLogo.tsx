"use client";

import React from "react";

interface RiverLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export default function RiverLogo({ size = "md", showText = true, className = "" }: RiverLogoProps) {
  const sizeMap = {
    sm: { box: "w-8 h-8 rounded-[10px]", text: "text-base", iconSize: 32 },
    md: { box: "w-10 h-10 rounded-[12px]", text: "text-xl", iconSize: 40 },
    lg: { box: "w-16 h-16 rounded-[20px]", text: "text-3xl", iconSize: 64 },
    xl: { box: "w-24 h-24 rounded-[28px]", text: "text-5xl", iconSize: 96 },
  };

  const dim = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* 3D Bubble Sky-Blue Badge */}
      <div
        className={`${dim.box} bg-gradient-to-br from-sky-400 via-sky-500 to-cyan-600 flex items-center justify-center relative overflow-hidden shadow-[0_8px_20px_rgba(2,132,199,0.45)] border border-sky-300/40 hover:scale-105 transition-transform duration-200 flex-shrink-0`}
      >
        {/* Top Radial Flare */}
        <div className="absolute -top-3 -right-3 w-3/4 h-3/4 bg-white/40 rounded-full blur-sm pointer-events-none" />
        <div className="absolute top-1 left-1.5 w-1/2 h-1/3 bg-white/30 rounded-full blur-[1px] pointer-events-none" />

        {/* Arch Crown accent */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-4/5 flex justify-center opacity-90 pointer-events-none">
          <svg viewBox="0 0 100 30" className="w-full h-auto">
            <path d="M 10 25 Q 50 5 90 25 Q 50 12 10 25 Z" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Letter 'R' / Bubbly text */}
        <span
          className="font-display font-black text-white drop-shadow-[0_4px_6px_rgba(2,132,199,0.8)] tracking-tighter"
          style={{ fontSize: dim.iconSize * 0.52 }}
        >
          R
        </span>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-100 to-sky-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${dim.text}`}
          >
            RIVER
          </span>
          <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-sky-400 -mt-1">
            ONCHAIN POKER
          </span>
        </div>
      )}
    </div>
  );
}
