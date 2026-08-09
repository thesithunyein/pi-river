"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthGate } from "@/components/AuthGate";
import {
  friendChannel,
  friendCodeFromUserId,
  normalizeFriendCode,
  readFriends,
  removeFriend,
  upsertFriend,
  type Friend,
} from "@/lib/friends";
import { GradientButton } from "@/components/ui/GradientButton";
import { cn } from "@/lib/cn";

type Props = {
  /** After host creates a table, call with the id to push to selected friend */
  onRequestChallenge?: (friend: Friend) => void;
  /** Current pending push target (optional highlight) */
  selectedCode?: string | null;
  onSelectFriend?: (friend: Friend | null) => void;
  className?: string;
};

export async function pushChallengeToFriend(opts: {
  friendCode: string;
  tableId: string;
  fromName: string;
  fromUserId: string;
}) {
  const supabase = createClient();
  if (typeof supabase.channel !== "function") {
    return { ok: false as const, error: "Realtime unavailable" };
  }
  const fromCode = friendCodeFromUserId(opts.fromUserId);
  const channel = supabase.channel(friendChannel(opts.friendCode), {
    config: { broadcast: { self: false } },
  });
  await new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("invite timeout")), 8000);
    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        window.clearTimeout(t);
        resolve();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        window.clearTimeout(t);
        reject(new Error(status));
      }
    });
  });
  await channel.send({
    type: "broadcast",
    event: "challenge",
    payload: {
      tableId: opts.tableId,
      fromCode,
      fromName: opts.fromName,
      at: Date.now(),
    },
  });
  void supabase.removeChannel?.(channel);
  return { ok: true as const };
}

export function FriendsChallengePanel({
  onRequestChallenge,
  selectedCode,
  onSelectFriend,
  className,
}: Props) {
  const { googleUser } = useAuthGate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [addCode, setAddCode] = useState("");
  const [addName, setAddName] = useState("");
  const [notice, setNotice] = useState("");

  const myCode = googleUser?.id ? friendCodeFromUserId(googleUser.id) : "";

  useEffect(() => {
    const sync = () => setFriends(readFriends());
    sync();
    window.addEventListener("pi-river-friends", sync);
    return () => window.removeEventListener("pi-river-friends", sync);
  }, []);

  if (!googleUser) {
    return (
      <div className={cn("rounded-2xl border border-white/10 bg-black/25 p-3 text-left", className)}>
        <p className="text-[11px] font-semibold text-[#9dceb4]">
          Sign in with Google to get a friend code and push Challenges.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 text-left", className)}>
      <div className="rounded-2xl border border-[#F5C518]/25 bg-black/30 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5C518]/90">
          Your friend code
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="font-mono text-lg font-black tracking-widest text-white">{myCode}</p>
          <button
            type="button"
            className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold text-[#F5C518]"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(myCode);
                setNotice("Code copied.");
              } catch {
                setNotice(myCode);
              }
            }}
          >
            Copy
          </button>
        </div>
        <p className="mt-1 text-[10px] font-semibold text-[#9dceb4]">
          Friends add this code — then you can push a Challenge to their inbox.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9dceb4]">
          Add friend
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={addCode}
            onChange={(e) => setAddCode(normalizeFriendCode(e.target.value))}
            placeholder="Their code"
            maxLength={8}
            className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-center font-mono text-sm font-bold tracking-wider text-white outline-none placeholder:text-white/35 focus:border-[#F5C518]/50"
          />
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value.slice(0, 24))}
            placeholder="Name (optional)"
            className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#F5C518]/50"
          />
          <GradientButton
            variant="secondary"
            className="min-h-11 border-white/15 bg-black/30 sm:min-w-[5.5rem]"
            onClick={() => {
              const code = normalizeFriendCode(addCode);
              if (code.length < 4) {
                setNotice("Enter a valid friend code.");
                return;
              }
              if (code === myCode) {
                setNotice("That is your own code.");
                return;
              }
              upsertFriend({ c: code, n: addName.trim() || "Friend" });
              setAddCode("");
              setAddName("");
              setNotice("Friend added.");
            }}
          >
            Add
          </GradientButton>
        </div>
      </div>

      {friends.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9dceb4]">
            Friends
          </p>
          <div className="mt-2 space-y-2">
            {friends.map((f) => {
              const selected = selectedCode === f.c;
              return (
                <div
                  key={f.c}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2.5 py-2",
                    selected ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-black/20"
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelectFriend?.(selected ? null : f)}
                  >
                    <p className="truncate text-sm font-bold text-white">{f.n}</p>
                    <p className="font-mono text-[10px] font-semibold tracking-wider text-[#9dceb4]">
                      {f.c}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-emerald-400/35 px-2.5 py-1 text-[10px] font-bold text-[#86efac]"
                    onClick={() => {
                      onSelectFriend?.(f);
                      onRequestChallenge?.(f);
                    }}
                  >
                    Challenge
                  </button>
                  <button
                    type="button"
                    className="shrink-0 text-[10px] font-bold text-white/40 hover:text-white/70"
                    onClick={() => removeFriend(f.c)}
                    aria-label={`Remove ${f.n}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] font-semibold text-[#9dceb4]">
            Tap Challenge — we open the table and push to their inbox (link still works).
          </p>
        </div>
      ) : null}

      {notice ? <p className="text-[11px] font-semibold text-[#F5C518]">{notice}</p> : null}
    </div>
  );
}
