"use client";

import { useState } from "react";
import Link from "next/link";
import LiveBetsTicker from "@/components/LiveBetsTicker";
import CommunityChat from "@/components/CommunityChat";
import DailyBonusModal from "@/components/DailyBonusModal";
import HowItWorksModal from "@/components/HowItWorksModal";
import CreateRoomModal from "@/components/CreateRoomModal";
import RiverLogo from "@/components/RiverLogo";
import { sound } from "@/lib/sound";
import { getAvatarForPlayer } from "@/lib/avatars";

const GAME_MODES = [
  { id: "heads-up", name: "Heads-Up Rush", category: "Quick Match", type: "Quick Match", stake: "20 / 40", players: 1204, gradient: "from-blue-900 via-blue-950 to-river-bg2", emoji: "🃏", badge: "FAST" },
  { id: "pocket", name: "Pocket Queens", category: "Quick Match", type: "No Limit", stake: "50 / 100", players: 847, gradient: "from-purple-900 via-indigo-950 to-river-bg2", emoji: "♠️", badge: "HOT" },
  { id: "allin", name: "All-In or Fold", category: "Quick Match", type: "Simplified", stake: "10 / 20", players: 2103, gradient: "from-emerald-900 via-teal-950 to-river-bg2", emoji: "🎯", badge: "POPULAR" },
  { id: "tournament", name: "River Rush GTD", category: "Tournaments", type: "Tournament", stake: "500K pool", players: 64, gradient: "from-amber-900 via-red-950 to-river-bg2", emoji: "🏆", badge: "$500K GTD" },
  { id: "highroller", name: "High Roller VIP", category: "High Stakes", type: "No Limit", stake: "500 / 1K", players: 86, gradient: "from-green-900 via-emerald-950 to-river-bg2", emoji: "💰", badge: "VIP" },
  { id: "shortdeck", name: "Short Deck 6+", category: "Short Deck", type: "6+ Hold'em", stake: "100 / 200", players: 412, gradient: "from-purple-900 via-violet-950 to-river-bg2", emoji: "🎲", badge: "ACTION" },
];

const WINNERS = [
  { name: "Kenji", hand: "Full House, Kings full", amount: "+45,000" },
  { name: "Pia", hand: "Flush, Ace high", amount: "+120,000" },
  { name: "Maya", hand: "Straight, Ten high", amount: "+28,000" },
  { name: "Alex", hand: "Two Pair, Aces and Kings", amount: "+15,000" },
];

const FILTERS = ["All games", "Quick Match", "Tournaments", "High Stakes", "Short Deck"];

export default function LobbyPage() {
  const [activeFilter, setActiveFilter] = useState("All games");
  const [searchQuery, setSearchQuery] = useState("");
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const filteredGames = GAME_MODES.filter((g) => {
    const matchesFilter = activeFilter === "All games" || g.category === activeFilter;
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="animate-fade-in pb-6">
      {/* Top Live Bets Ticker Ribbon */}
      <LiveBetsTicker />

      <div className="px-4 space-y-4 mt-3">
        {/* Main Hero Welcome Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-sky-950/80 via-river-bg2 to-river-bg border border-sky-400/30 overflow-hidden relative p-6 shadow-2xl">
          <div className="absolute top-[-60px] right-[-40px] w-72 h-72 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-40px] left-[-20px] w-52 h-52 bg-river-cyan/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-river-gold/20 to-amber-500/20 border border-river-gold/40 text-river-gold px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                🎁 Welcome Bonus
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-black leading-tight tracking-tight text-white">
                Welcome to RIVER <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-river-gold via-amber-300 to-yellow-400 drop-shadow">
                  Your Gateway to Big Wins!
                </span>
              </h1>
              <p className="text-river-grey text-xs md:text-sm max-w-md">
                Claim 100,000 free chips + 1,000 XP today. Fully encrypted onchain poker where the house cannot see your cards.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <button
                  onClick={() => {
                    sound.playClick();
                    setBonusModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-river-gold via-amber-400 to-yellow-500 text-amber-950 font-black border-none rounded-2xl py-3 px-6 text-xs sm:text-sm glow-gold hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                >
                  <span>CLAIM 100,000 CHIPS</span>
                  <span className="text-base">✨</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setShowCreateRoom(true);
                  }}
                  className="bg-gradient-to-r from-river-cyan to-blue-600 text-river-bg font-black rounded-2xl py-3 px-5 text-xs sm:text-sm glow-cyan hover:scale-105 active:scale-95 transition flex items-center gap-1.5 shadow-lg"
                >
                  <span>🎲</span>
                  <span>Create Custom Room</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setShowHowItWorks(true);
                  }}
                  className="bg-river-bg3/90 hover:bg-river-bg3 border border-river-cyan/40 text-river-cyan font-black rounded-2xl py-3 px-5 text-xs sm:text-sm transition flex items-center gap-1.5"
                >
                  <span>🎓</span>
                  <span>How It Works</span>
                </button>

                <Link
                  href="/table"
                  className="bg-river-bg3/90 hover:bg-river-bg3 border border-river-line hover:border-river-cyan/40 text-river-white font-bold rounded-2xl py-3 px-5 text-xs sm:text-sm transition flex items-center gap-2"
                >
                  <span>Quick Play</span>
                  <span className="text-river-cyan font-bold">→</span>
                </Link>
              </div>
            </div>

            {/* Mascot / Logo Graphic */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-sky-400/20 via-cyan-500/10 to-river-bg3 border border-sky-300/30 flex items-center justify-center p-3 animate-float flex-shrink-0 shadow-2xl relative">
              <RiverLogo size="xl" showText={false} />
            </div>
          </div>
        </div>

        {/* Prize Pool Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/90 via-river-bg2 to-indigo-950/90 border border-river-magenta/30 text-center relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-river-magenta/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="text-[11px] text-river-grey uppercase tracking-widest font-black">
                🏆 River Rush Tournament Prize Pool
              </div>
              <div className="font-display font-black text-3xl sm:text-4xl bg-gradient-to-r from-river-gold via-amber-300 to-yellow-400 bg-clip-text text-transparent my-0.5 drop-shadow">
                $500,000 GTD
              </div>
              <div className="text-xs text-river-grey">
                Ends in <span className="text-river-white font-bold font-mono">00:23:30:56</span>
              </div>
            </div>
            <Link
              href="/table"
              className="px-7 py-3 bg-gradient-to-r from-river-magenta to-river-violet text-white font-black rounded-2xl text-xs glow-magenta hover:scale-105 active:scale-95 transition-all shadow-lg uppercase tracking-wider flex-shrink-0"
            >
              Join Tournament Now
            </Link>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2.5 bg-river-bg2/90 border border-river-line/80 focus-within:border-river-cyan/60 rounded-2xl px-4 py-2.5 transition shadow-inner">
              <svg className="w-4 h-4 text-river-grey flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games or stakes..."
                className="bg-transparent border-none text-river-white text-xs sm:text-sm w-full outline-none placeholder:text-river-grey/70"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-river-grey hover:text-white text-xs font-bold">
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => {
                  sound.playClick();
                  setActiveFilter(f);
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition border shadow-sm ${
                  activeFilter === f
                    ? "bg-gradient-to-r from-river-cyan/20 to-blue-600/20 border-river-cyan/60 text-river-cyan shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                    : "bg-river-bg2/90 border-river-line/80 text-river-grey hover:text-river-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Game Mode Grid + Side Community Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Game Mode Cards (Col-span 2) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-river-white uppercase tracking-widest font-black flex items-center gap-2">
                <span>♠️</span> Active Poker Tables
              </span>
              <span className="text-river-cyan text-xs font-bold">{filteredGames.length} tables active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredGames.map((g) => (
                <Link
                  key={g.id}
                  href="/table"
                  className="rounded-3xl overflow-hidden bg-river-bg2/90 border border-river-line hover:border-river-cyan/50 transition-all duration-200 card-hover group relative flex flex-col justify-between shadow-lg"
                >
                  <div className={`h-28 bg-gradient-to-br ${g.gradient} p-3 flex flex-col justify-between relative`}>
                    <div className="flex items-center justify-between z-10">
                      <span className="bg-black/50 backdrop-blur-md text-[10px] font-black text-river-gold px-2.5 py-0.5 rounded-full border border-river-gold/30">
                        {g.badge}
                      </span>
                      <span className="text-xs text-white/80 font-bold flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-river-green animate-pulse" />
                        {g.players} players
                      </span>
                    </div>

                    <div className="flex items-center justify-between z-10">
                      <span className="text-4xl drop-shadow-lg group-hover:scale-110 transition-transform">{g.emoji}</span>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-white/70">Blinds / Stakes</div>
                        <div className="font-display font-black text-sm text-river-gold">{g.stake}</div>
                      </div>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-river-bg2 to-transparent" />
                  </div>

                  <div className="p-3.5 flex items-center justify-between bg-river-bg2/90">
                    <div>
                      <div className="font-display font-black text-sm text-white group-hover:text-river-cyan transition">
                        {g.name}
                      </div>
                      <div className="text-[11px] text-river-grey">{g.type}</div>
                    </div>
                    <button className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-river-gold to-amber-500 text-amber-950 font-black text-xs glow-gold group-hover:scale-105 transition-transform">
                      PLAY NOW
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side Community Live Chat Widget */}
          <div className="lg:col-span-1 space-y-3">
            <CommunityChat />
          </div>
        </div>

        {/* Live Winners Feed */}
        <div className="bg-river-bg2/90 border border-river-line rounded-3xl p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🏆</span>
            <span className="text-xs text-river-white uppercase tracking-widest font-black">
              Recent Live Winner Payouts
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {WINNERS.map((w, i) => {
              const avatar = getAvatarForPlayer(w.name);
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-2xl bg-river-bg3/50 border border-river-line/50">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${avatar.gradient} border ${avatar.border} flex items-center justify-center text-lg shadow-sm flex-shrink-0`}>
                    <span>{avatar.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white">{w.name}</div>
                    <div className="text-[10px] text-river-grey truncate">{w.hand}</div>
                    <div className="text-xs font-black text-river-gold">{w.amount} chips</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Bonus Claim Modal */}
      <DailyBonusModal isOpen={bonusModalOpen} onClose={() => setBonusModalOpen(false)} />

      {/* How River Works Interactive Modal */}
      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />

      {/* Create Room Modal */}
      <CreateRoomModal isOpen={showCreateRoom} onClose={() => setShowCreateRoom(false)} />
    </div>
  );
}
