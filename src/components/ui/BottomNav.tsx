"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CardsIcon, GiftIcon, PlayIcon, UserIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Play", icon: PlayIcon },
  { href: "/shop", label: "Shop", icon: CardsIcon },
  { href: "/rewards", label: "Rewards", icon: GiftIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2">
      <div className="mx-auto flex max-w-lg items-center gap-1 rounded-[28px] border border-white/10 bg-[#12101c]/92 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-[22px] text-[11px] font-bold tracking-wide transition",
                active
                  ? "bg-gradient-to-b from-[#F5C518] to-[#E29A12] text-[#1A1400] shadow-[0_8px_24px_rgba(245,197,24,0.35)]"
                  : "text-[#9AA0B4] hover:bg-white/5 hover:text-white"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-[22px] w-[22px]", active ? "text-[#1A1400]" : "text-current")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
