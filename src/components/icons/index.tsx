"use client";

import { type SVGProps, useId } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

function MiIcon({
  title,
  children,
  className = "",
  viewBox = "0 0 24 24",
  ...props
}: IconProps & { children: React.ReactNode; viewBox?: string }) {
  const id = useId();
  const titleId = title ? `${id}-title` : undefined;
  const gradientId = `${id}-gradient`;
  const glowId = `${id}-glow`;

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      aria-labelledby={titleId}
      className={className}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7B5CFF" />
          <stop offset="0.55" stopColor="#FF8A3D" />
          <stop offset="1" stopColor="#F5C518" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.482 0 1 0 0 0.361 0 0 1 0 1 0 0 0 0.32 0"
          />
          <feBlend in="SourceGraphic" mode="screen" />
        </filter>
      </defs>
      <g filter={`url(#${glowId})`}>
        <path
          d="M12 2.5C6.75 2.5 2.5 6.75 2.5 12S6.75 21.5 12 21.5 21.5 17.25 21.5 12 17.25 2.5 12 2.5Z"
          fill="url(#gradientId)"
          fillOpacity="0.08"
          stroke="url(#gradientId)"
          strokeOpacity="0.36"
        />
        <g stroke="url(#gradientId)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {children}
        </g>
      </g>
    </svg>
  );
}

export function CoinIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <circle cx="12" cy="12" r="5.4" />
      <path d="M9.7 9.8h4.7M9.4 12h5.2M10 14.3h4" />
      <circle cx="12" cy="12" r="8.1" opacity="0.7" />
    </MiIcon>
  );
}

export function DiamondIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="M12 4 18.2 12 12 20 5.8 12 12 4Z" />
      <path d="M12 4v16M5.8 12h12.4" opacity="0.7" />
    </MiIcon>
  );
}

export function TokenMiIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="M7.5 17.2V6.8L12 10.1l4.5-3.3v10.4L12 13.9l-4.5 3.3Z" />
      <path d="M7.5 6.8 12 4l4.5 2.8M7.5 12 12 9.2l4.5 2.8" opacity="0.75" />
    </MiIcon>
  );
}

export function ShirtIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="m8 6 2.4-2h3.2L16 6l3 1.9-1.6 3.2-1.9-.8V19H8.5v-8.7l-1.9.8L5 7.9 8 6Z" />
      <path d="M10.4 4.2 12 6l1.6-1.8" opacity="0.75" />
    </MiIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="M12 8.9a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2Z" />
      <path d="m19 12-.9.5a6.7 6.7 0 0 1-.3 1l.5 1a.8.8 0 0 1-.1.9l-1.2 1.8a.8.8 0 0 1-.8.3l-1.1-.3c-.3.3-.7.5-1.1.7l-.2 1.1a.8.8 0 0 1-.7.6h-2.2a.8.8 0 0 1-.7-.6l-.2-1.1c-.4-.2-.8-.4-1.1-.7l-1.1.3a.8.8 0 0 1-.8-.3l-1.2-1.8a.8.8 0 0 1-.1-.9l.5-1a6.7 6.7 0 0 1-.3-1L5 12l-.9-.5a.8.8 0 0 1-.4-.8V8.5c0-.3.2-.6.4-.8L5 7.2c.1-.3.2-.7.3-1l-.5-1a.8.8 0 0 1 .1-.9L6 2.5a.8.8 0 0 1 .8-.3l1.1.3c.3-.3.7-.5 1.1-.7l.2-1.1A.8.8 0 0 1 9.9 0h2.2c.4 0 .7.3.7.6l.2 1.1c.4.2.8.4 1.1.7l1.1-.3c.3-.1.7 0 .8.3l1.2 1.8c.2.3.2.6.1.9l-.5 1c.1.3.2.7.3 1l.9.5c.2.2.4.5.4.8v2.2a.8.8 0 0 1-.4.8Z" />
    </MiIcon>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="M5.5 9.5h13v9.2a1.3 1.3 0 0 1-1.3 1.3H6.8a1.3 1.3 0 0 1-1.3-1.3V9.5Z" />
      <path d="M4 7.1h16v2.4H4V7.1ZM12 7.1v12.9M10 5.8c-1-.4-2-.4-2.8 0-1 .5-1.5 1.4-1.5 2.3 1 0 2-.3 2.8-.8C9.4 6.8 9.9 6.3 10 5.8ZM14 5.8c1-.4 2-.4 2.8 0 1 .5 1.5 1.4 1.5 2.3-1 0-2-.3-2.8-.8-.9-.5-1.4-1-1.5-1.5Z" />
    </MiIcon>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="M8 4.5h8v3.2a4 4 0 0 1-4 4 4 4 0 0 1-4-4V4.5Z" />
      <path d="M8 6.5H5.6A1.6 1.6 0 0 0 4 8.1c0 2 1.6 3.6 3.6 3.6H8M16 6.5h2.4A1.6 1.6 0 0 1 20 8.1c0 2-1.6 3.6-3.6 3.6H16M12 11.7v4.1M9.4 19.5h5.2M8.4 15.8h7.2" />
    </MiIcon>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="M12.8 3.5 6.9 12h4l-.8 8.5 6.8-9h-4.1l.9-8Z" />
    </MiIcon>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="M5.5 7.5A2.5 2.5 0 0 1 8 5h8.5a2 2 0 0 1 2 2v1.2h-5.8a2.8 2.8 0 1 0 0 5.6h5.8V17a2 2 0 0 1-2 2H8A2.5 2.5 0 0 1 5.5 16.5v-9Z" />
      <path d="M12.7 9.8h6.8v3.9h-6.8a1.95 1.95 0 1 1 0-3.9ZM15.6 11.75h.1" />
    </MiIcon>
  );
}

export function LockIncoIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="M7.2 10.6h9.6v7.6a1.6 1.6 0 0 1-1.6 1.6H8.8a1.6 1.6 0 0 1-1.6-1.6v-7.6Z" />
      <path d="M9.1 10.6V8.5a2.9 2.9 0 1 1 5.8 0v2.1M12 13.3v2.6" />
      <path d="m5 6 2.1 1.1M19 6l-2.1 1.1" opacity="0.75" />
    </MiIcon>
  );
}

export function CardsIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="M7.1 6.4h8.3a1.8 1.8 0 0 1 1.8 1.8v9a1.8 1.8 0 0 1-1.8 1.8H7.1a1.8 1.8 0 0 1-1.8-1.8v-9a1.8 1.8 0 0 1 1.8-1.8Z" />
      <path d="m8.8 4.7 6.8.1c1 0 1.9.8 2 1.8l.2 7.3" opacity="0.75" />
      <path d="m9.6 10.1 2.4-2.9 2.4 2.9-2.4 2.9-2.4-2.9Z" />
    </MiIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <MiIcon {...props}>
      <path d="m7.4 12.2 3.1 3.2 6.1-6.7" />
    </MiIcon>
  );
}
