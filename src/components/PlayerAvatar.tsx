"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useAuthGate } from "@/components/AuthGate";
import { AVATAR_OPTIONS, useGame } from "@/context/GameContext";
import { cn } from "@/lib/cn";

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function usePlayerAvatarSrc() {
  const { profile } = useGame();
  const { googleUser } = useAuthGate();

  return useMemo(() => {
    // Prefer Google profile photo unless the player uploaded a custom photo
    const meta = googleUser?.user_metadata as Record<string, unknown> | undefined;
    const google =
      (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta?.picture === "string" && meta.picture) ||
      null;
    if (profile.avatarUrl?.startsWith("data:")) return profile.avatarUrl;
    if (google) return google;
    if (profile.avatarUrl) return profile.avatarUrl;
    return null;
  }, [profile.avatarUrl, googleUser]);
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
  const initials = getInitials(profile.displayName || "P") || "P";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={profile.displayName || "Player"}
        width={size}
        height={size}
        className={cn(
          "object-cover",
          showRing ? "ring-2 ring-[#F5C518]/50" : "",
          className
        )}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={cn(
        `flex items-center justify-center bg-gradient-to-br ${avatar.bgGradient} font-black text-white`,
        showRing ? "ring-2 ring-[#F5C518]/50" : "",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.32) }}
      aria-hidden
    >
      {initials}
    </div>
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
