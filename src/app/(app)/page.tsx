"use client";

import { useState } from "react";
import Link from "next/link";

const GAME_MODES = [
  { id: "heads-up", name: "Heads-Up Rush", type: "Quick Match", stake: "20 / 40", players: 1204, gradient: "from-blue-900 to-blue-950", emoji: "🃏" },
  { id: "pocket", name: "Pocket Queens", type: "No Limit", stake: "50 / 100", players: 847, gradient: "from-purple-900 to-indigo-950", emoji: "♠️" },
  { id: "allin", name: "All-In or Fold", type: "Simplified", stake: "10 / 20", players: 2103, gradient: "from-emerald-900 to-emerald-950", emoji: "🎯" },
  { id: "tournament", name: "River Rush", type: "Tournament", stake: "500K pool", players: 64, gradient: "from-orange-900 to-red-950", emoji: "🏆" },
  { id: "highroller", name: "High Roller", type: "No Limit", stake: "500 / 1K", players: 86, gradient: "from-green-900 to-green-950", emoji: "💰" },
  { id: "shortdeck", name: "Short Deck", type: "6+ Hold'em", stake: "100 / 200", players: 412, gradient: "from-purple-900 to-purple-950", emoji: "🎲" },
];

const WINNERS = [
  { name: "Kenji", hand: "Full House, Kings full", amount: "+45,000", color: "from-cyan-500 to-cyan-700" },
  { name: "Pia", hand: "Flush, Ace high", amount: "+120,000", color: "from-pink-500 to-pink-700" },
  { name: "Maya", hand: "Straight, Ten high", amount: "+28,000", color: "from-amber-500 to-amber-700" },
  { name: "Alex", hand: "Two Pair, Aces and Kings", amount: "+15,000", color: "from-violet-500 to-violet-700" },
];

const FILTERS = ["All games", "Quick Match", "Friends", "Tournaments", "High Stakes"];

export default function LobbyPage() {
  const [activeFilter, setActiveFilter] = useState("All games");

  return (
    <div className="animate-fade-in">
      {/* Hero banner */}
      <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-river-bg2/95 to-river-bg/95 border border-river-violet/25 overflow-hidden relative">
        <div className="absolute top-[-60px] right-[-40px] w-60 h-60 bg-river-violet/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-40px] left-[-20px] w-44 h-44 bg-river-cyan/15 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-4 p-5">
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold leading-tight">Claim Your<br />Bonus!</h2>
            <p className="text-river-grey text-xs mt-1 mb-3">100 free chips + 50,000 bonus. Today only.</p>
            <button className="bg-gradient-to-r from-river-green to-emerald-600 text-emerald-950 font-bold border-none rounded-xl py-2.5 px-6 text-sm glow-green hover:translate-y-[-2px] transition">CLAIM</button>
          </div>
          <div className="w-28 h-28 rounded-full bg-river-cyan/10 flex items-center justify-center animate-float">
            <svg viewBox="0 0 120 120" className="w-24 h-24 drop-shadow-lg">
              <circle cx="60" cy="60" r="50" fill="url(#kbg)" />
              <defs><radialGradient id="kbg"><stop offset="0" stopColor="#22D3EE" stopOpacity="0.3"/><stop offset="1" stopColor="#22D3EE" stopOpacity="0"/></radialGradient></defs>
              <ellipse cx="50" cy="65" rx="30" ry="20" fill="#FF9F6E"/>
              <ellipse cx="52" cy="72" rx="22" ry="13" fill="#FFD9C2" opacity="0.8"/>
              <circle cx="38" cy="58" r="5" fill="#0A0E1A"/><circle cx="37" cy="57" r="2" fill="#fff"/>
              <ellipse cx="44" cy="66" rx="4" ry="3" fill="#FFB6C1" opacity="0.7"/>
              <path d="M36 70 Q39 73 42 70" stroke="#7A4A2B" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Prize pool */}
      <div className="mx-4 mt-3 p-5 rounded-2xl bg-gradient-to-br from-purple-950/90 to-river-bg/95 border border-river-magenta/25 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-river-violet/15 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="text-[11px] text-river-grey uppercase tracking-widest font-bold">Prize pool</div>
          <div className="font-display font-black text-4xl bg-gradient-to-r from-river-gold to-amber-500 bg-clip-text text-transparent my-1 drop-shadow-lg">$500,000</div>
          <div className="text-xs text-river-grey">Time left <span className="text-river-white font-bold">00:23:30:56</span></div>
          <button className="mt-3 px-8 py-2.5 bg-gradient-to-r from-river-magenta to-river-violet text-white font-bold border-none rounded-full text-sm glow-magenta hover:translate-y-[-2px] transition">PARTICIPATE</button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="mx-4 mt-4 flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-river-bg2 border border-river-line rounded-xl px-3 py-2.5">
          <svg className="w-4 h-4 text-river-grey flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="Search games..." className="bg-transparent border-none text-river-white text-sm w-full outline-none placeholder:text-river-grey" readOnly />
        </div>
        <button className="flex items-center gap-1.5 bg-river-bg2 border border-river-line rounded-xl px-3 py-2.5 text-river-grey text-xs font-bold">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
          Filter
        </button>
      </div>
      <div className="flex gap-1.5 px-4 mt-2 overflow-x-auto scrollbar-none">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
            activeFilter === f
              ? "bg-river-cyan/12 border-river-cyan/40 text-river-cyan"
              : "bg-river-bg3 border-river-line text-river-grey"
          }`}>{f}</button>
        ))}
      </div>

      {/* Game cards */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-river-grey uppercase tracking-widest font-bold">Quick Match</span>
          <span className="text-river-cyan text-xs font-bold cursor-pointer">View all</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {GAME_MODES.map((g) => (
            <Link key={g.id} href="/table" className={`rounded-2xl overflow-hidden bg-river-bg2 border border-river-line card-hover cursor-pointer`}>
              <div className={`h-24 bg-gradient-to-br ${g.gradient} flex items-center justify-center text-3xl relative`}>
                <span className="relative z-10">{g.emoji}</span>
                <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-river-bg2/90 to-transparent" />
              </div>
              <div className="px-3 pt-2 pb-3">
                <div className="font-bold text-sm">{g.name}</div>
                <div className="text-[10.5px] text-river-grey">{g.type}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Winner feed */}
      <div className="px-4 mt-4 mb-4">
        <div className="text-[11px] text-river-grey uppercase tracking-widest font-bold mb-2">Recent Winners</div>
        <div className="bg-river-bg2 border border-river-line rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-river-gold" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
            <span className="text-[11px] text-river-grey uppercase tracking-widest font-bold">Live winners</span>
          </div>
          {WINNERS.map((w, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 border-t border-river-line/50 first:border-t-0">
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${w.color} flex items-center justify-center text-[10px] font-bold text-river-bg`}>{w.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">{w.name}</div>
                <div className="text-[10.5px] text-river-grey truncate">{w.hand}</div>
              </div>
              <div className="text-xs font-bold text-river-gold">{w.amount}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
