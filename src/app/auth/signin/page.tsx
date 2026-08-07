"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useState } from "react";
import { LockIncoIcon, WalletIcon } from "@/components/icons";
import { sound } from "@/lib/sound";

export default function SignIn() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    sound.playClick();
    setLoading(true);

    try {
      // Clear guest cookie if present
      if (typeof document !== "undefined") {
        document.cookie = "river_guest_mode=; path=/; max-age=0";
      }

      const supabase = createClient();
      if (supabase && typeof supabase.auth?.signInWithOAuth === "function") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });

        if (error) {
          // Fallback to guest session if OAuth isn't configured in sandbox
          document.cookie = "river_guest_mode=true; path=/; max-age=31536000";
          window.location.href = "/";
          return;
        }
      } else {
        document.cookie = "river_guest_mode=true; path=/; max-age=31536000";
        window.location.href = "/";
      }
    } catch {
      document.cookie = "river_guest_mode=true; path=/; max-age=31536000";
      window.location.href = "/";
    }
  }

  function signInAsGuest() {
    sound.playClick();
    if (typeof document !== "undefined") {
      document.cookie = "river_guest_mode=true; path=/; max-age=31536000";
      window.location.href = "/";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] border border-river-line/20 bg-river-bg2/80 shadow-mi-panel">
            <Image src="/brand/mi-mark.svg" alt="mi River mark" width={52} height={52} className="h-12 w-12" priority />
          </div>
          <Image src="/brand/mi-logo.svg" alt="mi River" width={176} height={40} className="h-10 w-auto" />
          <p className="mt-3 max-w-sm text-sm leading-7 text-river-grey">
            Confidential Hold&apos;em UI for the Inco Summer Game Jam. Wallet and contract flows are still
            being wired, so guest mode is the fastest way to explore the shell.
          </p>
        </div>

        <div className="glass-panel space-y-4 rounded-[30px] border border-river-line/20 p-6 text-center">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-river-gold">Sign in</p>
            <h1 className="mt-2 text-3xl font-black text-river-white">Enter mi River</h1>
            <p className="mt-2 text-sm text-river-grey">Sign in or continue as guest to save a local progression run.</p>
          </div>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="flex min-h-11 w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-xs font-black uppercase tracking-[0.16em] text-slate-900 transition hover:bg-slate-100 active:translate-y-px disabled:opacity-50"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
            <span>{loading ? "Connecting..." : "Continue with Google"}</span>
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-river-line/60" />
            <span className="text-[10px] text-river-grey font-bold uppercase tracking-wider">OR</span>
            <div className="flex-1 h-px bg-river-line/60" />
          </div>

          <button
            onClick={signInAsGuest}
            className="brand-gradient flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-black uppercase tracking-[0.16em] text-slate-950 shadow-mi-glow transition hover:brightness-105 active:translate-y-px"
          >
            <WalletIcon className="h-5 w-5" />
            <span>Continue as guest</span>
          </button>
        </div>

        <div className="rounded-[26px] border border-river-line/20 bg-river-bg2/70 p-4 shadow-mi-panel">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-river-violet/10 text-river-violet">
              <LockIncoIcon className="h-5 w-5" />
            </span>
            <div className="text-left">
              <p className="text-sm font-bold text-river-white">Network target</p>
              <p className="mt-1 text-xs leading-6 text-river-grey">
                Inco Lightning · Base Sepolia is the intended network for this project. The current shell does
                not claim live onchain card privacy in the UI yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
