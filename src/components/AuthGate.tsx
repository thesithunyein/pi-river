"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { GoogleMark, MetaMaskMark } from "@/components/icons";
import { GradientButton } from "@/components/ui/GradientButton";
import { HowItWorksModal } from "@/components/welcome/HowItWorksModal";
import {
  clearLinkedIdentity,
  pauseWalletLink,
  readLinkedIdentity,
  resumeWalletLink,
  walletForGoogleUser,
  writeLinkedIdentity,
} from "@/lib/identity";

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
            "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(245,197,24,0.28), transparent 55%), radial-gradient(ellipse 55% 45% at 90% 85%, rgba(123,92,255,0.22), transparent 50%), radial-gradient(ellipse 40% 30% at 10% 70%, rgba(32,89,62,0.35), transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-24 h-40 w-40 rounded-full bg-[#F5C518]/10 blur-3xl animate-float"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-28 h-36 w-36 rounded-full bg-[#7B5CFF]/15 blur-3xl animate-float-delayed"
      />

      <div className="relative w-full max-w-md space-y-5 animate-fade-in">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/brand/mi-mark.svg"
            alt="pi River"
            width={96}
            height={96}
            className="h-24 w-24 rounded-[30px] shadow-[0_20px_50px_rgba(245,197,24,0.4)]"
            priority
          />
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#F5C518]/90">
            pi River
          </p>
          <h1 className="mt-2 font-display text-4xl font-black leading-tight text-white">
            {step === "home" ? (
              <>
                Sit down.
                <br />
                <span className="text-[#F5C518]">Have fun.</span>
              </>
            ) : (
              "Get started"
            )}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#9AA0B4]">
            {step === "home"
              ? "Private heads-up poker. Win hands. Earn jackpot tickets."
              : "Pick how you want to join. Google is the fastest."}
          </p>
        </div>

        {step === "home" ? (
          <div className="space-y-3 rounded-[28px] border border-white/10 bg-[#161322]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur">
            <GradientButton
              className="w-full min-h-14 text-base"
              onClick={() => setStep("start")}
            >
              Get started
            </GradientButton>
            <button
              type="button"
              onClick={() => setHowOpen(true)}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/12 bg-white/5 text-sm font-black text-white transition hover:bg-white/10"
            >
              How it works
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-[28px] border border-white/10 bg-[#161322]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur">
            <button
              type="button"
              onClick={onGoogle}
              disabled={googleLoading}
              className="relative z-10 flex min-h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-2xl bg-white px-4 text-sm font-black text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
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
              className="relative z-10 flex min-h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-2xl border border-white/12 bg-[#1f1a2e] px-4 text-sm font-black text-white transition hover:bg-[#2a2438] disabled:opacity-50"
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

        {step === "home" ? (
          <button
            type="button"
            onClick={() => setHowOpen(true)}
            className="mx-auto block text-center text-[11px] font-semibold text-[#7d8398] underline-offset-2 hover:text-[#F5C518] hover:underline"
          >
            New here? Peek at the tips
          </button>
        ) : null}
      </div>

      <HowItWorksModal open={howOpen} onClose={() => setHowOpen(false)} />
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { address, isConnected, status: accountStatus } = useAccount();
  const { connectAsync, connectors, isPending: walletLoading } = useConnect();
  const { disconnect } = useDisconnect();
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

  // Keep Google ↔ wallet link in local storage
  useEffect(() => {
    if (!googleUser && !isConnected) return;
    const saved = walletForGoogleUser(googleUser?.id) ?? readLinkedIdentity().walletAddress;
    writeLinkedIdentity({
      googleUserId: googleUser?.id ?? readLinkedIdentity().googleUserId,
      email: googleUser?.email ?? readLinkedIdentity().email,
      ...(address ? { walletAddress: address, walletPaused: false } : {}),
    });
    setRememberedWallet(
      (address ?? saved ?? readLinkedIdentity().walletAddress)?.toLowerCase() ?? null
    );
  }, [googleUser, isConnected, address]);

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
      await connectAsync({ connector });
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
