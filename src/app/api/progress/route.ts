import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  applyVeteranChipCap,
  ECONOMY_VERSION,
  payloadToRow,
  rowToPayload,
  type ProgressPayload,
} from "@/lib/progressSync";
import { CLOUD_META_KEY, fromCompactCloud, toCompactCloud } from "@/lib/cloudProgress";

function isMissingTable(message: string) {
  return /relation|does not exist|schema cache/i.test(message);
}

export async function GET() {
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

  // Prefer durable table when migration is applied
  const tableRes = await supabase.from("player_progress").select("*").eq("user_id", user.id).maybeSingle();
  if (!tableRes.error && tableRes.data) {
    return NextResponse.json({
      ok: true,
      progress: rowToPayload(tableRes.data as Record<string, unknown>),
      source: "table",
    });
  }

  // Zero-migrate fallback: auth user_metadata
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta = fromCompactCloud(meta?.[CLOUD_META_KEY]);
  if (fromMeta) {
    return NextResponse.json({
      ok: true,
      progress: fromMeta,
      source: "auth",
      needsMigration: Boolean(tableRes.error && isMissingTable(tableRes.error.message)),
    });
  }

  if (tableRes.error && isMissingTable(tableRes.error.message)) {
    return NextResponse.json({
      ok: true,
      progress: null,
      source: "auth",
      needsMigration: true,
    });
  }

  return NextResponse.json({
    ok: true,
    progress: null,
    source: tableRes.error ? "auth" : "table",
    error: tableRes.error?.message,
  });
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

  let body: ProgressPayload;
  try {
    body = (await req.json()) as ProgressPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { chips, capped } = applyVeteranChipCap(body.chips ?? 0, body.economyVersion);
  const payload: ProgressPayload = {
    ...body,
    chips,
    economyVersion: ECONOMY_VERSION,
  };

  // Always write compact auth metadata so device-switch works without SQL
  const compact = toCompactCloud(payload);
  const meta = { ...(user.user_metadata || {}), [CLOUD_META_KEY]: compact };
  const { error: metaError } = await supabase.auth.updateUser({ data: meta });

  // Best-effort durable table
  let source: "table" | "auth" = "auth";
  let needsMigration = false;
  const row = payloadToRow(user.id, payload);
  const { data, error } = await supabase
    .from("player_progress")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();

  if (!error && data) {
    source = "table";
  } else if (error && isMissingTable(error.message)) {
    needsMigration = true;
  }

  if (metaError && error) {
    return NextResponse.json({
      ok: false,
      error: metaError.message || error.message,
      needsMigration,
      capped,
    });
  }

  return NextResponse.json({
    ok: true,
    progress: data ? rowToPayload(data as Record<string, unknown>) : payload,
    source,
    needsMigration,
    capped,
  });
}
