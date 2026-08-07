"use client";

import { useState } from "react";

const CHIP_BUNDLES = [
  { id: 1, name: "Starter Pack", chips: "50,000", price: "$4.99", badge: null, gradient: "from-emerald-500 to-emerald-700", popular: false },
  { id: 2, name: "Popular", chips: "200,000", price: "$14.99", badge: "BEST VALUE", gradient: "from-river-cyan to-blue-600", popular: true },
  { id: 3, name: "High Roller", chips: "500,000", price: "$29.99", badge: null, gradient: "from-violet-500 to-violet-700", popular: false },
  { id: 4, name: "Whale", chips: "1,000,000", price: "$49.99", badge: "MOST CHIPS", gradient: "from-amber-500 to-orange-600", popular: false },
  { id: 5, name: "Mega Pack", chips: "2,500,000", price: "$99.99", badge: "2x BONUS", gradient: "from-pink-500 to-rose-600", popular: false },
  { id: 6, name: "Ultimate", chips: "5,000,000", price: "$199.99", badge: "3x BONUS", gradient: "from-yellow-400 to-amber-500", popular: false },
];

const CARD_BACKS = [
  { id: 1, name: "Classic", price: "Free", owned: true, gradient: "from-blue-800 to-blue-950", pattern: "diamonds" },
  { id: 2, name: "Neon Cyan", price: "10,000 chips", owned: false, gradient: "from-cyan-600 to-cyan-900", pattern: "glow" },
  { id: 3, name: "Royal Violet", price: "25,000 chips", owned: false, gradient: "from-violet-600 to-purple-900", pattern: "crown" },
  { id: 4, name: "Gold Rush", price: "50,000 chips", owned: false, gradient: "from-amber-500 to-yellow-700", pattern: "coins" },
  { id: 5, name: "River Flow", price: "100,000 chips", owned: false, gradient: "from-teal-500 to-cyan-700", pattern: "waves" },
  { id: 6, name: "Inco Secure", price: "200,000 chips", owned: false, gradient: "from-green-500 to-emerald-800", pattern: "lock" },
];

const TABLE_FELTS = [
  { id: 1, name: "Classic Green", price: "Free", owned: true, color: "#0A3428" },
  { id: 2, name: "Midnight Blue", price: "15,000 chips", owned: false, color: "#0C2D5A" },
  { id: 3, name: "Royal Purple", price: "30,000 chips", owned: false, color: "#2D1B4E" },
  { id: 4, name: "Ruby Red", price: "50,000 chips", owned: false, color: "#4A1A1A" },
];

export default function ShopPage() {
  const [tab, setTab] = useState<"chips" | "cards" | "felts">("chips");

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-river-bg2/95 to-river-bg/95 border border-river-gold/25 overflow-hidden relative p-5">
        <div className="absolute top-[-40px] right-[-30px] w-48 h-48 bg-river-gold/15 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="text-5xl">🛍</div>
          <div>
            <h2 className="font-display text-2xl font-bold">Shop</h2>
            <p className="text-river-grey text-xs mt-1">Chips, card backs, and table felts</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 mt-4">
        {[{ key: "chips" as const, label: "Chips", icon: "💰" }, { key: "cards" as const, label: "Card Backs", icon: "🃏" }, { key: "felts" as const, label: "Table Felts", icon: "🟢" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition border ${
            tab === t.key ? "bg-river-gold/15 border-river-gold/40 text-river-gold" : "bg-river-bg2 border-river-line text-river-grey"
          }`}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Chip bundles */}
      {tab === "chips" && (
        <div className="grid grid-cols-2 gap-2.5 px-4 mt-4">
          {CHIP_BUNDLES.map((b) => (
            <div key={b.id} className={`rounded-2xl bg-river-bg2 border overflow-hidden card-hover relative ${
              b.popular ? "border-river-cyan/40" : "border-river-line"
            }`}>
              {b.badge && (
                <div className="absolute top-2 right-2 bg-gradient-to-r from-river-gold to-amber-500 text-[9px] font-bold text-river-bg px-2 py-0.5 rounded-full z-10">{b.badge}</div>
              )}
              <div className={`h-20 bg-gradient-to-br ${b.gradient} flex items-center justify-center`}>
                <div className="text-center">
                  <div className="text-2xl font-display font-black text-white drop-shadow-lg">{b.chips}</div>
                  <div className="text-[10px] text-white/80 font-semibold">chips</div>
                </div>
              </div>
              <div className="p-3 text-center">
                <div className="text-xs text-river-grey mb-1">{b.name}</div>
                <button className="w-full py-2 rounded-xl bg-gradient-to-r from-river-gold to-amber-500 text-river-bg font-bold text-sm glow-gold hover:translate-y-[-1px] transition">
                  {b.price}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card backs */}
      {tab === "cards" && (
        <div className="grid grid-cols-3 gap-2.5 px-4 mt-4">
          {CARD_BACKS.map((c) => (
            <div key={c.id} className="rounded-2xl bg-river-bg2 border border-river-line overflow-hidden card-hover">
              <div className={`h-28 bg-gradient-to-br ${c.gradient} flex items-center justify-center relative`}>
                <div className="w-14 h-20 rounded-lg border-2 border-white/30 bg-white/10 flex items-center justify-center text-white/60 text-lg">
                  {c.pattern === "lock" ? "🔒" : c.pattern === "crown" ? "👑" : c.pattern === "coins" ? "💰" : c.pattern === "waves" ? "🌊" : c.pattern === "glow" ? "✨" : "♦"}
                </div>
                {c.owned && <div className="absolute top-2 left-2 bg-river-green/90 text-[9px] font-bold text-river-bg px-2 py-0.5 rounded-full">OWNED</div>}
              </div>
              <div className="p-2.5 text-center">
                <div className="text-[11px] font-bold">{c.name}</div>
                <div className="text-[10px] text-river-grey mt-0.5">{c.owned ? "Equipped" : c.price}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table felts */}
      {tab === "felts" && (
        <div className="grid grid-cols-2 gap-2.5 px-4 mt-4">
          {TABLE_FELTS.map((f) => (
            <div key={f.id} className="rounded-2xl bg-river-bg2 border border-river-line overflow-hidden card-hover">
              <div className="h-24 flex items-center justify-center" style={{ background: f.color }}>
                <div className="w-20 h-12 rounded-lg border border-white/20 bg-white/5" />
              </div>
              <div className="p-3 text-center">
                <div className="text-xs font-bold">{f.name}</div>
                <div className="text-[10px] text-river-grey mt-0.5">{f.owned ? "Equipped" : f.price}</div>
                {!f.owned && <button className="mt-2 w-full py-1.5 rounded-lg bg-river-bg3 border border-river-line text-river-grey text-[11px] font-bold hover:border-river-gold/40 hover:text-river-gold transition">Buy</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daily bonus reminder */}
      <div className="mx-4 mt-4 mb-4 p-4 rounded-2xl bg-gradient-to-r from-river-gold/10 to-amber-500/10 border border-river-gold/25 flex items-center gap-3">
        <div className="text-3xl">🎁</div>
        <div className="flex-1">
          <div className="text-sm font-bold">Daily Bonus Available</div>
          <div className="text-xs text-river-grey">Claim 100,000 free chips every 24 hours</div>
        </div>
        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-river-gold to-amber-500 text-river-bg font-bold text-sm glow-gold">Claim</button>
      </div>
    </div>
  );
}
