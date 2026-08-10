"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { GoogleMark, MetaMaskMark } from "@/components/icons";
import { GradientButton } from "@/components/ui/GradientButton";
import { HowItWorksModal } from "@/components/welcome/HowItWorksModal";
import { WelcomeFeltHero } from "@/components/welcome/WelcomeFeltHero";
import { sound } from "@/lib/sound";
import {
  clearLinkedIdentity,
  claimWalletForGoogle,
  googleForWallet,
  pauseWalletLink,
  readLinkedIdentity,
  resumeWalletLink,
  walletForGoogleUser,
  writeLinkedIdentity,
} from "@/lib/identity";
import { useGame } from "@/context/GameContext";

type AuthGateContextValue = {
  ready: boolean;
  googleUser: User | null;
  walletConnected: boolean;
  walletAddress: string | null;
  /** Remembered wallet for this Google account even if MetaMask is disconnected */
  rememberedWallet: string | null;
  signedIn: boolean;
  linkedComplete: boolean;
  linkGoogle: () => Promise<void>;
  linkWallet: () => void;
  signOutGoogle: () => Promise<void>;
  logoutAll: () => Promise<void>;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used inside AuthGate");
  return ctx;
}

type WelcomeStep = "home" | "start";

function EntryScreen({
  onGoogle,
  onWallet,
  googleLoading,
  walletLoading,
  googleError,
}: {
  onGoogle: () => void;
  onWallet: () => void;
  googleLoading: boolean;
  walletLoading: boolean;
  googleError: string | null;
}) {
  const [step, setStep] = useState<WelcomeStep>("home");
  const [howOpen, setHowOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(245,197,24,0.28), transparent 52%), radial-gradient(ellipse 70% 50% at 50% 55%, rgba(20,90,55,0.45), transparent 62%), radial-gradient(ellipse 48% 36% at 92% 78%, rgba(32,89,62,0.3), transparent 52%), linear-gradient(180deg, #0B0A14 0%, #0e1210 45%, #0B0A14 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[18%] h-[42%] opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(36,138,88,0.55) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-24 h-40 w-40 rounded-full bg-[#F5C518]/12 blur-3xl animate-float"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-28 h-36 w-36 rounded-full bg-emerald-600/14 blur-3xl animate-float-delayed"
      />

      <div className="relative w-full max-w-md space-y-5 animate-fade-in">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-[36px] bg-[#F5C518]/20 blur-2xl"
            />
            <Image
              src="/brand/mi-mark.svg"
              alt="pi River"
              width={88}
              height={88}
              className="relative h-[88px] w-[88px] rounded-[28px] shadow-[0_0_0_1px_rgba(245,197,24,0.45),0_24px_56px_rgba(245,197,24,0.35)]"
              priority
            />
          </div>
          <h1 className="mt-5 font-display text-[2.75rem] font-black leading-[1.02] tracking-tight text-white sm:text-5xl">
            pi <span className="brand-text">River</span>
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#9AA0B4]">
            {step === "home"
              ? "Heads-up Hold’em. Play, earn jackpot tickets."
              : "Pick how you want to join. Google is the fastest."}
          </p>
        </div>

        {step === "home" ? (
          <>
            <WelcomeFeltHero />
            <div className="relative space-y-3 overflow-hidden rounded-[28px] border border-[#F5C518]/22 bg-[linear-gradient(165deg,rgba(22,28,24,0.97),rgba(12,14,16,0.98))] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/50 to-transparent"
              />
              <GradientButton
                size="lg"
                className="w-full text-base"
                onClick={() => {
                  sound.unlock();
                  setStep("start");
                }}
              >
                Sit at the table
              </GradientButton>
              <button
                type="button"
                onClick={() => setHowOpen(true)}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/14 bg-white/[0.06] text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:bg-white/10"
              >
                How it works
              </button>
            </div>
          </>
        ) : (
          <div className="relative space-y-3 overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(165deg,rgba(22,28,24,0.97),rgba(12,14,16,0.98))] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
            <button
              type="button"
              onClick={onGoogle}
              disabled={googleLoading}
              className="relative z-10 flex min-h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-2xl bg-white px-4 text-sm font-black text-slate-900 shadow-[0_10px_28px_rgba(255,255,255,0.12)] transition hover:bg-slate-100 disabled:opacity-50"
            >
              <GoogleMark className="h-5 w-5" />
              {googleLoading ? "Opening Google…" : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7d8398]">
                or
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={onWallet}
              disabled={walletLoading}
              className="relative z-10 flex min-h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-2xl border border-[#F5C518]/25 bg-[#1a1f1c] px-4 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-[#F5C518]/40 hover:bg-[#222a26] disabled:opacity-50"
            >
              <MetaMaskMark className="h-6 w-6 shrink-0" />
              {walletLoading ? "Connecting…" : "Continue with MetaMask"}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-[#7d8398]">
              Phone tip: Google play needs no wallet. MetaMask opens in the MetaMask app.
            </p>

            {googleError ? (
              <p className="text-center text-xs font-semibold text-[#FF8A3D]">{googleError}</p>
            ) : null}

            <button
              type="button"
              onClick={() => setStep("home")}
              className="w-full pt-1 text-center text-xs font-bold text-[#9AA0B4] underline-offset-2 hover:text-white hover:underline"
            >
              Back
            </button>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7d8398]">
            Powered by
          </p>
          <Image
            src="/brand/inco-logo.png"
            alt="Inco"
            width={120}
            height={28}
            className="h-7 w-auto opacity-95"
          />
        </div>
      </div>

      <HowItWorksModal open={howOpen} onClose={() => setHowOpen(false)} />
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { address, isConnected, status: accountStatus } = useAccount();
  const { connectAsync, connectors, isPending: walletLoading } = useConnect();
  const { disconnect } = useDisconnect();
  const { flushCloudProgress } = useGame();
  const [ready, setReady] = useState(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [rememberedWallet, setRememberedWallet] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setGoogleUser(data.user ?? null);
      setReady(true);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: { user: User | null } | null) => {
      setGoogleUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Keep Google ↔ wallet link in local storage (never auto-bind a new MetaMask account)
  useEffect(() => {
    if (!googleUser && !isConnected) return;

    if (googleUser) {
      writeLinkedIdentity({
        googleUserId: googleUser.id,
        email: googleUser.email ?? null,
      });
      const saved = walletForGoogleUser(googleUser.id);
      setRememberedWallet(saved);
      return;
    }

    // Wallet-only session — reject if this wallet already belongs to a Google
    if (isConnected && address) {
      const owner = googleForWallet(address);
      if (owner) {
        setGoogleError(
          "This wallet is linked to a Google account. Sign in with that Google — or use a different wallet."
        );
        pauseWalletLink();
        disconnect();
        setRememberedWallet(null);
        return;
      }
      writeLinkedIdentity({
        googleUserId: null,
        email: null,
        walletAddress: address,
        walletPaused: false,
      });
      setRememberedWallet(address.toLowerCase());
    }
  }, [googleUser, isConnected, address, disconnect]);

  // Intentionally no auto MetaMask reconnect after Google — keeps play popup-free.

  const signedIn = Boolean(googleUser) || isConnected;
  const linkedComplete = Boolean(googleUser) && isConnected;

  async function startGoogle() {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setGoogleError(error.message || "Google sign-in is not ready yet. Try a wallet instead.");
        setGoogleLoading(false);
      }
    } catch {
      setGoogleError("Could not open Google. Try again, or continue with a wallet.");
      setGoogleLoading(false);
    }
  }

  async function startWallet() {
    setGoogleError(null);
    const hasInjected =
      typeof window !== "undefined" &&
      Boolean((window as Window & { ethereum?: unknown }).ethereum);
    const mobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // Mobile Safari/Chrome have no injected MetaMask — open the dapp inside MetaMask
    if (!hasInjected && mobile) {
      const hostPath = `${window.location.host}${window.location.pathname}${window.location.search}`;
      window.location.href = `https://metamask.app.link/dapp/${hostPath}`;
      setGoogleError("Opening MetaMask… Or just Continue with Google — no wallet needed to play.");
      return;
    }

    const connector = connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (!connector) {
      setGoogleError(
        mobile
          ? "On phone, tap Continue with Google to play. Wallet is optional."
          : "No browser wallet found. Install MetaMask, then refresh — or continue with Google."
      );
      return;
    }
    resumeWalletLink();
    try {
      const result = await connectAsync({ connector });
      const addr = (result.accounts?.[0] || address)?.toLowerCase();
      if (!addr) {
        setGoogleError("Wallet connected, but no address returned. Try again.");
        return;
      }

      if (googleUser?.id) {
        const claim = claimWalletForGoogle(googleUser.id, addr);
        if (!claim.ok) {
          pauseWalletLink();
          disconnect();
          setGoogleError(claim.reason);
          return;
        }
        setRememberedWallet(addr);
        return;
      }

      const owner = googleForWallet(addr);
      if (owner) {
        pauseWalletLink();
        disconnect();
        setGoogleError(
          "This wallet is linked to a Google account. Sign in with that Google — or use a different wallet."
        );
        return;
      }

      writeLinkedIdentity({
        googleUserId: null,
        email: null,
        walletAddress: addr,
        walletPaused: false,
      });
      setRememberedWallet(addr);
    } catch {
      setGoogleError(
        mobile
          ? "Wallet connect failed. Tap Continue with Google to play without MetaMask."
          : "Could not connect wallet. Try MetaMask, or continue with Google."
      );
    }
  }

  async function signOutGoogleOnly() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setGoogleUser(null);
    writeLinkedIdentity({ googleUserId: null, email: null });
  }

  async function logoutAll() {
    try {
      await flushCloudProgress();
    } catch {
      // still sign out
    }
    await signOutGoogleOnly();
    if (isConnected) {
      pauseWalletLink();
      disconnect();
    }
    clearLinkedIdentity();
    setRememberedWallet(null);
  }

  const value = useMemo<AuthGateContextValue>(
    () => ({
      ready,
      googleUser,
      walletConnected: isConnected,
      walletAddress: address ?? rememberedWallet,
      rememberedWallet,
      signedIn,
      linkedComplete,
      linkGoogle: startGoogle,
      linkWallet: startWallet,
      signOutGoogle: signOutGoogleOnly,
      logoutAll,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, googleUser, isConnected, address, rememberedWallet, signedIn, linkedComplete, walletLoading, connectors, accountStatus]
  );

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/brand/mi-mark.svg"
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 animate-pulse rounded-2xl"
            priority
          />
          <p className="text-sm font-bold text-[#9AA0B4]">Loading pi River…</p>
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <AuthGateContext.Provider value={value}>
        <EntryScreen
          onGoogle={startGoogle}
          onWallet={() => void startWallet()}
          googleLoading={googleLoading}
          walletLoading={walletLoading}
          googleError={googleError}
        />
      </AuthGateContext.Provider>
    );
  }

  return <AuthGateContext.Provider value={value}>{children}</AuthGateContext.Provider>;
}
