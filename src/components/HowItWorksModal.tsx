"use client";

import React, { useState } from "react";
import { sound } from "@/lib/sound";

export default function HowItWorksModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"rules" | "fhe" | "faq">("rules");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-river-bg2 border border-river-cyan/40 rounded-3xl p-5 sm:p-6 text-left shadow-[0_0_50px_rgba(34,211,238,0.2)] relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow backdrop */}
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-river-cyan/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-river-bg1/80 border border-river-line text-river-grey hover:text-white flex items-center justify-center font-bold text-sm transition"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-river-cyan to-blue-600 flex items-center justify-center text-xl font-bold shadow-md">
            🎓
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-white">How River Poker Works</h3>
            <p className="text-river-grey text-xs">Learn rules, fair play technology, and chip progression</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-river-line pb-2.5 mb-4">
          {[
            { key: "rules" as const, label: "Poker Rules & Hands", icon: "🃏" },
            { key: "fhe" as const, label: "Onchain FHE Privacy", icon: "🔒" },
            { key: "faq" as const, label: "Rewards & VIP", icon: "🎁" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                sound.playClick();
                setActiveTab(t.key);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition border ${
                activeTab === t.key
                  ? "bg-river-cyan/20 border-river-cyan text-river-cyan shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                  : "bg-river-bg1 border-river-line text-river-grey hover:text-white"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs text-river-grey leading-relaxed scrollbar-thin">
          {activeTab === "rules" && (
            <div className="space-y-3">
              <div className="p-3 bg-river-bg3/50 rounded-2xl border border-river-line/60">
                <div className="font-black text-white text-xs mb-1">1. Objective of Texas Hold&apos;em</div>
                <p>
                  Combine your <b>2 private hole cards</b> with the <b>5 community cards</b> on the table to make the best possible 5-card poker hand!
                </p>
              </div>

              <div className="p-3 bg-river-bg3/50 rounded-2xl border border-river-line/60 space-y-1.5">
                <div className="font-black text-white text-xs">2. Hand Rankings (High to Low)</div>
                <ul className="space-y-1 text-[11px] text-river-white font-medium">
                  <li className="flex justify-between border-b border-river-line/30 pb-0.5">
                    <span>👑 Royal Flush</span>
                    <span className="text-river-gold font-bold">A-K-Q-J-10 Same Suit</span>
                  </li>
                  <li className="flex justify-between border-b border-river-line/30 pb-0.5">
                    <span>🔥 Straight Flush</span>
                    <span className="text-river-gold font-bold">5 consecutive cards, same suit</span>
                  </li>
                  <li className="flex justify-between border-b border-river-line/30 pb-0.5">
                    <span>💎 Four of a Kind</span>
                    <span className="text-river-gold font-bold">4 cards of identical rank</span>
                  </li>
                  <li className="flex justify-between border-b border-river-line/30 pb-0.5">
                    <span>🏠 Full House</span>
                    <span className="text-river-gold font-bold">3 of a kind + 1 pair</span>
                  </li>
                  <li className="flex justify-between border-b border-river-line/30 pb-0.5">
                    <span>🌊 Flush</span>
                    <span className="text-river-gold font-bold">5 cards of same suit</span>
                  </li>
                  <li className="flex justify-between border-b border-river-line/30 pb-0.5">
                    <span>📐 Straight</span>
                    <span className="text-river-gold font-bold">5 sequential rank cards</span>
                  </li>
                  <li className="flex justify-between border-b border-river-line/30 pb-0.5">
                    <span>🎯 Three of a Kind</span>
                    <span className="text-river-gold font-bold">3 cards of identical rank</span>
                  </li>
                  <li className="flex justify-between">
                    <span>✌️ Two Pair / Pair</span>
                    <span className="text-river-gold font-bold">Matching ranks</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-river-bg3/50 rounded-2xl border border-river-line/60">
                <div className="font-black text-white text-xs mb-1">3. Betting Rounds</div>
                <p>
                  <b>Preflop</b> (2 Hole Cards) → <b>Flop</b> (First 3 Community Cards) → <b>Turn</b> (4th Card) → <b>River</b> (5th Card) → <b>Showdown</b>!
                </p>
              </div>
            </div>
          )}

          {activeTab === "fhe" && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-200">
                <div className="font-black text-sm text-emerald-300 mb-1 flex items-center gap-1.5">
                  <span>🔒</span> Fully Homomorphic Encryption (Inco Protocol)
                </div>
                <p className="text-[11px] leading-relaxed">
                  In traditional online poker, central servers see all hole cards and can manipulate outcomes or leak data. On River, cards are encrypted end-to-end onchain using Inco FHE!
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2 items-start p-2.5 bg-river-bg3/40 rounded-xl border border-river-line/40">
                  <span className="bg-river-cyan/20 text-river-cyan font-black text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                  <div>
                    <b className="text-white">Zero House Peeking:</b> Even table operators and server admins cannot read your cards.
                  </div>
                </div>

                <div className="flex gap-2 items-start p-2.5 bg-river-bg3/40 rounded-xl border border-river-line/40">
                  <span className="bg-river-cyan/20 text-river-cyan font-black text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                  <div>
                    <b className="text-white">Verifiable Random Shuffling:</b> Onchain randomness ensures every deck is mathematically fair.
                  </div>
                </div>

                <div className="flex gap-2 items-start p-2.5 bg-river-bg3/40 rounded-xl border border-river-line/40">
                  <span className="bg-river-cyan/20 text-river-cyan font-black text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                  <div>
                    <b className="text-white">Instant Onchain Payouts:</b> Pot winnings distribute directly to player balances with zero withdrawal delay.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "faq" && (
            <div className="space-y-3">
              <div className="p-3 bg-river-bg3/50 rounded-2xl border border-river-line/60">
                <div className="font-black text-white text-xs mb-1">🎁 Free Daily Chips & Bonus Chests</div>
                <p>
                  Claim <b>100,000 free chips</b> every 24 hours in the Daily Bonus modal. Complete daily missions to unlock additional XP and chip rewards!
                </p>
              </div>

              <div className="p-3 bg-river-bg3/50 rounded-2xl border border-river-line/60">
                <div className="font-black text-white text-xs mb-1">🛍 Customization Shop</div>
                <p>
                  Use your chips to unlock exclusive card backs (Neon Cyber, Gold Rush, Royal Crown) and table felts (Classic Emerald, Midnight Navy, Ruby Crimson).
                </p>
              </div>

              <div className="p-3 bg-river-bg3/50 rounded-2xl border border-river-line/60">
                <div className="font-black text-white text-xs mb-1">👑 VIP Tier Upgrades</div>
                <p>
                  Accumulate XP from every hand played to level up from Bronze to Gold, Platinum, and Whale VIP tiers!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="pt-3 border-t border-river-line mt-3">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-river-cyan to-blue-600 text-river-bg font-black text-xs glow-cyan hover:scale-[1.02] active:scale-98 transition-all"
          >
            GOT IT, LET&apos;S PLAY!
          </button>
        </div>
      </div>
    </div>
  );
}
