"use client";

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function IconBase({
  title,
  children,
  className = "h-5 w-5",
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M8.5 5.8c0-.9 1-1.5 1.8-1L19 11.2c.7.4.7 1.4 0 1.8L10.3 19.4c-.8.5-1.8-.1-1.8-1V5.8Z"
        fill="currentColor"
      />
    </IconBase>
  );
}

export function CoinIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 8.2v7.6M10.2 9.8c.5-.6 1.1-.9 1.8-.9 1.3 0 2.2.8 2.2 1.9 0 2.4-4 1.4-4 3.4 0 1 .8 1.8 2.1 1.8.8 0 1.5-.3 2-.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

export function DiamondIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 3.5 20 12l-8 8.5L4 12l8-8.5Z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M4.8 11.2h14.4M12 3.8v16.4" stroke="currentColor" strokeWidth="1.4" />
    </IconBase>
  );
}

export function TokenMiIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" fillOpacity="0.15" />
      <path
        d="M7.2 16.5V7.5h2.1l2.7 5.2 2.7-5.2h2.1v9H14.6v-5.1l-2.3 4.2h-.6l-2.3-4.2v5.1H7.2Z"
        fill="currentColor"
      />
    </IconBase>
  );
}

export function ShirtIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M9.2 4.5 12 7l2.8-2.5 3.5 2.2-1.8 3.2H16v9.6H8V9.9H6.7L4.9 6.7 9.2 4.5Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.4" fill="currentColor" />
      <path
        d="M5.2 18.8c.8-3.2 3.2-5 6.8-5s6 1.8 6.8 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      <path
        d="M19.2 12.9v-1.8l-1.7-.4a6.6 6.6 0 0 0-.5-1.2l1-1.4-1.3-1.3-1.4 1a6.6 6.6 0 0 0-1.2-.5L13 4.8h-2l-.4 1.7c-.4.1-.8.3-1.2.5l-1.4-1-1.3 1.3 1 1.4c-.2.4-.4.8-.5 1.2l-1.7.4v1.8l1.7.4c.1.4.3.8.5 1.2l-1 1.4 1.3 1.3 1.4-1c.4.2.8.4 1.2.5l.4 1.7h2l.4-1.7c.4-.1.8-.3 1.2-.5l1.4 1 1.3-1.3-1-1.4c.2-.4.4-.8.5-1.2l1.7-.4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4.5" y="9" width="15" height="10.5" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="6.5" width="17" height="3.2" rx="1.2" fill="currentColor" />
      <path d="M12 6.5v13" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 6.5c-1.2-2.2-3.6-2.4-4.4-1.2C6.6 6.5 7.4 8.2 9 8.8 10.2 9.2 11.3 8.2 12 6.5ZM12 6.5c1.2-2.2 3.6-2.4 4.4-1.2.9 1.2.1 2.9-1.5 3.5-1.2.4-2.3-.6-2.9-2.3Z"
        fill="currentColor"
      />
    </IconBase>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M8 4.5h8v3.4a4 4 0 0 1-4 4 4 4 0 0 1-4-4V4.5Z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 6.2H5.8A2 2 0 0 0 4 8.3c0 2.1 1.5 3.6 3.6 3.6H8M16 6.2h2.2A2 2 0 0 1 20 8.3c0 2.1-1.5 3.6-3.6 3.6H16" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 11.8v3.6M9.2 19h5.6M8.5 15.4h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </IconBase>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13.2 3.2 6.5 13h4.2l-.9 7.8 7.2-10.2h-4.4l1.6-7.4Z" fill="currentColor" />
    </IconBase>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M4.8 8.2A2.8 2.8 0 0 1 7.6 5.4h9a2.2 2.2 0 0 1 2.2 2.2v1.1H13a3.2 3.2 0 0 0 0 6.4h5.8v1.5a2.2 2.2 0 0 1-2.2 2.2h-9a2.8 2.8 0 0 1-2.8-2.8V8.2Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="12.2" y="10.2" width="7.4" height="3.6" rx="1.8" fill="currentColor" />
    </IconBase>
  );
}

export function LockIncoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6.2" y="10.2" width="11.6" height="9" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.4 10.2V8.4a3.6 3.6 0 0 1 7.2 0v1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="14.6" r="1.2" fill="currentColor" />
    </IconBase>
  );
}

export function CardsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="5.5" width="10" height="14" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.2 4.2h8.2A2 2 0 0 1 19.4 6.2v10.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="m10.2 11.2 1.8-2.2 1.8 2.2-1.8 2.2-1.8-2.2Z" fill="currentColor" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" />
      <path d="m7.8 12.2 2.8 2.8 5.6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export function SpadeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 3.5c3.8 3.6 6.8 6.4 6.8 9.2A4.2 4.2 0 0 1 14.6 16.8c-1 0-1.8-.4-2.6-1.2-.8.8-1.6 1.2-2.6 1.2A4.2 4.2 0 0 1 5.2 12.7C5.2 9.9 8.2 7.1 12 3.5Z"
        fill="currentColor"
      />
      <path d="M12 15.2 10.2 20.2h3.6L12 15.2Z" fill="currentColor" />
    </IconBase>
  );
}

export function TableIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="12" rx="9" ry="5.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="12" cy="12" rx="5.5" ry="3.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </IconBase>
  );
}
