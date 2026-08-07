"use client";

import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { sound } from "@/lib/sound";
import DailyBonusModal from "@/components/DailyBonusModal";

const CHIP_BUNDLES = [
  { id: 1, name: "Starter Bundle", chips: 50000, price: "$4.99", badge: null, gradient: "from-emerald-600 to-teal-800" },
  { id: 2, name: "Popular Pack", chips: 200000, price: "$14.99", badge: "BEST VALUE", gradient: "from-river-cyan to-blue-700", popular: true },
  { id: 3, name: "High Roller", chips: 500000, price: "$29.99", badge: "+20% EXTRA", gradient: "from-violet-600 to-indigo-900" },
  { id: 4, name: "Whale VIP", chips: 1000000, price: "$49.99", badge: "MOST CHIPS", gradient: "from-amber-500 to-orange-700" },
  { id: 5, name: "Mega Chest", chips: 2500000, price: "$99.99", badge: "2x BONUS", gradient: "from-pink-600 to-rose-800" },
  { id: 6, name: "Ultimate River Pack", chips: 5000000, price: "$199.99", badge: "3x BONUS", gradient: "from-yellow-400 to-amber-600" },
];

const CARD_BACKS = [
  { id: "classic", name: "Classic Royal Blue", price: 0, gradient: "from-blue-800 to-indigo-950", icon: "♦" },
  { id: "neon", name: "Neon Cyber Pulse", price: 10000, gradient: "from-cyan-600 to-cyan-950", icon: "✨" },
  { id: "royal", name: "Royal Crown Violet", price: 25000, gradient: "from-purple-800 to-violet-950", icon: "👑" },
  { id: "gold", name: "Gold Rush Luxury", price: 50000, gradient: "from-amber-600 to-yellow-900", icon: "💰" },
  { id: "flow", name: "River Flow Wave", price: 100000, gradient: "from-teal-600 to-cyan-900", icon: "🌊" },
  { id: "inco", name: "Inco FHE Encrypted", price: 200000, gradient: "from-emerald-700 to-emerald-950", icon: "🔒" },
];

const TABLE_FELTS = [
  { id: "green", name: "Classic Emerald", price: 0, color: "#0A3428" },
  { id: "blue", name: "Midnight Navy", price: 15000, color: "#0C2D5A" },
  { id: "purple", name: "Royal Amethyst", price: 30000, color: "#2D1B4E" },
  { id: "red", name: "Ruby Crimson", price: 50000, color: "#4A1A1A" },
];

export default function ShopPage() {
  const {
    chips,
    addChips,
    equippedCardBack,
    equippedTableFelt,
    ownedCardBacks,
    ownedTableFelts,
    buyCardBack,
    buyTableFelt,
    equipCardBack,
    equipTableFelt,
  } = useGame();

  const [tab, setTab] = useState<"chips" | "cards" | "felts">("chips");
  const [bonusOpen, setBonusOpen] = useState(false);
  const [purchasedNotice, setPurchasedNotice] = useState<string | null>(null);

  const handleBuyBundle = (bundleName: string, amount: number, priceStr: string) => {
    sound.playWin();
    addChips(amount);
    setPurchasedNotice(`🎉 Purchased ${bundleName} (${amount.toLocaleString()} Chips)!`);
    setTimeout(() => setPurchasedNotice(null), 3000);
  };

  const handleCardBackAction = (cb: typeof CARD_BACKS[0]) => {
    if (ownedCardBacks.includes(cb.id)) {
      equipCardBack(cb.id);
      sound.playClick();
      setPurchasedNotice(`Equipped ${cb.name} Card Back!`);
    } else {
      const ok = buyCardBack(cb.id, cb.price);
      if (ok) {
        setPurchasedNotice(`Unlocked & Equipped ${cb.name}!`);
      } else {
        setPurchasedNotice(`Not enough chips! Need ${cb.price.toLocaleString()} chips.`);
      }
    }
    setTimeout(() => setPurchasedNotice(null), 3000);
  };

  const handleFeltAction = (f: typeof TABLE_FELTS[0]) => {
    if (ownedTableFelts.includes(f.id)) {
      equipTableFelt(f.id);
      sound.playClick();
      setPurchasedNotice(`Equipped ${f.name} Table Felt!`);
    } else {
      const ok = buyTableFelt(f.id, f.price);
      if (ok) {
        setPurchasedNotice(`Unlocked & Equipped ${f.name}!`);
      } else {
        setPurchasedNotice(`Not enough chips! Need ${f.price.toLocaleString()} chips.`);
      }
    }
    setTimeout(() => setPurchasedNotice(null), 3000);
  };

  return (
    <div className="p-4 animate-fade-in space-y-4 max-w-4xl mx-auto">
      {/* Toast Notice */}
      {purchasedNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-river-cyan to-blue-600 text-river-bg font-black px-6 py-3 rounded-full shadow-2xl animate-fade-in text-xs sm:text-sm">
          {purchasedNotice}
        </div>
      )}

      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-river-bg2 via-river-bg3 to-river-bg border border-river-gold/30 p-6 overflow-hidden relative shadow-xl">
        <div className="absolute top-[-40px] right-[-30px] w-52 h-52 bg-river-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-river-gold/20 text-river-gold border border-river-gold/40 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              🛍 Official River Casino Shop
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-white">Chip & Customization Shop</h2>
            <p className="text-river-grey text-xs">
              Your Chip Balance: <span className="text-river-gold font-black text-sm">{chips.toLocaleString()} Chips</span>
            </p>
          </div>
          <div className="text-5xl sm:text-6xl drop-shadow-lg animate-float flex-shrink-0">
            🪙
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-river-line/60 pb-3">
        {[
          { key: "chips" as const, label: "Chip Bundles", icon: "💰" },
          { key: "cards" as const, label: "Card Backs", icon: "🃏" },
          { key: "felts" as const, label: "Table Felts", icon: "🟢" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              sound.playClick();
              setTab(t.key);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition border shadow-sm ${
              tab === t.key
                ? "bg-gradient-to-r from-river-gold/20 to-amber-500/20 border-river-gold/60 text-river-gold shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                : "bg-river-bg2 border-river-line text-river-grey hover:text-white"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Chip Store Grid */}
      {tab === "chips" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {CHIP_BUNDLES.map((b) => (
            <div
              key={b.id}
              className={`rounded-3xl bg-river-bg2/90 border overflow-hidden card-hover relative flex flex-col justify-between shadow-lg ${
                b.popular ? "border-river-cyan/60" : "border-river-line"
              }`}
            >
              {b.badge && (
                <div className="absolute top-3 right-3 bg-gradient-to-r from-river-gold to-amber-500 text-[9px] font-black text-amber-950 px-2.5 py-0.5 rounded-full z-10 shadow">
                  {b.badge}
                </div>
              )}
              <div className={`h-28 bg-gradient-to-br ${b.gradient} p-4 flex flex-col items-center justify-center text-center relative`}>
                <div className="font-display font-black text-2xl text-white drop-shadow-lg">
                  +{b.chips.toLocaleString()}
                </div>
                <div className="text-[10px] text-white/80 font-black uppercase tracking-widest">
                  CHIPS
                </div>
              </div>

              <div className="p-4 text-center space-y-3 bg-river-bg2/90">
                <div className="text-xs font-bold text-white">{b.name}</div>
                <button
                  onClick={() => handleBuyBundle(b.name, b.chips, b.price)}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-river-gold via-amber-400 to-yellow-500 text-amber-950 font-black text-xs glow-gold hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  BUY FOR {b.price}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card Back Store Grid */}
      {tab === "cards" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CARD_BACKS.map((c) => {
            const isOwned = ownedCardBacks.includes(c.id);
            const isEquipped = equippedCardBack === c.id;

            return (
              <div
                key={c.id}
                className={`rounded-3xl bg-river-bg2/90 border overflow-hidden card-hover shadow-lg ${
                  isEquipped ? "border-river-cyan shadow-[0_0_20px_rgba(34,211,238,0.3)]" : "border-river-line"
                }`}
              >
                <div className={`h-32 bg-gradient-to-br ${c.gradient} p-3 flex items-center justify-center relative`}>
                  <div className="w-16 h-24 rounded-xl border-2 border-white/40 bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-2xl shadow-xl">
                    {c.icon}
                  </div>
                  {isEquipped && (
                    <div className="absolute top-2 left-2 bg-river-cyan text-river-bg text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                      EQUIPPED
                    </div>
                  )}
                  {isOwned && !isEquipped && (
                    <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                      OWNED
                    </div>
                  )}
                </div>

                <div className="p-3 text-center space-y-2">
                  <div className="text-xs font-bold text-white">{c.name}</div>
                  <button
                    onClick={() => handleCardBackAction(c)}
                    className={`w-full py-2 rounded-xl font-black text-xs transition shadow ${
                      isEquipped
                        ? "bg-river-cyan/20 border border-river-cyan text-river-cyan"
                        : isOwned
                        ? "bg-river-bg3 hover:bg-river-bg1 border border-river-line text-white"
                        : "bg-gradient-to-r from-river-gold to-amber-500 text-amber-950 glow-gold"
                    }`}
                  >
                    {isEquipped
                      ? "Active Card Back"
                      : isOwned
                      ? "Equip Back"
                      : `Unlock ${c.price.toLocaleString()} Chips`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Felt Store Grid */}
      {tab === "felts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TABLE_FELTS.map((f) => {
            const isOwned = ownedTableFelts.includes(f.id);
            const isEquipped = equippedTableFelt === f.id;

            return (
              <div
                key={f.id}
                className={`rounded-3xl bg-river-bg2/90 border overflow-hidden card-hover shadow-lg ${
                  isEquipped ? "border-river-cyan shadow-[0_0_20px_rgba(34,211,238,0.3)]" : "border-river-line"
                }`}
              >
                <div className="h-28 flex items-center justify-center p-3 relative" style={{ backgroundColor: f.color }}>
                  <div className="w-28 h-16 rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-sm flex items-center justify-center text-xs text-white/50 font-bold">
                    Poker Felt Preview
                  </div>
                  {isEquipped && (
                    <div className="absolute top-3 left-3 bg-river-cyan text-river-bg text-[9px] font-black px-2.5 py-0.5 rounded-full shadow">
                      EQUIPPED
                    </div>
                  )}
                </div>

                <div className="p-4 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white">{f.name}</div>
                    <div className="text-[10px] text-river-grey">
                      {f.price === 0 ? "Free Default" : `${f.price.toLocaleString()} Chips`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleFeltAction(f)}
                    className={`px-4 py-2 rounded-xl font-black text-xs transition shadow ${
                      isEquipped
                        ? "bg-river-cyan/20 border border-river-cyan text-river-cyan"
                        : isOwned
                        ? "bg-river-bg3 hover:bg-river-bg1 border border-river-line text-white"
                        : "bg-gradient-to-r from-river-gold to-amber-500 text-amber-950 glow-gold"
                    }`}
                  >
                    {isEquipped ? "Active" : isOwned ? "Equip Felt" : "Buy Felt"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Free Daily Bonus Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-river-gold/15 to-amber-500/15 border border-river-gold/30 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🎁</div>
          <div>
            <div className="text-xs font-black text-white">Daily Bonus Claim</div>
            <div className="text-[11px] text-river-grey">
              Earn 100,000 free chips + 1,000 XP every 24 hours
            </div>
          </div>
        </div>
        <button
          onClick={() => setBonusOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-river-gold to-amber-500 text-amber-950 font-black text-xs glow-gold hover:scale-105 active:scale-95 transition-all shadow"
        >
          CLAIM NOW
        </button>
      </div>

      {/* Daily Bonus Modal */}
      <DailyBonusModal isOpen={bonusOpen} onClose={() => setBonusOpen(false)} />
    </div>
  );
}
