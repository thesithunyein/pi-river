"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, useConnect } from "wagmi";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { LockIncoIcon, WalletIcon } from "@/components/icons";
import { GradientButton } from "@/components/ui/GradientButton";

type AuthGateContextValue = {
  ready: boolean;
  googleUser: User | null;
  walletConnected: boolean;
  signedIn: boolean;
  signOutGoogle: () => Promise<void>;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used inside AuthGate");
  return ctx;
}

function GoogleMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

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
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(245,197,24,0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(123,92,255,0.18), transparent 50%)",
        }}
      />
      <div className="relative w-full max-w-md space-y-5">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/brand/mi-logo.svg"
            alt="pi River"
            width={176}
            height={40}
            className="h-11 w-auto"
            priority
          />
          <h1 className="mt-5 font-display text-3xl font-black text-white">Sit down to play</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#9AA0B4]">
            Google or wallet unlocks the full app. Play, Shop, Rewards, and Profile stay locked until then.
          </p>
        </div>

        <div className="space-y-3 rounded-[28px] border border-white/10 bg-[#161322]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <button
            type="button"
            onClick={onGoogle}
            disabled={googleLoading}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 text-sm font-black text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <GoogleMark />
            {googleLoading ? "Opening Google…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7d8398]">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <GradientButton
            className="w-full min-h-12"
            icon={<WalletIcon className="h-5 w-5" />}
            onClick={onWallet}
            disabled={walletLoading}
          >
            {walletLoading ? "Connecting…" : "Connect wallet"}
          </GradientButton>

          {googleError ? (
            <p className="text-center text-xs font-semibold text-[#FF8A3D]">{googleError}</p>
          ) : null}
        </div>

        <div className="flex items-start gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5C518]/12 text-[#F5C518]">
            <LockIncoIcon className="h-5 w-5" />
          </span>
          <p className="text-left text-xs leading-relaxed text-[#9AA0B4]">
            Confidential heads-up Hold&apos;em on Inco Lightning, Base Sepolia. Hole cards stay private until showdown.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending: walletLoading } = useConnect();
  const [ready, setReady] = useState(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

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

  const signedIn = Boolean(googleUser) || isConnected;

  const value = useMemo<AuthGateContextValue>(
    () => ({
      ready,
      googleUser,
      walletConnected: isConnected,
      signedIn,
      signOutGoogle: async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        setGoogleUser(null);
      },
    }),
    [ready, googleUser, isConnected, signedIn]
  );

  async function handleGoogle() {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setGoogleError(error.message || "Google sign-in is not configured yet. Use wallet for now.");
        setGoogleLoading(false);
      }
    } catch {
      setGoogleError("Google sign-in failed. Connect a wallet to continue.");
      setGoogleLoading(false);
    }
  }

  function handleWallet() {
    const connector = connectors[0];
    if (!connector) {
      setGoogleError("No wallet extension found. Install MetaMask or another injected wallet.");
      return;
    }
    connect({ connector });
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-[#F5C518]" />
          <p className="text-sm font-bold text-[#9AA0B4]">Loading pi River…</p>
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <AuthGateContext.Provider value={value}>
        <EntryScreen
          onGoogle={handleGoogle}
          onWallet={handleWallet}
          googleLoading={googleLoading}
          walletLoading={walletLoading}
          googleError={googleError}
        />
      </AuthGateContext.Provider>
    );
  }

  return <AuthGateContext.Provider value={value}>{children}</AuthGateContext.Provider>;
}
