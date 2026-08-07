"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import HowItWorksModal from "@/components/HowItWorksModal";
import RiverLogo from "@/components/RiverLogo";
import { sound } from "@/lib/sound";

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const router = useRouter();

  async function signInWithGoogle() {
    sound.playClick();
    setLoading(true);
    setError("");

    // Clear guest cookie if present
    if (typeof document !== "undefined") {
      document.cookie = "river_guest_mode=; path=/; max-age=0";
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(
        "Supabase OAuth ready! " + error.message + " You can click 'Continue with Guest' to enter immediately."
      );
    }
    setLoading(false);
  }

  function signInAsGuest() {
    sound.playClick();
    // Set guest cookie for server layout validation
    if (typeof document !== "undefined") {
      document.cookie = "river_guest_mode=true; path=/; max-age=31536000";
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-river-bg2 via-river-bg to-black text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-river-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-river-gold/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-6 text-center">
        {/* Bubbly 3D River Logo */}
        <div className="flex flex-col items-center justify-center animate-fade-in">
          <div className="mb-2">
            <RiverLogo size="lg" showText={false} />
          </div>
          <h1 className="font-display text-4xl font-black tracking-wider text-white drop-shadow-md">
            RIVER <span className="text-river-cyan text-3xl font-extrabold">POKER</span>
          </h1>
          <p className="text-river-grey text-xs mt-1.5 font-bold uppercase tracking-widest">
            Onchain Fully Homomorphic Encryption
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-river-bg2/90 border border-river-line/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-3.5">
          <div className="text-left mb-1">
            <div className="text-xs font-black text-white">Welcome Player</div>
            <div className="text-[11px] text-river-grey">Sign in with Google or start instantly as Guest</div>
          </div>

          {/* Continue with Google */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-black rounded-2xl py-3 px-4 transition shadow-lg active:scale-98 disabled:opacity-50 text-xs uppercase tracking-wide"
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
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-river-line/60" />
            <span className="text-[10px] text-river-grey font-bold uppercase tracking-wider">OR</span>
            <div className="flex-1 h-px bg-river-line/60" />
          </div>

          {/* Continue with Guest */}
          <button
            onClick={signInAsGuest}
            className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-river-cyan to-blue-600 text-river-bg font-black rounded-2xl py-3 px-4 transition shadow-lg glow-cyan hover:scale-[1.01] active:scale-98 text-xs uppercase tracking-wide"
          >
            <span>⚡</span>
            <span>Continue as Guest (Instant Play)</span>
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-[11px] text-river-red text-left font-medium leading-normal">
              {error}
            </div>
          )}
        </div>

        {/* How River Works & Fair Play Modal Trigger */}
        <div className="bg-river-bg3/60 border border-river-line/60 rounded-2xl p-4 text-center space-y-2 shadow-lg">
          <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
            <span>🛡</span>
            <span>Zero House Peeking & Fair Shuffling</span>
          </div>
          <p className="text-[11px] text-river-grey">
            New to River Poker? Learn how cards are encrypted onchain with Inco FHE.
          </p>
          <button
            onClick={() => {
              sound.playClick();
              setShowHowItWorks(true);
            }}
            className="w-full py-2 rounded-xl bg-river-bg1/90 border border-river-cyan/40 text-river-cyan text-xs font-black hover:bg-river-cyan/10 transition flex items-center justify-center gap-1.5"
          >
            <span>🎓</span>
            <span>How River Works (Guide & Rules)</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-river-grey text-[10px] text-center leading-relaxed font-medium">
          By playing, you agree to RIVER&apos;s Gaming Rules.
          <br />
          All cards are encrypted onchain with Inco FHE.
        </p>
      </div>

      {/* Interactive How It Works Modal */}
      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  );
}
