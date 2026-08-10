"use client";

import { CuteAvatar } from "@/components/CuteAvatar";
import { OrnateFrameSvg } from "@/components/OrnateFrameSvg";
import { getFrame } from "@/lib/frames";
import { cn } from "@/lib/cn";

/** Any player's face: Google / upload URL, or cute avatar preset + centered ornate frame. */
export function PublicPlayerAvatar({
  size = 40,
  displayName,
  avatarUrl,
  avatarId = "club-runner",
  usePresetAvatar = false,
  equippedFrame = "none",
  className,
}: {
  size?: number;
  displayName?: string;
  avatarUrl?: string | null;
  avatarId?: string;
  usePresetAvatar?: boolean;
  equippedFrame?: string;
  className?: string;
}) {
  const frame = getFrame(equippedFrame || "none");
  const showPhoto = !usePresetAvatar && Boolean(avatarUrl);
  const hasArt = Boolean(frame.art);
  const outer = Math.round(size * (hasArt ? frame.scale : frame.id !== "none" ? 1.12 : 1));
  const faceSize = hasArt ? Math.round(outer * frame.faceRatio) : size;

  const face = showPhoto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl!}
      alt={displayName || "Player"}
      width={faceSize}
      height={faceSize}
      className="h-full w-full rounded-full object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <CuteAvatar id={avatarId} size={faceSize} className="rounded-full" />
  );

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: outer, height: outer }}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.35)]",
          !hasArt && frame.id !== "none" && cn("ring-2 ring-offset-2 ring-offset-[#0B0A14]", frame.ring, frame.glow)
        )}
        style={{ width: faceSize, height: faceSize }}
      >
        {face}
      </div>
      {hasArt && frame.art ? (
        <div className="pointer-events-none absolute inset-0 z-10 drop-shadow-[0_6px_14px_rgba(0,0,0,0.4)]">
          <OrnateFrameSvg variant={frame.art} />
        </div>
      ) : null}
    </div>
  );
}
