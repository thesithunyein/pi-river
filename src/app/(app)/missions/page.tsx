"use client";

import { useGame } from "@/context/GameContext";
import { sound } from "@/lib/sound";

export default function MissionsPage() {
  const { missions, claimMission, xp, vipTier } = useGame();

  const handleClaim = (id: number) => {
    sound.playClick();
    claimMission(id);
  };

  return (
    <div className="p-4 animate-fade-in space-y-4 max-w-3xl mx-auto">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-950/80 via-river-bg2 to-river-bg border border-river-violet/30 overflow-hidden relative p-6 shadow-xl">
        <div className="absolute top-[-40px] right-[-30px] w-52 h-52 bg-river-violet/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-river-violet/20 text-river-violet border border-river-violet/40 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              👑 Level & XP Status
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-white">Daily Missions</h2>
            <p className="text-river-grey text-xs">
              Complete active challenges to earn free chips, level up your <span className="text-river-gold font-bold">{vipTier} Tier</span>, and unlock exclusive rewards.
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs font-bold text-river-cyan">
              <span>XP: {xp.toLocaleString()}</span>
              <span>•</span>
              <span>VIP Tier: {vipTier}</span>
            </div>
          </div>
          <div className="text-5xl sm:text-6xl drop-shadow-lg animate-float flex-shrink-0">
            🎯
          </div>
        </div>
      </div>

      {/* Mission List */}
      <div className="bg-river-bg2/90 border border-river-line/80 rounded-3xl overflow-hidden shadow-xl divide-y divide-river-line/50">
        <div className="px-5 py-3.5 bg-river-bg3/50 flex items-center justify-between text-xs">
          <span className="font-black text-white uppercase tracking-wider">Active Challenges</span>
          <span className="text-river-cyan font-bold">Resets in 14h 22m</span>
        </div>

        {missions.map((m) => {
          const isReady = m.progress >= 100 && !m.claimed;

          return (
            <div
              key={m.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-river-bg3/30 transition"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-river-bg3 to-river-bg1 border border-river-line flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    {m.title}
                    {m.claimed && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                        CLAIMED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-river-gold font-bold mt-0.5">{m.rewardText}</div>

                  {/* Progress Bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-river-grey">
                      <span>Progress</span>
                      <span>{m.progress}%</span>
                    </div>
                    <div className="h-2 bg-river-bg1 rounded-full overflow-hidden border border-river-line/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-river-cyan via-blue-500 to-river-violet shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-300"
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="self-end sm:self-center flex-shrink-0">
                {m.claimed ? (
                  <button disabled className="px-4 py-2 rounded-2xl bg-river-bg1 border border-river-line/60 text-river-grey font-bold text-xs">
                    ✓ Completed
                  </button>
                ) : isReady ? (
                  <button
                    onClick={() => handleClaim(m.id)}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-river-gold via-amber-400 to-yellow-500 text-amber-950 font-black text-xs glow-gold hover:scale-105 active:scale-95 transition-all shadow-lg animate-bounce"
                  >
                    CLAIM REWARD
                  </button>
                ) : (
                  <button disabled className="px-4 py-2 rounded-2xl bg-river-bg3/60 border border-river-line text-river-grey/70 font-bold text-xs">
                    In Progress
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
