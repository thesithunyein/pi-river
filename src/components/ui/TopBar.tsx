"use client";

import Image from "next/image";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { CoinIcon, WalletIcon } from "@/components/icons";
import { useGame } from "@/context/GameContext";
import { GradientButton } from "@/components/ui/GradientButton";

export function TopBar() {
  const { chips, profile } = useGame();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : "";

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0B0A14]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2.5">
          <Image
            src="/brand/mi-mark.svg"
            alt="mi"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl shadow-[0_0_0_1px_rgba(245,197,24,0.35)]"
            priority
          />
          <div className="min-w-0 leading-tight">
            <p className="font-display text-[17px] font-black tracking-tight text-white">
              mi <span className="text-[#F5C518]">River</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8398]">
              Base Sepolia
            </p>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 sm:flex">
            <CoinIcon className="h-4 w-4 text-[#F5C518]" />
            <span className="font-mono text-sm font-bold tabular-nums text-white">
              {chips.toLocaleString()}
            </span>
          </div>

          {isConnected ? (
            <>
              {chainId !== baseSepolia.id ? (
                <GradientButton
                  variant="secondary"
                  className="min-h-10 px-3 text-xs"
                  onClick={() => switchChain({ chainId: baseSepolia.id })}
                >
                  Switch network
                </GradientButton>
              ) : null}
              <button
                type="button"
                onClick={() => disconnect()}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-bold text-white transition hover:bg-white/10"
              >
                <WalletIcon className="h-4 w-4 text-[#F5C518]" />
                {short}
              </button>
            </>
          ) : (
            <GradientButton
              className="min-h-10 px-4 text-xs"
              icon={<WalletIcon className="h-4 w-4" />}
              disabled={isPending}
              onClick={() => connect({ connector: connectors[0] })}
            >
              {isPending ? "…" : "Connect"}
            </GradientButton>
          )}

          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#F5C518] text-sm font-black text-[#1A1400]"
            aria-label="Profile"
          >
            {(profile.displayName || "P").slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}
