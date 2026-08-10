import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  applyVeteranChipCap,
  ECONOMY_VERSION,
  mergeProgressAgainstExisting,
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

  // Prefer durable table when migration is applied; merge with auth meta so owns aren't lost
  const tableRes = await supabase.from("player_progress").select("*").eq("user_id", user.id).maybeSingle();
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta = fromCompactCloud(meta?.[CLOUD_META_KEY]);

  if (!tableRes.error && tableRes.data) {
    const fromTable = rowToPayload(tableRes.data as Record<string, unknown>);
    const progress = fromMeta ? mergeProgressAgainstExisting(fromTable, fromMeta) : fromTable;
    return NextResponse.json({
      ok: true,
      progress,
      source: "table",
    });
  }

  // Zero-migrate fallback: auth user_metadata
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

  // Load existing so we never store a regression of career stats
  let existing: ProgressPayload | null = null;
  const existingRes = await supabase
    .from("player_progress")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existingRes.error && existingRes.data) {
    existing = rowToPayload(existingRes.data as Record<string, unknown>);
  } else {
    const userMeta = user.user_metadata as Record<string, unknown> | undefined;
    existing = fromCompactCloud(userMeta?.[CLOUD_META_KEY]) ?? null;
  }

  const mergedIncoming = mergeProgressAgainstExisting(body, existing);
  const { chips, capped } = applyVeteranChipCap(mergedIncoming.chips ?? 0, mergedIncoming.economyVersion);
  const payload: ProgressPayload = {
    ...mergedIncoming,
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
  let upsert = await supabase
    .from("player_progress")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();

  // Older DBs may lack owned_frames / owned_stickers — retry stripped (profile JSON still keeps owns)
  if (
    upsert.error &&
    /owned_frames|owned_stickers|column .* does not exist|schema cache/i.test(upsert.error.message)
  ) {
    const rowSafe = { ...(row as Record<string, unknown>) };
    delete rowSafe.owned_frames;
    delete rowSafe.owned_stickers;
    upsert = await supabase
      .from("player_progress")
      .upsert(rowSafe, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();
  }

  const { data, error } = upsert;

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
