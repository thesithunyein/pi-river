import { NextResponse } from "next/server";
import { botSubmitShowdown } from "@/lib/bot/inco";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tableId?: string | number };
    const tableId = BigInt(String(body.tableId ?? "0"));
    if (tableId <= 0n) {
      return NextResponse.json({ error: "Invalid table id." }, { status: 400 });
    }
    const result = await botSubmitShowdown(tableId);
    if (result.skipped) {
      return NextResponse.json(
        { error: result.reason || "Not at showdown.", skipped: true, reason: result.reason },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bot showdown failed." },
      { status: 500 }
    );
  }
}
