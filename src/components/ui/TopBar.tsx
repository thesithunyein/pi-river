"use client";

import Image from "next/image";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { CoinIcon, WalletIcon } from "@/components/icons";
import { useGame } from "@/context/GameContext";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { GradientButton } from "@/components/ui/GradientButton";

export function TopBar() {
  const { chips, profile } = useGame();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <header className="sticky top-0 z-40 border-b border-river-line/15 bg-river-bg/70 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-2xl pr-2 text-left text-river-white transition hover:opacity-95"
        >
          <Image src="/brand/mi-mark.svg" alt="mi" width={40} height={40} className="h-10 w-10" />
          <div className="min-w-0">
            <p className="font-display text-lg font-black tracking-tight text-river-white">
              mi <span className="text-river-gold">River</span>
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-river-grey">
              Inco Lightning · Base Sepolia
            </p>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <CurrencyPill
              icon={<CoinIcon className="h-5 w-5" />}
              label="Cosmetics"
              value={chips.toLocaleString()}
              tone="gold"
            />
          </div>

          {isConnected ? (
            <>
              {chainId !== baseSepolia.id ? (
                <GradientButton
                  variant="secondary"
                  onClick={() => switchChain({ chainId: baseSepolia.id })}
                >
                  Switch to Base Sepolia
                </GradientButton>
              ) : null}
              <GradientButton
                variant="secondary"
                icon={<WalletIcon className="h-5 w-5" />}
                onClick={() => disconnect()}
              >
                {short}
              </GradientButton>
            </>
          ) : (
            <GradientButton
              icon={<WalletIcon className="h-5 w-5" />}
              disabled={isPending}
              onClick={() => connect({ connector: connectors[0] })}
            >
              {isPending ? "Connecting…" : "Connect wallet"}
            </GradientButton>
          )}

          <Link
            href="/profile"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-river-line/20 bg-river-bg2/85 px-3 text-sm font-bold text-river-white shadow-mi-panel transition hover:border-river-violet/30"
            aria-label="Open profile"
          >
            <span className="font-mono tabular-nums">
              {(profile.displayName || "P").slice(0, 2).toUpperCase()}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
