"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthGate } from "@/components/AuthGate";
import { useGame } from "@/context/GameContext";
import { usePlayerAvatarSrc } from "@/components/PlayerAvatar";

export type TableSeatProfile = {
  playAddress: string;
  name: string;
  avatarUrl?: string;
  avatarId?: string;
  usePresetAvatar?: boolean;
  equippedFrame?: string;
};

function tableSeatChannel(tableId: string) {
  return `river-table-seat-${tableId}`;
}

/** Broadcast your face to the table; resolve opponent seat profiles. */
export function useTableSeatPresence(
  tableId: string | undefined,
  playAddress: string | undefined,
  onSeats: (byAddress: Record<string, TableSeatProfile>) => void,
  enabled = true
) {
  const { googleUser } = useAuthGate();
  const { profile } = useGame();
  const avatarSrc = usePlayerAvatarSrc();
  const onSeatsRef = useRef(onSeats);
  onSeatsRef.current = onSeats;

  useEffect(() => {
    if (!enabled || !tableId || !playAddress || !googleUser?.id) return;
    const supabase = createClient();
    if (typeof supabase.channel !== "function") return;

    const key = playAddress.toLowerCase();
    const channel = supabase.channel(tableSeatChannel(tableId), {
      config: { presence: { key } },
    });

    const flush = () => {
      const state = channel.presenceState() as Record<string, TableSeatProfile[]>;
      const map: Record<string, TableSeatProfile> = {};
      for (const [addr, rows] of Object.entries(state)) {
        const row = rows?.[0];
        if (!row) continue;
        map[addr.toLowerCase()] = {
          playAddress: addr.toLowerCase(),
          name: row.name || "Player",
          avatarUrl: row.avatarUrl,
          avatarId: row.avatarId,
          usePresetAvatar: Boolean(row.usePresetAvatar),
          equippedFrame: row.equippedFrame || "none",
        };
      }
      onSeatsRef.current(map);
    };

    channel.on("presence", { event: "sync" }, flush);
    channel.on("presence", { event: "join" }, flush);
    channel.on("presence", { event: "leave" }, flush);

    channel.subscribe(async (status: string) => {
      if (status !== "SUBSCRIBED") return;
      await channel.track({
        playAddress: key,
        name: profile.displayName || "Player",
        avatarUrl: profile.usePresetAvatar ? undefined : avatarSrc || profile.avatarUrl || undefined,
        avatarId: profile.avatarId,
        usePresetAvatar: profile.usePresetAvatar || !avatarSrc,
        equippedFrame: profile.equippedFrame || "none",
      } satisfies TableSeatProfile);
    });

    return () => {
      void supabase.removeChannel?.(channel);
    };
  }, [
    enabled,
    tableId,
    playAddress,
    googleUser?.id,
    profile.displayName,
    profile.avatarUrl,
    profile.avatarId,
    profile.usePresetAvatar,
    profile.equippedFrame,
    avatarSrc,
  ]);
}
