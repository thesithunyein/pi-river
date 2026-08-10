import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  isYou?: boolean;
};

function isMissingTable(message: string) {
  return /relation|does not exist|schema cache/i.test(message);
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
    .select("id, user_id, display_name, avatar_url, body, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (after) {
    q = q.gt("created_at", after);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({
      ok: false,
      error: error.message,
      needsMigration: isMissingTable(error.message),
      messages: [] as ChatMessage[],
    });
  }

  const messages: ChatMessage[] = ((data || []) as Array<Record<string, unknown>>)
    .map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      displayName: (typeof row.display_name === "string" && row.display_name) || "Player",
      avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
      body: String(row.body || ""),
      createdAt: String(row.created_at || new Date().toISOString()),
      isYou: row.user_id === user.id,
    }))
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
  const avatarUrl =
    typeof body.avatarUrl === "string" && body.avatarUrl.startsWith("http")
      ? body.avatarUrl.slice(0, 500)
      : googlePic;

  const { data, error } = await supabase
    .from("club_chat_messages")
    .insert({
      user_id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      body: text,
    })
    .select("id, user_id, display_name, avatar_url, body, created_at")
    .single();

  if (error) {
    return NextResponse.json({
      ok: false,
      error: error.message,
      needsMigration: isMissingTable(error.message),
    }, { status: isMissingTable(error.message) ? 503 : 500 });
  }

  const row = data as Record<string, unknown>;
  return NextResponse.json({
    ok: true,
    message: {
      id: String(row.id),
      userId: String(row.user_id),
      displayName: String(row.display_name || "Player"),
      avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
      body: String(row.body || ""),
      createdAt: String(row.created_at),
      isYou: true,
    } satisfies ChatMessage,
  });
}
