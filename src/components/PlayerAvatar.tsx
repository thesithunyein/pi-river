"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useAuthGate } from "@/components/AuthGate";
import { CuteAvatar } from "@/components/CuteAvatar";
import { AVATAR_OPTIONS, useGame } from "@/context/GameContext";
import { cn } from "@/lib/cn";

export function usePlayerAvatarSrc() {
  const { profile } = useGame();
  const { googleUser } = useAuthGate();

  return useMemo(() => {
    // Explicit cute-avatar pick always wins
    if (profile.usePresetAvatar) return null;
    // Prefer uploaded photo, then Google
    const meta = googleUser?.user_metadata as Record<string, unknown> | undefined;
    const google =
      (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta?.picture === "string" && meta.picture) ||
      null;
    if (profile.avatarUrl?.startsWith("data:")) return profile.avatarUrl;
    if (google) return google;
    if (profile.avatarUrl) return profile.avatarUrl;
    return null;
  }, [profile.avatarUrl, profile.usePresetAvatar, googleUser]);
}

export function PlayerAvatar({
  className,
  size = 40,
  showRing = false,
}: {
  className?: string;
  size?: number;
  showRing?: boolean;
}) {
  const { profile } = useGame();
  const src = usePlayerAvatarSrc();
  const avatar = AVATAR_OPTIONS.find((item) => item.id === profile.avatarId) ?? AVATAR_OPTIONS[0];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={profile.displayName || "Player"}
        width={size}
        height={size}
        className={cn(
          "rounded-full object-cover shadow-[0_8px_20px_rgba(0,0,0,0.35)]",
          showRing ? "ring-2 ring-[#F5C518]/55 ring-offset-2 ring-offset-[#0B0A14]" : "",
          className,
        )}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <CuteAvatar
      id={avatar.id}
      size={size}
      showRing={showRing}
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
      priority
    />
  );
}
