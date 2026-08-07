"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useGame, AVATAR_OPTIONS } from "@/context/GameContext";
import { sound } from "@/lib/sound";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { stats, matchHistory, xp, vipTier, soundEnabled, setSoundEnabled, profile, updateProfile, resetProgress } = useGame();

  const [soundOn, setSoundOn] = useState(soundEnabled);
  const [resetNotice, setResetNotice] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile Form state
  const [editName, setEditName] = useState(profile.displayName);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editCountry, setEditCountry] = useState(profile.country);
  const [editFavHand, setEditFavHand] = useState(profile.favHand);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => setUser(data.user));
    }
  }, [supabase]);

  const activeAvatar = AVATAR_OPTIONS.find((a) => a.id === profile.avatarId) || AVATAR_OPTIONS[0];

  const email = user?.email || "guest@river.poker";

  async function signOut() {
    sound.playClick();
    if (typeof document !== "undefined") {
      document.cookie = "river_guest_mode=; path=/; max-age=0";
    }
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/auth/signin";
  }

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    sound.playClick();
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      displayName: editName,
      bio: editBio,
      country: editCountry,
      favHand: editFavHand,
    });
    setIsEditing(false);
  };

  const handleResetData = () => {
    if (typeof window !== "undefined") {
      resetProgress();
      setResetNotice(true);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  const computedWinRate = stats.handsPlayed > 0 ? (stats.gamesWon / stats.handsPlayed) * 100 : 0;

  const statsGrid = [
    { label: "Hands Played", value: stats.handsPlayed.toLocaleString() },
    { label: "Win Rate", value: `${computedWinRate.toFixed(1)}%` },
    { label: "Biggest Win", value: `${stats.biggestWin.toLocaleString()} chips` },
    { label: "Current Streak", value: `${stats.currentStreak} Wins` },
    { label: "Total Earnings", value: `${stats.totalEarnings.toLocaleString()} chips` },
    { label: "Games Won", value: stats.gamesWon.toLocaleString() },
  ];

  return (
    <div className="p-4 animate-fade-in space-y-5 max-w-4xl mx-auto pb-16">
      {/* Toast Notice */}
      {resetNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-river-green text-river-bg font-black px-6 py-3 rounded-full shadow-2xl animate-fade-in text-xs">
          ✓ Game Data Reset! Reloading...
        </div>
      )}

      {/* Profile Header */}
      <div className="rounded-3xl bg-gradient-to-br from-river-bg2 via-river-bg3 to-river-bg border border-river-cyan/30 p-6 overflow-hidden relative shadow-2xl">
        <div className="absolute top-[-40px] right-[-30px] w-52 h-52 bg-river-cyan/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            {/* Cartoon Avatar */}
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br ${activeAvatar.bgGradient} border-2 ${activeAvatar.borderColor} flex items-center justify-center text-4xl shadow-xl glow-cyan flex-shrink-0 relative group cursor-pointer transition transform hover:scale-105`}
              onClick={() => {
                sound.playClick();
                setIsEditing(true);
              }}
              title="Click to Change Cartoon Avatar"
            >
              <span>{activeAvatar.emoji}</span>
              <span className="absolute -bottom-1 -right-1 bg-river-bg1/90 border border-river-line text-[10px] font-black px-2 py-0.5 rounded-full">
                ✏️ Edit
              </span>
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-black text-white">
                  {profile.displayName}
                </h2>
                <span className="text-base" title="Country">
                  {profile.country.split(" ")[0]}
                </span>
              </div>
              <p className="text-river-grey text-xs mt-1 font-medium">{profile.bio}</p>
              <p className="text-river-grey/70 text-[10px] mt-0.5">{email}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <span className="bg-river-gold/20 text-river-gold border border-river-gold/40 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  🥇 {vipTier} VIP
                </span>
                <span className="bg-river-cyan/20 text-river-cyan border border-river-cyan/40 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  🃏 {profile.favHand}
                </span>
                <span className="text-xs text-river-cyan font-bold">{xp.toLocaleString()} XP</span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setIsEditing(!isEditing);
              }}
              className="px-4 py-2 rounded-2xl bg-river-cyan/20 border border-river-cyan/50 text-river-cyan hover:bg-river-cyan/30 text-xs font-black transition shadow"
            >
              {isEditing ? "Close Editor" : "✏️ Edit Profile"}
            </button>

            <button
              onClick={signOut}
              className="px-4 py-2 rounded-2xl bg-river-bg1/90 border border-river-line text-river-grey hover:text-river-red hover:border-river-red/40 text-xs font-black transition shadow"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile & Avatar Modal / Box */}
      {isEditing && (
        <div className="bg-river-bg2 border border-river-cyan/50 rounded-3xl p-5 shadow-2xl animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-river-line pb-3">
            <h3 className="font-display font-black text-base text-white">Edit Cartoon Avatar & Bio</h3>
            <button
              onClick={() => setIsEditing(false)}
              className="text-river-grey hover:text-white text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>

          {/* Cartoon Avatar Picker */}
          <div className="space-y-2">
            <label className="text-xs font-black text-white uppercase tracking-wider">
              Choose Cartoon Avatar:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {AVATAR_OPTIONS.map((a) => {
                const isSelected = profile.avatarId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => updateProfile({ avatarId: a.id })}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? `bg-gradient-to-br ${a.bgGradient} ${a.borderColor} ring-2 ring-river-cyan shadow-lg scale-105`
                        : "bg-river-bg3/70 border-river-line/80 hover:border-river-cyan/40"
                    }`}
                  >
                    <span className="text-3xl mb-1">{a.emoji}</span>
                    <span className="text-[10px] font-black text-white text-center leading-tight">
                      {a.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-3 pt-2 border-t border-river-line">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-river-grey block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-river-bg1 border border-river-line rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-river-cyan"
                  placeholder="Player Name"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-river-grey block mb-1">Country Flag</label>
                <select
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  className="w-full bg-river-bg1 border border-river-line rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-river-cyan"
                >
                  <option value="🇺🇸 USA">🇺🇸 USA</option>
                  <option value="🇬🇧 UK">🇬🇧 UK</option>
                  <option value="🇯🇵 Japan">🇯🇵 Japan</option>
                  <option value="🇸🇬 Singapore">🇸🇬 Singapore</option>
                  <option value="🇩🇪 Germany">🇩🇪 Germany</option>
                  <option value="🇲🇲 Myanmar">🇲🇲 Myanmar</option>
                  <option value="🇦🇺 Australia">🇦🇺 Australia</option>
                  <option value="🇨🇦 Canada">🇨🇦 Canada</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-river-grey block mb-1">Favorite Starting Hand</label>
                <input
                  type="text"
                  value={editFavHand}
                  onChange={(e) => setEditFavHand(e.target.value)}
                  className="w-full bg-river-bg1 border border-river-line rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-river-cyan"
                  placeholder="e.g. Pocket Aces A♠A♥"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-river-grey block mb-1">Player Bio</label>
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-river-bg1 border border-river-line rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-river-cyan"
                  placeholder="Short player quote or style"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-river-bg1 border border-river-line text-river-grey text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-river-cyan to-blue-600 text-river-bg text-xs font-black glow-cyan"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIP Tier Progress */}
      <div className="bg-river-bg2/90 border border-river-line/80 rounded-3xl p-5 shadow-xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-white uppercase tracking-wider">VIP Level Progress</span>
          <span className="text-river-gold font-bold">{vipTier} Level → Platinum</span>
        </div>
        <div className="h-2.5 bg-river-bg1 rounded-full overflow-hidden border border-river-line/60">
          <div
            className="h-full bg-gradient-to-r from-river-gold via-amber-400 to-yellow-500 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all duration-300"
            style={{ width: `${Math.min(100, (xp / 10000) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-river-grey font-bold">
          <span>{xp.toLocaleString()} / 10,000 XP</span>
          <span>Leveling unlocks higher rake cashback!</span>
        </div>
      </div>

      {/* Player Lifetime Stats Grid */}
      <div className="space-y-2">
        <div className="text-xs font-black text-white uppercase tracking-wider">
          Lifetime Gameplay Stats
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {statsGrid.map((s) => (
            <div
              key={s.label}
              className="bg-river-bg2/90 border border-river-line/80 rounded-2xl p-4 text-center shadow-lg"
            >
              <div className="font-display font-black text-lg sm:text-xl text-river-gold drop-shadow">
                {s.value}
              </div>
              <div className="text-[10px] text-river-grey font-bold uppercase tracking-wider mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real Hand Match History */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-white uppercase tracking-wider">Match History</span>
          <span className="text-river-cyan font-bold">{matchHistory.length} hands recorded</span>
        </div>

        <div className="bg-river-bg2/90 border border-river-line/80 rounded-3xl overflow-hidden shadow-xl divide-y divide-river-line/50">
          {matchHistory.length === 0 ? (
            <div className="p-6 text-center text-xs text-river-grey font-bold">
              No hands played yet. Head over to the Poker Table and deal your first hand!
            </div>
          ) : (
            matchHistory.map((m, idx) => (
              <div key={idx} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shadow-md ${
                      m.result === "win"
                        ? "bg-river-green/20 text-river-green border border-river-green/40"
                        : "bg-river-red/20 text-river-red border border-river-red/40"
                    }`}
                  >
                    {m.result === "win" ? "W" : "L"}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">vs {m.opponent}</div>
                    <div className="text-[10px] text-river-grey">{m.hand}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-xs font-black ${
                      m.result === "win" ? "text-river-green" : "text-river-red"
                    }`}
                  >
                    {m.chips}
                  </div>
                  <div className="text-[9px] text-river-grey">{m.time}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-2">
        <div className="text-xs font-black text-white uppercase tracking-wider">Game Preferences</div>
        <div className="bg-river-bg2/90 border border-river-line/80 rounded-3xl overflow-hidden shadow-xl divide-y divide-river-line/50">
          <div className="p-4 flex items-center justify-between text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <span>🔊</span>
              <span>Audio Sound Effects</span>
            </div>
            <button
              onClick={toggleSound}
              className={`px-3 py-1 rounded-xl text-xs font-black border transition ${
                soundOn
                  ? "bg-river-cyan/20 border-river-cyan text-river-cyan"
                  : "bg-river-bg1 border-river-line text-river-grey"
              }`}
            >
              {soundOn ? "ENABLED" : "MUTED"}
            </button>
          </div>

          <div className="p-4 flex items-center justify-between text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <span>🔒</span>
              <span>FHE Card Encryption</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-[10px]">
              Active (Inco Protocol)
            </span>
          </div>

          <div className="p-4 flex items-center justify-between text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <span>🗑</span>
              <span>Reset Local Game Data</span>
            </div>
            <button
              onClick={handleResetData}
              className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-river-red text-xs font-black transition"
            >
              RESET DATA
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-river-grey/70 pt-2 space-y-0.5">
        <p>RIVER ONCHAIN POKER v2.0 · Ready to Launch</p>
        <p>Your cards are encrypted with Inco FHE onchain technology.</p>
      </div>
    </div>
  );
}
