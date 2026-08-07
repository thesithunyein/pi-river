"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CardsIcon, GiftIcon, SettingsIcon, ShirtIcon, TokenMiIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Play", icon: TokenMiIcon },
  { href: "/shop", label: "Shop", icon: ShirtIcon },
  { href: "/rewards", label: "Rewards", icon: GiftIcon },
  { href: "/profile", label: "Profile", icon: SettingsIcon },
  { href: "/table", label: "More", icon: CardsIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-river-line/15 bg-river-bg/80 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-5xl items-stretch px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-extrabold tracking-[0.12em] text-river-grey transition",
                active && "bg-river-bg2/90 text-river-white"
              )}
              aria-current={active ? "page" : undefined}
            >
              {active ? (
                <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-mi-cta" aria-hidden />
              ) : null}
              <Icon className={cn("h-5 w-5", active && "animate-pulse-glow")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
