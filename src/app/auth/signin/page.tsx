"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import HowItWorksModal from "@/components/HowItWorksModal";
import RiverLogo from "@/components/RiverLogo";
import { sound } from "@/lib/sound";

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-river-bg2 via-river-bg to-black text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-river-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-river-gold/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-5 text-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center animate-fade-in">
          <div className="mb-2">
            <RiverLogo size="lg" showText={false} />
          </div>
          <h1 className="font-display text-4xl font-black tracking-wider text-white drop-shadow-md">
            RIVER <span className="text-river-cyan text-3xl font-extrabold">POKER</span>
          </h1>
          <p className="text-river-grey text-xs mt-1 font-bold uppercase tracking-widest">
            Onchain Encrypted Hold&apos;em
          </p>
        </div>

        {/* Auth Container */}
        <div className="bg-river-bg2/90 border border-river-line/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="text-center">
            <div className="text-sm font-black text-white">Welcome Player</div>
            <div className="text-xs text-river-grey mt-0.5">Sign in to claim 100,000 free chips</div>
          </div>

          {/* Continue with Google */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-black rounded-2xl py-3.5 px-4 transition shadow-lg active:scale-98 disabled:opacity-50 text-xs uppercase tracking-wide cursor-pointer"
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

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-river-line/60" />
            <span className="text-[10px] text-river-grey font-bold uppercase tracking-wider">OR</span>
            <div className="flex-1 h-px bg-river-line/60" />
          </div>

          {/* Continue as Guest */}
          <button
            onClick={signInAsGuest}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-river-cyan to-blue-600 text-river-bg font-black rounded-2xl py-3.5 px-4 transition shadow-lg glow-cyan hover:scale-[1.01] active:scale-98 text-xs uppercase tracking-wide cursor-pointer"
          >
            <span>⚡</span>
            <span>Continue as Guest (Instant Play)</span>
          </button>
        </div>

        {/* How River Works Guide */}
        <div className="bg-river-bg3/60 border border-river-line/60 rounded-2xl p-4 text-center space-y-2 shadow-lg">
          <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
            <span>🛡</span>
            <span>Fair Play & Rules</span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              setShowHowItWorks(true);
            }}
            className="w-full py-2.5 rounded-xl bg-river-bg1/90 border border-river-cyan/40 text-river-cyan text-xs font-black hover:bg-river-cyan/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>🎓</span>
            <span>How River Works (Guide & Rules)</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-river-grey text-[10px] text-center font-medium">
          Encrypted onchain poker with Inco FHE.
        </p>
      </div>

      {/* Interactive How It Works Modal */}
      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  );
}
