"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChatIcon, GiftIcon, PlayIcon, ShopBagIcon, UserIcon } from "@/components/icons";
import { LiveClubChat } from "@/components/LiveClubChat";
import { cn } from "@/lib/cn";
import { sound } from "@/lib/sound";
import {
  activeTableHref,
  readActiveTable,
  type ActiveTable,
} from "@/lib/activeTable";

const items = [
  { href: "/", label: "Play", icon: PlayIcon, id: "play" as const },
  { href: "/shop", label: "Shop", icon: ShopBagIcon, id: "shop" as const },
  { href: "/rewards", label: "Rewards", icon: GiftIcon, id: "rewards" as const },
  { href: "/profile", label: "Profile", icon: UserIcon, id: "profile" as const },
];

export function BottomNav() {
  const pathname = usePathname();
  const [liveTable, setLiveTable] = useState<ActiveTable | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    function sync() {
      setLiveTable(readActiveTable());
    }
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("pi-river-active-table", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("pi-river-active-table", sync);
    };
  }, [pathname]);

  const badge = chatUnread > 9 ? "9+" : chatUnread > 0 ? String(chatUnread) : null;

  return (
    <>
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2">
        <div className="pointer-events-auto mx-auto flex w-full max-w-lg items-end gap-2.5 sm:max-w-xl">
          <div className="relative flex min-w-0 flex-1 items-center gap-1 overflow-visible rounded-[28px] border border-[#F5C518]/20 bg-[#0e0c16]/94 p-1.5 shadow-[0_22px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/40 to-transparent"
            />
            {items.map((item) => {
              const playHref =
                item.id === "play" && liveTable ? activeTableHref(liveTable) : item.href;
              const active =
                item.id === "play"
                  ? pathname === "/" || pathname.startsWith("/table")
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={playHref}
                  className={cn(
                    "relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 rounded-[22px] text-[11px] font-black tracking-wide transition",
                    active
                      ? "bg-gradient-to-b from-[#FFE08A] via-[#F5C518] to-[#E29A12] text-[#1A1400] shadow-[0_10px_28px_rgba(245,197,24,0.4)]"
                      : "text-[#9AA0B4] hover:bg-white/5 hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={cn("h-[22px] w-[22px]", active ? "text-[#1A1400]" : "text-current")} />
                  <span>
                    {item.id === "play" && liveTable && pathname !== "/"
                      ? "Table"
                      : item.label}
                  </span>
                  {item.id === "play" && liveTable ? (
                    <span
                      className={cn(
                        "absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full",
                        active ? "bg-[#1A1400]/70" : "bg-[#F5C518]"
                      )}
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            aria-label={badge ? `Live chat, ${badge} new` : "Live chat"}
            onClick={() => {
              sound.playClick();
              setChatOpen(true);
            }}
            className={cn(
              "relative flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[22px] border border-[#F5C518]/40 bg-gradient-to-b from-[#242018] via-[#141218] to-[#0a090f] text-[#F5C518] shadow-[0_16px_36px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,236,160,0.18)] transition active:scale-[0.96]",
              chatOpen && "border-[#F5C518]/75 ring-2 ring-[#F5C518]/25",
              badge && "animate-pulse-soft"
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-[5px] rounded-[17px] border border-white/[0.06]"
            />
            <ChatIcon className="relative h-9 w-9 drop-shadow-[0_2px_8px_rgba(245,197,24,0.35)]" />
            {badge ? (
              <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#e11d48] px-1.5 text-[10px] font-black leading-none text-white shadow-[0_6px_14px_rgba(225,29,72,0.55)] ring-2 ring-[#0e0c16]">
                {badge}
              </span>
            ) : null}
          </button>
        </div>
      </nav>

      <LiveClubChat
        open={chatOpen}
        onOpenChange={setChatOpen}
        unread={chatUnread}
        onUnreadChange={setChatUnread}
      />
    </>
  );
}
