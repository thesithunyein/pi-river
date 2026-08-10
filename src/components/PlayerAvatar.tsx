"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useAuthGate } from "@/components/AuthGate";
import { PublicPlayerAvatar } from "@/components/PublicPlayerAvatar";
import { useGame } from "@/context/GameContext";

export function usePlayerAvatarSrc() {
  const { profile } = useGame();
  const { googleUser } = useAuthGate();

  return useMemo(() => {
    if (profile.usePresetAvatar) return null;
    // Custom upload / saved profile photo wins over Google (logout-safe)
    if (profile.avatarUrl?.startsWith("data:")) return profile.avatarUrl;
    if (profile.avatarUrl?.startsWith("http")) return profile.avatarUrl;
    const meta = googleUser?.user_metadata as Record<string, unknown> | undefined;
    const google =
      (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta?.picture === "string" && meta.picture) ||
      null;
    if (google) return google;
    if (profile.avatarUrl) return profile.avatarUrl;
    return null;
  }, [profile.avatarUrl, profile.usePresetAvatar, googleUser]);
}

export function PlayerAvatar({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
  /** @deprecated Frames only come from Shop purchases; ignored. */
  showRing?: boolean;
  /** @deprecated Use equipped shop frame only; ignored if passed. Prefer omit. */
  bare?: boolean;
}) {
  const { profile } = useGame();
  const src = usePlayerAvatarSrc();
  // Shop only — never invent a default ornate frame for new users.
  const frame =
    profile.equippedFrame && profile.equippedFrame !== "none"
      ? profile.equippedFrame
      : "none";

  return (
    <PublicPlayerAvatar
      size={size}
      displayName={profile.displayName}
      avatarUrl={src}
      avatarId={profile.avatarId}
      usePresetAvatar={!src}
      equippedFrame={frame}
      className={className}
    />
  );
}

/** Small brand mark helper for places that need Image-compatible static assets. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/mi-mark.svg"
      alt="pi"
      width={40}
      height={40}
      className={className}
    />
  );
}
