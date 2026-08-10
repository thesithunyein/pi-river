import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarId?: string | null;
  usePresetAvatar?: boolean;
  equippedFrame?: string;
  body: string;
  createdAt: string;
  isYou?: boolean;
};

function isMissingTable(message: string) {
  return /relation|does not exist|schema cache/i.test(message);
}

const CHAT_SELECT =
  "id, user_id, display_name, avatar_url, avatar_id, use_preset_avatar, equipped_frame, body, created_at";

function rowToMessage(row: Record<string, unknown>, me?: string): ChatMessage {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    displayName: (typeof row.display_name === "string" && row.display_name) || "Player",
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    avatarId: typeof row.avatar_id === "string" ? row.avatar_id : null,
    usePresetAvatar: Boolean(row.use_preset_avatar),
    equippedFrame:
      typeof row.equipped_frame === "string" && row.equipped_frame !== "none"
        ? row.equipped_frame
        : "none",
    body: String(row.body || ""),
    createdAt: String(row.created_at || new Date().toISOString()),
    isYou: me ? row.user_id === me : false,
  };
}

export async function GET(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const after = url.searchParams.get("after");
  const limit = Math.min(80, Math.max(1, Number(url.searchParams.get("limit") || "40") || 40));

  let q = supabase
    .from("club_chat_messages")
    .select(CHAT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (after) {
    q = q.gt("created_at", after);
  }

  const { data, error } = await q;
  if (error) {
    // Fallback if migration 009 not applied yet
    if (/avatar_id|equipped_frame|use_preset/i.test(error.message)) {
      let legacy = supabase
        .from("club_chat_messages")
        .select("id, user_id, display_name, avatar_url, body, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (after) legacy = legacy.gt("created_at", after);
      const legacyRes = await legacy;
      if (!legacyRes.error) {
        const messages = ((legacyRes.data || []) as Array<Record<string, unknown>>)
          .map((row) => rowToMessage(row, user.id))
          .reverse();
        return NextResponse.json({
          ok: true,
          messages,
          me: user.id,
          needsMigration: true,
        });
      }
    }
    return NextResponse.json({
      ok: false,
      error: error.message,
      needsMigration: isMissingTable(error.message),
      messages: [] as ChatMessage[],
    });
  }

  const messages: ChatMessage[] = ((data || []) as Array<Record<string, unknown>>)
    .map((row) => rowToMessage(row, user.id))
    .reverse();

  return NextResponse.json({ ok: true, messages, me: user.id });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const body = (await req.json()) as {
    body?: string;
    displayName?: string;
    avatarUrl?: string | null;
    avatarId?: string | null;
    usePresetAvatar?: boolean;
    equippedFrame?: string | null;
  };
  const text = String(body.body || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
  if (text.length < 1) {
    return NextResponse.json({ ok: false, error: "Message empty" }, { status: 400 });
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const googlePic =
    (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta?.picture === "string" && meta.picture) ||
    null;
  const displayName =
    (typeof body.displayName === "string" && body.displayName.trim().slice(0, 32)) ||
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "Player";

  const usePresetAvatar = Boolean(body.usePresetAvatar);
  const avatarId =
    typeof body.avatarId === "string" && body.avatarId.trim()
      ? body.avatarId.trim().slice(0, 40)
      : "fox";
  const equippedFrame =
    typeof body.equippedFrame === "string" && body.equippedFrame !== "none"
      ? body.equippedFrame.slice(0, 40)
      : "none";

  let avatarUrl: string | null = null;
  if (!usePresetAvatar) {
    if (typeof body.avatarUrl === "string" && body.avatarUrl.startsWith("http")) {
      avatarUrl = body.avatarUrl.slice(0, 500);
    } else if (typeof body.avatarUrl === "string" && body.avatarUrl.startsWith("data:")) {
      // data URLs are too large for chat rows — fall back to Google if present
      avatarUrl = googlePic;
    } else {
      avatarUrl = googlePic;
    }
  }

  const insertRow: Record<string, unknown> = {
    user_id: user.id,
    display_name: displayName,
    avatar_url: avatarUrl,
    body: text,
    avatar_id: avatarId,
    use_preset_avatar: usePresetAvatar,
    equipped_frame: equippedFrame,
  };

  let { data, error } = await supabase
    .from("club_chat_messages")
    .insert(insertRow)
    .select(CHAT_SELECT)
    .single();

  // Pre-migration fallback
  if (error && /avatar_id|equipped_frame|use_preset/i.test(error.message)) {
    const legacy = await supabase
      .from("club_chat_messages")
      .insert({
        user_id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
        body: text,
      })
      .select("id, user_id, display_name, avatar_url, body, created_at")
      .single();
    data = legacy.data;
    error = legacy.error;
  }

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        needsMigration: isMissingTable(error.message),
      },
      { status: isMissingTable(error.message) ? 503 : 500 }
    );
  }

  const row = data as Record<string, unknown>;
  return NextResponse.json({
    ok: true,
    message: { ...rowToMessage(row, user.id), isYou: true },
  });
}
