"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthGate } from "@/components/AuthGate";
import { useGame } from "@/context/GameContext";
import { usePlayerAvatarSrc } from "@/components/PlayerAvatar";
import { ChatIcon } from "@/components/icons";
import { GradientButton } from "@/components/ui/GradientButton";
import { cn } from "@/lib/cn";
import { sound } from "@/lib/sound";
import { PublicPlayerAvatar } from "@/components/PublicPlayerAvatar";
import type { ChatMessage } from "@/app/api/chat/route";
import {
  FREE_CHAT_STICKERS,
  HD_STICKERS,
  stickerById,
} from "@/lib/stickers";

const READ_KEY = "pi_river_chat_read_at_v1";

const EMOJIS = [
  "😀", "😂", "😊", "😎", "🥳", "😅", "🤯", "😤", "😭", "🔥",
  "👍", "👎", "👏", "🙌", "💪", "🙏", "💯", "✨", "⚡", "❤️",
  "♠️", "♥️", "♦️", "♣️", "🃏", "🎯", "🤑", "😈", "🤝", "👋",
];

function readCursor() {
  try {
    return localStorage.getItem(READ_KEY) || "";
  } catch {
    return "";
  }
}

function writeCursor(iso: string) {
  try {
    localStorage.setItem(READ_KEY, iso);
  } catch {
    // ignore
  }
}

function formatChatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function isStickerBody(body: string) {
  const t = body.trim();
  if (t.startsWith("stk:")) return true;
  // short emoji-only bursts render large
  if (t.length <= 8 && /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t) && !/[a-zA-Z0-9]/.test(t)) {
    return true;
  }
  return false;
}

function stickerIdFromBody(body: string) {
  const t = body.trim();
  if (!t.startsWith("stk:")) return null;
  return t.slice(4);
}

function stickerGlyph(body: string) {
  const id = stickerIdFromBody(body);
  if (id) {
    if (stickerById(id)) return null; // HD image path
    return FREE_CHAT_STICKERS.find((s) => s.id === id)?.glyph || "🃏";
  }
  return body.trim();
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unread: number;
  onUnreadChange: (n: number) => void;
};

/** Live club chat drawer — opened from the bottom-nav chat icon. */
export function LiveClubChat({ open, onOpenChange, onUnreadChange }: Props) {
  const { googleUser } = useAuthGate();
  const { profile, ownedStickerPacks } = useGame();
  const avatarSrc = usePlayerAvatarSrc();
  const unlockedHd = HD_STICKERS.filter((s) => ownedStickerPacks.includes(s.packId));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [picker, setPicker] = useState<"off" | "emoji" | "sticker">("off");
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const markRead = useCallback(() => {
    const latest = messages[messages.length - 1]?.createdAt || new Date().toISOString();
    writeCursor(latest);
    onUnreadChange(0);
  }, [messages, onUnreadChange]);

  const recomputeUnread = useCallback(
    (rows: ChatMessage[]) => {
      if (openRef.current) {
        onUnreadChange(0);
        return;
      }
      const cursor = readCursor();
      const n = rows.filter((m) => !m.isYou && (!cursor || m.createdAt > cursor)).length;
      onUnreadChange(Math.min(99, n));
    },
    [onUnreadChange]
  );

  const load = useCallback(async () => {
    if (!googleUser) return;
    try {
      const res = await fetch("/api/chat?limit=50", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        messages?: ChatMessage[];
        needsMigration?: boolean;
        error?: string;
      };
      if (data.needsMigration) {
        setNeedsMigration(true);
        setError("Run the club_chat SQL in Supabase once.");
        return;
      }
      if (!data.ok) {
        setError(data.error || "Could not load chat");
        return;
      }
      setNeedsMigration(false);
      setError(null);
      const rows = Array.isArray(data.messages) ? data.messages : [];
      setMessages(rows);
      recomputeUnread(rows);
    } catch {
      setError("Network error loading chat");
    }
  }, [googleUser, recomputeUnread]);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => {
      if (!openRef.current) void load();
    }, 20_000);
    return () => window.clearInterval(poll);
  }, [load]);

  useEffect(() => {
    if (!googleUser) return;
    const supabase = createClient();
    if (typeof supabase.channel !== "function") return;
    const channel = supabase
      .channel("club-chat-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "club_chat_messages" },
        (payload: { new?: Record<string, unknown> }) => {
          const row = payload.new;
          if (!row?.id) return;
          const msg: ChatMessage = {
            id: String(row.id),
            userId: String(row.user_id || ""),
            displayName: String(row.display_name || "Player"),
            avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
            avatarId: typeof row.avatar_id === "string" ? row.avatar_id : null,
            usePresetAvatar: Boolean(row.use_preset_avatar),
            equippedFrame:
              typeof row.equipped_frame === "string" && row.equipped_frame !== "none"
                ? row.equipped_frame
                : "none",
            body: String(row.body || ""),
            createdAt: String(row.created_at || new Date().toISOString()),
            isYou: row.user_id === googleUser.id,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const next = [...prev, msg].slice(-80);
            recomputeUnread(next);
            return next;
          });
          if (!msg.isYou && !openRef.current) sound.playClick();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel?.(channel);
    };
  }, [googleUser, recomputeUnread]);

  useEffect(() => {
    if (!open) return;
    markRead();
    window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 60);
  }, [open, messages.length, markRead]);

  async function sendBody(textRaw: string) {
    const text = textRaw.trim().slice(0, 280);
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          displayName: profile.displayName,
          avatarUrl: profile.usePresetAvatar ? null : avatarSrc,
          avatarId: profile.avatarId,
          usePresetAvatar: Boolean(profile.usePresetAvatar || (!avatarSrc && profile.avatarId)),
          equippedFrame:
            profile.equippedFrame && profile.equippedFrame !== "none"
              ? profile.equippedFrame
              : "none",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: ChatMessage;
        error?: string;
        needsMigration?: boolean;
      };
      if (data.needsMigration) {
        setNeedsMigration(true);
        setError("Run the club_chat SQL in Supabase once.");
        return;
      }
      if (!data.ok || !data.message) {
        setError(data.error || "Send failed");
        return;
      }
      setDraft("");
      setPicker("off");
      setMessages((prev) =>
        prev.some((m) => m.id === data.message!.id) ? prev : [...prev, data.message!]
      );
      writeCursor(data.message.createdAt);
      onUnreadChange(0);
      sound.playClick();
    } catch {
      setError("Network error sending");
    } finally {
      setSending(false);
    }
  }

  async function send() {
    await sendBody(draft);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => {
        markRead();
        onOpenChange(false);
      }}
    >
      <div
        className="animate-rise flex h-[min(78vh,600px)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-[#F5C518]/30 bg-gradient-to-b from-[#1a2218] via-[#12161a] to-[#0a0c10] shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal
        aria-label="Live club chat"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/12 text-[#F5C518]">
              <ChatIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5C518]">Live chat</p>
              <p className="text-sm font-black text-white">Club rail</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white hover:border-white/30"
            onClick={() => {
              markRead();
              onOpenChange(false);
            }}
          >
            Close
          </button>
        </div>

        <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {!googleUser ? (
            <p className="px-2 text-sm font-semibold text-[#9AA0B4]">Sign in with Google to chat.</p>
          ) : null}
          {needsMigration ? (
            <p className="rounded-2xl border border-[#F5C518]/25 bg-[#F5C518]/10 px-3 py-2 text-[12px] font-semibold text-[#F5C518]">
              Apply `002_club_chat.sql` in Supabase, then reopen chat.
            </p>
          ) : null}
          {error && !needsMigration ? (
            <p className="text-[12px] font-semibold text-[#fb7185]">{error}</p>
          ) : null}
          {messages.length === 0 && googleUser && !needsMigration ? (
            <p className="px-2 text-sm font-semibold text-[#9AA0B4]">No messages yet — say hi.</p>
          ) : null}
          {messages.map((m) => {
            const sticker = isStickerBody(m.body);
            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2",
                  m.isYou ? "flex-row-reverse text-right" : "flex-row text-left"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  <PublicPlayerAvatar
                    size={32}
                    displayName={m.displayName}
                    avatarUrl={m.usePresetAvatar ? null : m.avatarUrl}
                    avatarId={m.avatarId || "fox"}
                    usePresetAvatar={Boolean(m.usePresetAvatar || (!m.avatarUrl && m.avatarId))}
                    equippedFrame={m.equippedFrame && m.equippedFrame !== "none" ? m.equippedFrame : "none"}
                  />
                </div>
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl border px-3 py-2",
                    m.isYou
                      ? "border-[#F5C518]/30 bg-[#F5C518]/12"
                      : "border-white/10 bg-black/35"
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4]">
                    {m.displayName}
                    <span className="ml-2 font-mono normal-case tracking-normal opacity-70">
                      {formatChatTime(m.createdAt)}
                    </span>
                  </p>
                  {sticker ? (
                    (() => {
                      const id = stickerIdFromBody(m.body);
                      const hd = id ? stickerById(id) : undefined;
                      if (hd) {
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={hd.src}
                            alt={hd.label}
                            className="mt-1 mx-auto h-20 w-20 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
                          />
                        );
                      }
                      return (
                        <p className="mt-1 text-center text-[2rem] leading-none" aria-label="sticker">
                          {stickerGlyph(m.body)}
                        </p>
                      );
                    })()
                  ) : (
                    <p className="mt-0.5 whitespace-pre-wrap text-sm font-semibold leading-snug text-white">
                      {m.body}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {picker !== "off" ? (
          <div className="border-t border-white/8 bg-black/40 px-3 py-2">
            <div className="mb-2 flex gap-1">
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-black",
                  picker === "emoji"
                    ? "bg-[#F5C518] text-[#1A1400]"
                    : "border border-white/10 text-[#9AA0B4]"
                )}
                onClick={() => setPicker("emoji")}
              >
                Emoji
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-black",
                  picker === "sticker"
                    ? "bg-[#F5C518] text-[#1A1400]"
                    : "border border-white/10 text-[#9AA0B4]"
                )}
                onClick={() => setPicker("sticker")}
              >
                Stickers
              </button>
            </div>
            {picker === "emoji" ? (
              <div className="grid max-h-36 grid-cols-8 gap-1 overflow-y-auto">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="flex h-9 items-center justify-center rounded-xl text-xl hover:bg-white/10"
                    onClick={() => setDraft((d) => (d + e).slice(0, 280))}
                  >
                    {e}
                  </button>
                ))}
              </div>
            ) : (
              <div className="max-h-48 space-y-3 overflow-y-auto">
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-[#9AA0B4]">
                    Free
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {FREE_CHAT_STICKERS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!googleUser || needsMigration || sending}
                        className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-black/30 px-2 py-2 hover:border-[#F5C518]/35 disabled:opacity-50"
                        onClick={() => void sendBody(`stk:${s.id}`)}
                      >
                        <span className="text-2xl leading-none">{s.glyph}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wide text-[#9AA0B4]">
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-[#F5C518]">
                    HD premium {unlockedHd.length ? `(${unlockedHd.length})` : "— buy in Shop"}
                  </p>
                  {unlockedHd.length === 0 ? (
                    <p className="rounded-xl border border-[#F5C518]/20 bg-[#F5C518]/8 px-3 py-2 text-[11px] font-semibold text-[#F5C518]">
                      Unlock Neon Suits or VIP Casino packs in Shop to send HD stickers.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {unlockedHd.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          disabled={!googleUser || needsMigration || sending}
                          className="flex flex-col items-center gap-1 rounded-2xl border border-[#F5C518]/25 bg-black/40 px-1.5 py-2 hover:border-[#F5C518]/55 disabled:opacity-50"
                          onClick={() => void sendBody(`stk:${s.id}`)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.src} alt={s.label} className="h-12 w-12 object-contain" />
                          <span className="truncate text-[8px] font-bold uppercase tracking-wide text-[#9AA0B4]">
                            {s.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="border-t border-white/8 p-3">
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Emoji and stickers"
              disabled={!googleUser || needsMigration}
              onClick={() => setPicker((p) => (p === "off" ? "emoji" : "off"))}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg transition",
                picker !== "off"
                  ? "border-[#F5C518]/50 bg-[#F5C518]/15"
                  : "border-white/10 bg-black/35 hover:border-white/25",
                (!googleUser || needsMigration) && "opacity-40"
              )}
            >
              😊
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 280))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={googleUser ? "Say something…" : "Sign in to chat"}
              disabled={!googleUser || needsMigration || sending}
              className="min-h-11 flex-1 rounded-2xl border border-white/10 bg-black/35 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#F5C518]/45"
            />
            <GradientButton
              className="min-h-11 min-w-[4.75rem] px-3"
              disabled={!googleUser || needsMigration || sending || !draft.trim()}
              onClick={() => void send()}
            >
              {sending ? "…" : "Send"}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
}
