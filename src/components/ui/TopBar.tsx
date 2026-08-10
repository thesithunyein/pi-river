"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { MoreIcon, WalletIcon } from "@/components/icons";
import { PremiumChip } from "@/components/PremiumChip";
import { useAuthGate } from "@/components/AuthGate";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLevelBadge } from "@/components/PlayerLevelBadge";
import { useGame } from "@/context/GameContext";
import { GradientButton } from "@/components/ui/GradientButton";
import { forceBaseSepolia, baseSepolia } from "@/lib/wallet/forceBaseSepolia";
import { pauseWalletLink } from "@/lib/identity";
import { usePlaySession } from "@/hooks/usePlaySession";
import { BuyChipsModal } from "@/components/BuyChipsModal";
import { sound } from "@/lib/sound";

export function TopBar() {
  const { chips, megapotCredits, xp, stats } = useGame();
  const { googleUser, logoutAll, rememberedWallet, linkWallet } = useAuthGate();
  const play = usePlaySession();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const [menuOpen, setMenuOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  const displayAddr = play.address ?? address ?? rememberedWallet;
  const short = displayAddr ? `${displayAddr.slice(0, 4)}…${displayAddr.slice(-4)}` : "";

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-[#F5C518]/10 bg-[#0B0A14]/85 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/35 to-transparent"
      />
      <div className="relative mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2.5">
          <Image
            src="/brand/mi-mark.svg"
            alt="pi"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl shadow-[0_0_0_1px_rgba(245,197,24,0.4),0_8px_20px_rgba(245,197,24,0.15)]"
            priority
          />
          <div className="min-w-0 leading-tight">
            <p className="font-display text-[17px] font-black tracking-tight text-white">
              pi <span className="text-[#F5C518]">River</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8398]">
              {play.silent ? "Seat ready" : googleUser ? "Signed in" : "Welcome"}
            </p>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setBuyOpen(true);
            }}
            title="Buy chips with Base Sepolia ETH"
            className="flex items-center gap-1.5 rounded-full border border-[#F5C518]/25 bg-gradient-to-b from-[#2a2210] to-black/40 py-1.5 pl-2 pr-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.35)] sm:pl-2.5 sm:pr-2"
          >
            <PremiumChip size={22} tone="gold" />
            <span className="font-mono text-xs font-bold tabular-nums text-white sm:text-sm">
              {chips.toLocaleString()}
            </span>
            <span
              aria-hidden
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F5C518] text-[15px] font-black leading-none text-black"
            >
              +
            </span>
          </button>
          {megapotCredits > 0 ? (
            <Link
              href="/rewards"
              className="rounded-full border border-[#F5C518]/30 bg-[#F5C518]/15 px-2 py-1.5 text-[10px] font-black text-[#F5C518] sm:px-2.5"
              title="Jackpot ticket credits"
            >
              {megapotCredits}t
            </Link>
          ) : null}

          <div className="relative">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label="More actions"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#9AA0B4] transition hover:bg-white/10 hover:text-white"
            >
              <MoreIcon className="h-4 w-4" />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 animate-fade-in overflow-hidden rounded-2xl border border-white/12 bg-[#14121c] p-2 shadow-[0_20px_48px_rgba(0,0,0,0.55)]">
                <div className="mb-2 px-2 pt-1">
                  <PlayerLevelBadge xp={xp} wins={stats.gamesWon} compact />
                </div>

                {play.silent ? (
                  <p className="mb-1 rounded-xl border border-[#F5C518]/25 bg-[#F5C518]/10 px-3 py-2 text-[11px] font-bold text-[#F5C518]">
                    Play ready
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setBuyOpen(true);
                  }}
                  className="mb-1 flex w-full min-h-10 items-center gap-2 rounded-xl border border-[#F5C518]/25 bg-[#F5C518]/10 px-3 text-xs font-bold text-[#F5C518] transition hover:bg-[#F5C518]/15"
                >
                  <PremiumChip size={16} tone="gold" />
                  Buy chip packs
                </button>

                {isConnected ? (
                  <>
                    {chainId !== baseSepolia.id ? (
                      <GradientButton
                        variant="secondary"
                        className="mb-1 w-full min-h-10 justify-start px-3 text-xs border-[#FF8A3D]/40 text-[#FF8A3D]"
                        onClick={() => {
                          forceBaseSepolia(switchChainAsync);
                          setMenuOpen(false);
                        }}
                      >
                        Fix network
                      </GradientButton>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        pauseWalletLink();
                        disconnect();
                        setMenuOpen(false);
                      }}
                      className="mb-1 flex w-full min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white transition hover:bg-white/10"
                      title="Disconnect wallet"
                    >
                      <WalletIcon className="h-4 w-4 text-[#F5C518]" />
                      {short || "Wallet"}
                    </button>
                  </>
                ) : rememberedWallet ? (
                  <GradientButton
                    className="mb-1 w-full min-h-10 justify-start px-3 text-xs"
                    icon={<WalletIcon className="h-4 w-4" />}
                    disabled={isPending}
                    onClick={() => {
                      linkWallet();
                      setMenuOpen(false);
                    }}
                  >
                    Reconnect
                  </GradientButton>
                ) : googleUser ? null : (
                  <GradientButton
                    className="mb-1 w-full min-h-10 justify-start px-3 text-xs"
                    icon={<WalletIcon className="h-4 w-4" />}
                    disabled={isPending || !connectors[0]}
                    onClick={() => {
                      if (connectors[0]) connect({ connector: connectors[0] });
                      setMenuOpen(false);
                    }}
                  >
                    {isPending ? "…" : "Wallet"}
                  </GradientButton>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void logoutAll();
                  }}
                  className="flex w-full min-h-10 items-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-[#9AA0B4] transition hover:bg-white/10 hover:text-white"
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>

          <Link href="/profile" className="shrink-0">
            <PlayerAvatar size={36} />
          </Link>
        </div>
      </div>
    </header>
    <BuyChipsModal open={buyOpen} onClose={() => setBuyOpen(false)} />
    </>
  );
}
