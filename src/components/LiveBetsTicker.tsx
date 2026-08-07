"use client";

import React from "react";
import Link from "next/link";
import { getAvatarForPlayer } from "@/lib/avatars";

interface BetItem {
  id: string;
  game: string;
  player: string;
  payout: string;
}

const LIVE_BETS: BetItem[] = [
  { id: "b1", game: "Heads-Up Rush", player: "Kenji", payout: "$109,500" },
  { id: "b2", game: "River Rush", player: "Maya", payout: "$340,000" },
  { id: "b3", game: "Pocket Queens", player: "Jonas", payout: "$88,200" },
  { id: "b4", game: "Short Deck", player: "Pia", payout: "$154,000" },
  { id: "b5", game: "High Roller", player: "Sithu", payout: "$500,000" },
  { id: "b6", game: "All-In or Fold", player: "Alex", payout: "$42,000" },
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
        {LIVE_BETS.map((bet) => {
          const avatar = getAvatarForPlayer(bet.player);
          return (
            <Link
              key={bet.id}
              href="/table"
              className="flex items-center gap-2 bg-river-bg2/90 border border-river-line/80 hover:border-river-cyan/50 px-2.5 py-1 rounded-xl flex-shrink-0 transition hover:scale-105"
            >
              <div
                className={`w-6 h-6 rounded-lg bg-gradient-to-br ${avatar.gradient} border ${avatar.border} flex items-center justify-center text-xs text-white shadow-sm`}
              >
                <span>{avatar.emoji}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-river-grey/90 leading-tight">{bet.player}</span>
                <span className="text-[11px] font-black text-river-gold leading-tight">{bet.payout}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
