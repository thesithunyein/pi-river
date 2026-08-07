"use client";

import React from "react";
import Link from "next/link";

interface BetItem {
  id: string;
  game: string;
  player: string;
  payout: string;
  icon: string;
  gradient: string;
}

const LIVE_BETS: BetItem[] = [
  { id: "b1", game: "Heads-Up Rush", player: "johnw...", payout: "$109,500", icon: "🃏", gradient: "from-blue-600 to-cyan-700" },
  { id: "b2", game: "River Rush", player: "maya_p...", payout: "$340,000", icon: "🏆", gradient: "from-orange-600 to-red-700" },
  { id: "b3", game: "Pocket Queens", player: "kenji...", payout: "$88,200", icon: "♠️", gradient: "from-purple-600 to-indigo-700" },
  { id: "b4", game: "Short Deck", player: "pia_v...", payout: "$154,000", icon: "🎲", gradient: "from-purple-600 to-pink-700" },
  { id: "b5", game: "High Roller", player: "sithu...", payout: "$500,000", icon: "💰", gradient: "from-amber-500 to-yellow-600" },
  { id: "b6", game: "All-In or Fold", player: "alex_r...", payout: "$42,000", icon: "🎯", gradient: "from-emerald-600 to-teal-700" },
];

export default function LiveBetsTicker() {
  return (
    <div className="w-full bg-river-bg1/90 border-b border-river-line/60 py-1.5 px-3 flex items-center gap-3 overflow-hidden text-xs">
      {/* Label */}
      <div className="flex items-center gap-1.5 bg-river-cyan/15 text-river-cyan text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0 border border-river-cyan/30">
        <span className="w-2 h-2 rounded-full bg-river-cyan animate-ping" />
        Live Bets
      </div>

      {/* Ticker marquee */}
      <div className="flex-1 overflow-x-auto scrollbar-none flex gap-2.5 items-center">
        {LIVE_BETS.map((bet) => (
          <Link
            key={bet.id}
            href="/table"
            className="flex items-center gap-2 bg-river-bg2/90 border border-river-line/80 hover:border-river-cyan/50 px-2.5 py-1 rounded-xl flex-shrink-0 transition hover:scale-105"
          >
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${bet.gradient} flex items-center justify-center text-xs text-white shadow-sm`}>
              {bet.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-river-grey/90 leading-tight">{bet.player}</span>
              <span className="text-[11px] font-black text-river-gold leading-tight">{bet.payout}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
