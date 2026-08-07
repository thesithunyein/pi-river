"use client";

const MISSIONS = [
  { icon: "🃏", title: "Play 10 hands of Texas Hold'em", reward: "+500 XP · +20,000 chips", progress: 70 },
  { icon: "🔥", title: "Win 3 hands in a row", reward: "+1,000 XP · Streak x2", progress: 33 },
  { icon: "🛡", title: "Play on a Friend table", reward: "+300 XP · Exclusive card back", progress: 0 },
  { icon: "👑", title: "Reach Gold tier this week", reward: "VIP chest · 100,000 chips", progress: 80 },
  { icon: "🏆", title: "Finish top 10 in River Rush", reward: "Trophy · 50,000 chips", progress: 0 },
];

export default function MissionsPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-river-bg2/95 to-river-bg/95 border border-river-violet/25 overflow-hidden relative p-5">
        <div className="absolute top-[-40px] right-[-30px] w-48 h-48 bg-river-violet/20 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold">Daily Missions</h2>
            <p className="text-river-grey text-xs mt-1">Complete missions for XP and chips. Streaks multiply rewards.</p>
          </div>
          <div className="text-5xl drop-shadow-lg">🎯</div>
        </div>
      </div>

      {/* Mission list */}
      <div className="mt-3">
        {MISSIONS.map((m, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-river-line/50 hover:bg-river-cyan/[0.02] transition">
            <div className="w-10 h-10 rounded-xl bg-river-bg3 border border-river-line flex items-center justify-center text-lg flex-shrink-0">{m.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold">{m.title}</div>
              <div className="text-[11px] text-river-gold mt-0.5">{m.reward}</div>
              <div className="h-[5px] bg-river-bg3 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-river-cyan to-river-violet shadow-[0_0_8px_rgba(34,211,238,0.4)]" style={{ width: `${m.progress}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
