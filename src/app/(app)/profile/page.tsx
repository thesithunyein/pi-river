"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

const MATCH_HISTORY = [
  { opponent: "Maya", result: "win", hand: "Full House", chips: "+45,000", time: "2m ago" },
  { opponent: "Kenji", result: "loss", hand: "Two Pair", chips: "-20,000", time: "15m ago" },
  { opponent: "Pia", result: "win", hand: "Flush", chips: "+120,000", time: "1h ago" },
  { opponent: "Jonas", result: "win", hand: "Straight", chips: "+28,000", time: "2h ago" },
  { opponent: "Alex", result: "loss", hand: "High Card", chips: "-35,000", time: "3h ago" },
  { opponent: "Sam", result: "win", hand: "Two Pair", chips: "+15,000", time: "5h ago" },
];

const STATS = [
  { label: "Hands Played", value: "1,247" },
  { label: "Win Rate", value: "62.3%" },
  { label: "Biggest Win", value: "340,000" },
  { label: "Current Streak", value: "3W" },
  { label: "Total Earnings", value: "2.4M" },
  { label: "Games Won", value: "892" },
];

const VIP_TIERS = [
  { name: "Bronze", min: 0, icon: "🥉", color: "text-amber-600" },
  { name: "Silver", min: 100000, icon: "🥈", color: "text-gray-400" },
  { name: "Gold", min: 500000, icon: "🥇", color: "text-river-gold" },
  { name: "Platinum", min: 2000000, icon: "💎", color: "text-river-cyan" },
  { name: "Diamond", min: 5000000, icon: "👑", color: "text-river-violet" },
];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => setUser(data.user));
    }
  }, [supabase]);

  const initials = user?.user_metadata?.full_name
    ?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    || user?.email?.slice(0, 2).toUpperCase()
    || "U";

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Player";
  const email = user?.email || "";

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    router.push("/auth/signin");
    router.refresh();
  }

  return (
    <div className="animate-fade-in pb-8">
      {/* Profile header */}
      <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-river-bg2/95 to-river-bg/95 border border-river-violet/25 overflow-hidden relative p-5">
        <div className="absolute top-[-40px] left-[-30px] w-48 h-48 bg-river-violet/15 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-river-cyan to-river-violet flex items-center justify-center text-xl font-bold text-river-bg glow-cyan">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">{displayName}</h2>
            <p className="text-river-grey text-xs">{email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-river-gold text-sm">🥇</span>
              <span className="text-xs font-bold text-river-gold">Gold</span>
              <span className="text-[10px] text-river-grey">· 780,000 XP</span>
            </div>
          </div>
          <button onClick={signOut} className="px-3 py-1.5 rounded-lg bg-river-bg3 border border-river-line text-river-grey text-xs font-bold hover:border-river-red/40 hover:text-river-red transition">Sign Out</button>
        </div>
      </div>

      {/* VIP progress */}
      <div className="mx-4 mt-3 p-4 rounded-2xl bg-river-bg2 border border-river-line">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-river-grey uppercase tracking-wider">VIP Progress</span>
          <span className="text-xs text-river-gold font-bold">Gold → Platinum</span>
        </div>
        <div className="h-2 bg-river-bg3 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-river-gold to-river-cyan rounded-full" style={{ width: "39%" }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-river-grey">780,000 / 2,000,000 XP</span>
          <span className="text-[10px] text-river-grey">61% to go</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 mt-4">
        <div className="text-[11px] text-river-grey uppercase tracking-widest font-bold mb-2">Your Stats</div>
        <div className="grid grid-cols-3 gap-2">
          {STATS.map((s) => (
            <div key={s.label} className="bg-river-bg2 border border-river-line rounded-xl p-3 text-center">
              <div className="font-display font-bold text-base">{s.value}</div>
              <div className="text-[10px] text-river-grey mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Match history */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-river-grey uppercase tracking-widest font-bold">Recent Matches</span>
          <span className="text-river-cyan text-xs font-bold cursor-pointer">View all</span>
        </div>
        <div className="bg-river-bg2 border border-river-line rounded-2xl overflow-hidden">
          {MATCH_HISTORY.map((m, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-river-line/50 last:border-b-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                m.result === "win" ? "bg-river-green/15 text-river-green border border-river-green/30" : "bg-river-red/15 text-river-red border border-river-red/30"
              }`}>
                {m.result === "win" ? "W" : "L"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">vs {m.opponent}</div>
                <div className="text-[10.5px] text-river-grey">{m.hand}</div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-bold ${m.result === "win" ? "text-river-green" : "text-river-red"}`}>{m.chips}</div>
                <div className="text-[10px] text-river-grey">{m.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="px-4 mt-4">
        <div className="text-[11px] text-river-grey uppercase tracking-widest font-bold mb-2">Settings</div>
        <div className="bg-river-bg2 border border-river-line rounded-2xl overflow-hidden">
          {[
            { icon: "🔔", label: "Notifications", value: "On" },
            { icon: "🔊", label: "Sound Effects", value: "On" },
            { icon: "🎵", label: "Background Music", value: "Off" },
            { icon: "🌙", label: "Dark Mode", value: "On" },
            { icon: "🌐", label: "Language", value: "English" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-river-line/50 last:border-b-0">
              <span className="text-lg">{s.icon}</span>
              <span className="flex-1 text-sm font-semibold">{s.label}</span>
              <span className="text-xs text-river-grey">{s.value}</span>
              <svg className="w-4 h-4 text-river-grey" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 mt-6 text-center">
        <p className="text-[10px] text-river-grey/60">RIVER v0.1.0 · Powered by Inco FHE</p>
        <p className="text-[10px] text-river-grey/60 mt-0.5">Your cards are encrypted onchain. No house can see them.</p>
      </div>
    </div>
  );
}
