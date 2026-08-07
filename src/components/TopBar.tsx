"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import RiverLogo from "@/components/RiverLogo";
import HowItWorksModal from "@/components/HowItWorksModal";
import WalletModal from "@/components/WalletModal";
import { useGame, AVATAR_OPTIONS } from "@/context/GameContext";
import { sound } from "@/lib/sound";

export default function TopBar({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const { chips, profile, walletAddress, isWalletConnected } = useGame();
  const [showGuide, setShowGuide] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  const activeAvatar =
    AVATAR_OPTIONS.find((a) => a.id === profile.avatarId) || AVATAR_OPTIONS[0];

  async function signOut() {
    sound.playClick();
    if (typeof document !== "undefined") {
      document.cookie = "river_guest_mode=; path=/; max-age=0";
    }
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/auth/signin";
  }

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-river-line/80 glass backdrop-blur-xl">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
          <RiverLogo size="sm" showText={true} />
        </Link>

        <div className="flex items-center gap-2">
          {/* Web3 Wallet Button */}
          <button
            onClick={() => {
              sound.playClick();
              setShowWallet(true);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black transition border ${
              isWalletConnected && walletAddress
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "bg-river-bg3/80 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            }`}
            title="Web3 Wallet & Inco Network"
          >
            <span>🦊</span>
            <span className="hidden xs:inline">
              {isWalletConnected && walletAddress
                ? `${walletAddress.slice(0, 5)}...`
                : "Connect Wallet"}
            </span>
          </button>

          {/* How River Works Guide Trigger */}
          <button
            onClick={() => {
              sound.playClick();
              setShowGuide(true);
            }}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-river-bg3/80 border border-river-cyan/40 text-river-cyan hover:bg-river-cyan/20 transition text-[11px] font-black"
            title="How River Poker Works & Rules"
          >
            <span>🎓</span>
            <span>How It Works</span>
          </button>

          {/* Balance */}
          <Link
            href="/shop"
            className="bg-river-bg3/90 hover:bg-river-bg3 border border-river-line/80 hover:border-river-gold/40 rounded-full px-3 py-1 flex items-center gap-2 transition group shadow-inner"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-river-gold flex items-center justify-center text-[10px] font-black text-amber-950 shadow-sm">
              🪙
            </div>
            <div>
              <div className="text-[8px] text-river-grey uppercase tracking-widest font-bold group-hover:text-river-gold transition">
                Chips
              </div>
              <div className="font-display font-black text-xs leading-none text-river-gold">
                {chips.toLocaleString()}
              </div>
            </div>
          </Link>

          <Link
            href="/shop"
            className="w-7 h-7 rounded-full bg-gradient-to-br from-river-gold to-amber-500 text-amber-950 font-black text-xs flex items-center justify-center glow-gold hover:scale-105 active:scale-95 transition-all shadow-md"
            title="Buy Chips"
          >
            +
          </Link>

          {/* Cartoon Avatar & Profile Link */}
          <Link
            href="/profile"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br ${activeAvatar.bgGradient} border ${activeAvatar.borderColor} flex items-center justify-center text-base shadow-lg hover:scale-105 active:scale-95 transition-all relative group`}
            title={`Profile (${profile.displayName})`}
          >
            <span>{activeAvatar.emoji}</span>
            <span className="absolute -bottom-1 -right-1 text-[8px]">{profile.country.split(" ")[0]}</span>
          </Link>

          {/* Sign out */}
          <button
            onClick={signOut}
            className="p-1.5 text-river-grey hover:text-river-red transition text-xs font-bold"
            title="Sign Out / Switch Account"
          >
            🚪
          </button>
        </div>
      </div>

      <HowItWorksModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <WalletModal isOpen={showWallet} onClose={() => setShowWallet(false)} />
    </>
  );
}
