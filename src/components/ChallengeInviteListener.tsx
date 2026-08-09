"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthGate } from "@/components/AuthGate";
import {
  dismissInvite,
  friendChannel,
  friendCodeFromUserId,
  pushInviteInbox,
  readInviteInbox,
  type ChallengeInvite,
} from "@/lib/friends";
import { GradientButton } from "@/components/ui/GradientButton";

/** Listens for friend Challenge pushes + shows inbox banner. */
export function ChallengeInviteListener() {
  const { googleUser } = useAuthGate();
  const router = useRouter();
  const [inbox, setInbox] = useState<ChallengeInvite[]>([]);

  useEffect(() => {
    const sync = () => setInbox(readInviteInbox());
    sync();
    window.addEventListener("pi-river-inbox", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("pi-river-inbox", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (!googleUser?.id) return;
    const myCode = friendCodeFromUserId(googleUser.id);
    const supabase = createClient();
    if (typeof supabase.channel !== "function") return;

    const channel = supabase.channel(friendChannel(myCode), {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "challenge" }, (msg: { payload?: Partial<ChallengeInvite> }) => {
      const p = msg.payload;
      if (!p?.tableId || !p.fromCode) return;
      pushInviteInbox({
        tableId: String(p.tableId),
        fromCode: String(p.fromCode),
        fromName: String(p.fromName || "Friend"),
        at: typeof p.at === "number" ? p.at : Date.now(),
      });
    });

    channel.subscribe();
    return () => {
      void supabase.removeChannel?.(channel);
    };
  }, [googleUser?.id]);

  const top = inbox[0];
  if (!top) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-emerald-400/35 bg-gradient-to-r from-[#0f2a1c] to-[#122018] px-3 py-2.5 shadow-[0_12px_32px_rgba(52,211,153,0.18)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#86efac]">
        Challenge invite
      </p>
      <p className="mt-0.5 text-sm font-bold text-white">
        {top.fromName} · table #{top.tableId}
      </p>
      <div className="mt-2 flex gap-2">
        <GradientButton
          className="min-h-10 flex-1 text-sm"
          onClick={() => {
            dismissInvite(top.tableId);
            router.push(`/?join=${top.tableId}`);
          }}
        >
          Open invite
        </GradientButton>
        <button
          type="button"
          className="rounded-xl border border-white/15 px-3 text-xs font-bold text-[#9dceb4]"
          onClick={() => dismissInvite(top.tableId)}
        >
          Dismiss
        </button>
      </div>
      {inbox.length > 1 ? (
        <p className="mt-1.5 text-[10px] font-semibold text-[#9dceb4]">
          +{inbox.length - 1} more in inbox
        </p>
      ) : null}
    </div>
  );
}
