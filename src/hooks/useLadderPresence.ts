"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthGate } from "@/components/AuthGate";
import { useGame } from "@/context/GameContext";
import { ladderPresenceChannel } from "@/lib/friends";
import { ladderScore } from "@/lib/progressSync";
import type { LadderEntry } from "@/lib/clubLadder";

type PresenceRow = {
  name?: string;
  wins?: number;
  tickets?: number;
  score?: number;
  avatarUrl?: string;
  avatarId?: string;
  usePresetAvatar?: boolean;
  equippedFrame?: string;
};

/** Publishes your ladder row to Realtime presence; reports peers via callback. */
export function useLadderPresence(
  onPeers: (entries: LadderEntry[]) => void,
  enabled = true
) {
  const { googleUser } = useAuthGate();
  const { profile, stats, ticketsMinted } = useGame();
  const onPeersRef = useRef(onPeers);
  onPeersRef.current = onPeers;

  useEffect(() => {
    if (!enabled || !googleUser?.id) return;
    const supabase = createClient();
    if (typeof supabase.channel !== "function") return;

    const userId = googleUser.id;
    const channel = supabase.channel(ladderPresenceChannel(), {
      config: { presence: { key: userId } },
    });

    const flush = () => {
      const state = channel.presenceState() as Record<string, PresenceRow[]>;
      const entries: LadderEntry[] = [];
      for (const [id, rows] of Object.entries(state)) {
        const row = rows?.[0];
        if (!row) continue;
        entries.push({
          id,
          name: row.name || "Player",
          wins: Number(row.wins) || 0,
          tickets: Number(row.tickets) || 0,
          score: Number(row.score) || 0,
          avatarUrl: row.avatarUrl,
          avatarId: row.avatarId,
          usePresetAvatar: Boolean(row.usePresetAvatar),
          equippedFrame: row.equippedFrame || "none",
          online: true,
          isYou: id === userId,
          isHouse: false,
        });
      }
      onPeersRef.current(entries.sort((a, b) => b.score - a.score || b.wins - a.wins));
    };

    channel.on("presence", { event: "sync" }, flush);
    channel.on("presence", { event: "join" }, flush);
    channel.on("presence", { event: "leave" }, flush);

    channel.subscribe(async (status: string) => {
      if (status !== "SUBSCRIBED") return;
      const wins = stats.gamesWon;
      const tickets = ticketsMinted;
      await channel.track({
        name: profile.displayName || "Player",
        wins,
        tickets,
        score: ladderScore(wins, tickets, stats.totalEarnings),
        avatarUrl: profile.usePresetAvatar ? undefined : profile.avatarUrl || undefined,
        avatarId: profile.avatarId,
        usePresetAvatar: profile.usePresetAvatar,
        equippedFrame: profile.equippedFrame || "none",
        at: Date.now(),
      });
    });

    return () => {
      void supabase.removeChannel?.(channel);
    };
  }, [
    enabled,
    googleUser?.id,
    profile.displayName,
    profile.avatarUrl,
    profile.avatarId,
    profile.usePresetAvatar,
    profile.equippedFrame,
    stats.gamesWon,
    stats.totalEarnings,
    ticketsMinted,
  ]);
}
