"use client";

import React, { useState } from "react";
import { useGame } from "@/context/GameContext";

export default function DailyBonusModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { claimDailyBonus, lastDailyBonusTime } = useGame();
  const [claimed, setClaimed] = useState(false);

  if (!isOpen) return null;

  const now = Date.now();
  const COOLDOWN = 24 * 60 * 60 * 1000;
  const isAvailable = !lastDailyBonusTime || now - lastDailyBonusTime >= COOLDOWN;

  const handleClaim = () => {
    const success = claimDailyBonus();
    if (success) {
      setClaimed(true);
      setTimeout(() => {
        setClaimed(false);
        onClose();
      }, 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-gradient-to-br from-river-bg2 via-river-bg3 to-river-bg border border-river-gold/40 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(251,191,36,0.25)] relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-river-gold/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-river-bg1/80 border border-river-line text-river-grey hover:text-white flex items-center justify-center font-bold text-sm"
        >
          ✕
        </button>

        {/* Big Icon */}
        <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-amber-400 via-river-gold to-orange-500 flex items-center justify-center text-5xl shadow-xl animate-float">
          🎁
        </div>

        {/* Title & Desc */}
        <h3 className="font-display font-black text-2xl text-white">Daily Bonus</h3>
        <p className="text-river-grey text-xs mt-1 mb-4">
          Claim <span className="text-river-gold font-bold">100,000 free chips</span> + <span className="text-river-cyan font-bold">1,000 XP</span> every 24 hours!
        </p>

        {claimed ? (
          <div className="py-3 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm animate-bounce">
            🎉 +100,000 Chips Claimed!
          </div>
        ) : isAvailable ? (
          <button
            onClick={handleClaim}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-river-gold via-amber-400 to-yellow-500 text-amber-950 font-black text-base glow-gold hover:scale-[1.02] active:scale-98 transition-all shadow-lg"
          >
            CLAIM NOW
          </button>
        ) : (
          <div className="py-3.5 rounded-2xl bg-river-bg1 border border-river-line text-river-grey font-bold text-xs">
            Bonus Already Claimed Today · Next available in 24h
          </div>
        )}
      </div>
    </div>
  );
}
