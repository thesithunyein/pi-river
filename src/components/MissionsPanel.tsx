"use client";

import {
  ACHIEVEMENTS,
  DAILY_MISSIONS,
  TIMELESS_MISSIONS,
  achievementProgress,
  type MissionDef,
} from "@/lib/missions";
import { useGame } from "@/context/GameContext";
import { GradientButton } from "@/components/ui/GradientButton";
import { TrophyIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { sound } from "@/lib/sound";

function MissionCard({ m }: { m: MissionDef }) {
  const { missionProgress, missionsClaimed, claimMission } = useGame();
  const progress = Math.min(missionProgress[m.id] || 0, m.target);
  const done = progress >= m.target;
  const claimed = missionsClaimed.includes(m.id);
  const pct = Math.round((progress / m.target) * 100);

  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        claimed
          ? "border-white/8 bg-white/[0.03] opacity-70"
          : done
            ? "border-[#F5C518]/35 bg-[#F5C518]/10"
            : "border-white/10 bg-black/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-white">{m.title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[#9AA0B4]">{m.blurb}</p>
        </div>
        <span className="shrink-0 font-mono text-[10px] font-bold text-[#F5C518]">
          {progress}/{m.target}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#F5C518] to-[#E8791A] transition-[width] duration-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-[#9AA0B4]">
          +{m.rewardChips.toLocaleString()} chips · +{m.rewardXp} XP
        </p>
        {claimed ? (
          <span className="text-[10px] font-black uppercase tracking-wider text-[#3ECF8E]">
            Claimed
          </span>
        ) : (
          <GradientButton
            className="min-h-8 px-3 text-[11px]"
            disabled={!done}
            onClick={() => {
              sound.playClick();
              claimMission(m.id);
            }}
          >
            Claim
          </GradientButton>
        )}
      </div>
    </div>
  );
}

export function MissionsPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {!compact ? (
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F5C518]/15 text-[#F5C518]">
            <TrophyIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9AA0B4]">Missions</p>
            <p className="text-sm font-black text-white">Daily resets · timeless grinds</p>
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5C518]">
          Daily
        </p>
        <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
          {DAILY_MISSIONS.map((m) => (
            <MissionCard key={m.id} m={m} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9AA0B4]">
          Timeless
        </p>
        <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
          {TIMELESS_MISSIONS.map((m) => (
            <MissionCard key={m.id} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AchievementsPanel() {
  const {
    stats,
    ticketsMinted,
    missionProgress,
    achievementsClaimed,
    claimAchievement,
  } = useGame();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
          <TrophyIcon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9AA0B4]">
            Achievements
          </p>
          <p className="text-sm font-black text-white">One-time club milestones</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const progress = Math.min(
            achievementProgress(a, stats, ticketsMinted, missionProgress),
            a.target
          );
          const done = progress >= a.target;
          const claimed = achievementsClaimed.includes(a.id);
          const pct = Math.round((progress / a.target) * 100);

          return (
            <div
              key={a.id}
              className={cn(
                "rounded-2xl border p-3",
                claimed
                  ? "border-white/8 bg-white/[0.03] opacity-70"
                  : done
                    ? "border-emerald-400/35 bg-emerald-400/10"
                    : "border-white/10 bg-black/20"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">{a.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#9AA0B4]">{a.blurb}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] font-bold text-emerald-300">
                  {progress}/{a.target}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-[#9AA0B4]">
                  +{a.rewardChips.toLocaleString()} chips · +{a.rewardXp} XP
                </p>
                {claimed ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#3ECF8E]">
                    Claimed
                  </span>
                ) : (
                  <GradientButton
                    className="min-h-8 px-3 text-[11px]"
                    disabled={!done}
                    onClick={() => {
                      sound.playClick();
                      claimAchievement(a.id);
                    }}
                  >
                    Claim
                  </GradientButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
