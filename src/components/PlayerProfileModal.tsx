"use client";

import { useEffect, useState } from "react";
import { PublicPlayerAvatar } from "@/components/PublicPlayerAvatar";
import { GradientButton } from "@/components/ui/GradientButton";
import { getPlayerLevel } from "@/lib/progression";
import { getFrame } from "@/lib/frames";
import { sound } from "@/lib/sound";
import type { LadderEntry } from "@/lib/clubLadder";

export type PublicPlayer = {
  id: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  avatarId: string;
  usePresetAvatar: boolean;
  equippedFrame: string;
  favHand: string;
  xp: number;
  vipTier: string;
  wins: number;
  tickets: number;
  score: number;
  handsPlayed: number;
  biggestWin: number;
  isYou: boolean;
};

function seedFromLadder(entry: LadderEntry, isYou: boolean): PublicPlayer {
  return {
    id: entry.id,
    displayName: entry.name,
    bio: "",
    avatarUrl: entry.avatarUrl || null,
    avatarId: entry.avatarId || "club-runner",
    usePresetAvatar: Boolean(entry.usePresetAvatar) || !entry.avatarUrl,
    equippedFrame: entry.equippedFrame || "none",
    favHand: "",
    xp: 0,
    vipTier: "Bronze",
    wins: entry.wins,
    tickets: entry.tickets,
    score: entry.score,
    handsPlayed: typeof entry.handsPlayed === "number" ? entry.handsPlayed : entry.wins,
    biggestWin: 0,
    isYou,
  };
}

export function PlayerProfileModal({
  playerId,
  seed,
  onClose,
}: {
  playerId: string | null;
  seed?: LadderEntry | null;
  onClose: () => void;
}) {
  const [player, setPlayer] = useState<PublicPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerId) {
      setPlayer(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    if (seed && seed.id === playerId) {
      setPlayer(seedFromLadder(seed, Boolean(seed.isYou)));
    } else {
      setPlayer(null);
    }
    void (async () => {
      try {
        const res = await fetch(`/api/players/${encodeURIComponent(playerId)}`);
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          needsMigration?: boolean;
          player?: PublicPlayer;
        };
        if (cancelled) return;
        if (data.ok && data.player) {
          setPlayer(data.player);
          setError(null);
          return;
        }
        if (!seed) {
          setError(
            data.needsMigration
              ? "Full profile syncs after cloud progress is on."
              : data.error || "Could not load profile"
          );
        }
      } catch {
        if (!cancelled && !seed) setError("Network error loading profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId, seed]);

  if (!playerId) return null;

  const frame = getFrame(player?.equippedFrame || "none");
  const level = player ? getPlayerLevel(player.xp, player.wins) : 1;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#F5C518]/25 bg-gradient-to-b from-[#2a2210] via-[#161322] to-[#0f0d18] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Player profile"
      >
        <div className="border-b border-white/8 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#F5C518]">
            Club profile
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            {loading && !player ? "Loading…" : player?.displayName || "Player"}
          </h2>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error ? (
            <p className="text-sm font-semibold text-[#fb7185]">{error}</p>
          ) : null}

          {player ? (
            <>
              <div className="flex items-center gap-4">
                <PublicPlayerAvatar
                  size={72}
                  displayName={player.displayName}
                  avatarUrl={player.avatarUrl}
                  avatarId={player.avatarId}
                  usePresetAvatar={player.usePresetAvatar}
                  equippedFrame={player.equippedFrame}
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-white">
                    {player.displayName}
                    {player.isYou ? (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#F5C518]">
                        You
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[12px] font-semibold text-[#9AA0B4]">
                    {player.xp > 0 ? `Lv ${level} · ${player.vipTier}` : "Club seat"}
                    {frame.id !== "none" ? ` · ${frame.name}` : ""}
                  </p>
                  <p className="mt-1 font-mono text-[11px] tabular-nums text-[#F5C518]">
                    Score {player.score.toLocaleString()}
                  </p>
                </div>
              </div>

              {player.bio ? (
                <p className="rounded-2xl border border-white/8 bg-black/25 px-3 py-2 text-sm text-[#c8cdd9]">
                  {player.bio}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Wins", player.wins],
                  ["Tickets", player.tickets],
                  ["Hands", player.handsPlayed],
                  ["Best pot", player.biggestWin],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-white/8 bg-black/25 px-3 py-2"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">
                      {label}
                    </p>
                    <p className="font-mono text-lg font-black tabular-nums text-white">
                      {Number(value).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {player.favHand ? (
                <p className="text-[12px] text-[#9AA0B4]">
                  Favorite hand:{" "}
                  <span className="font-bold text-white">{player.favHand}</span>
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="border-t border-white/8 px-5 py-4">
          <GradientButton
            className="w-full"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
          >
            Close
          </GradientButton>
        </div>
      </div>
    </div>
  );
}
