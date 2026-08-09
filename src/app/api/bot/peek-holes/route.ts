import { NextResponse } from "next/server";
import { botPeekHoles } from "@/lib/bot/inco";

export const runtime = "nodejs";
export const maxDuration = 45;

/** Reveal River Bot's hole cards for post-hand UX (fold / settle). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tableId?: string | number };
    const tableId = BigInt(String(body.tableId ?? "0"));
    if (tableId <= 0n) {
      return NextResponse.json({ error: "Invalid table id." }, { status: 400 });
    }
    const result = await botPeekHoles(tableId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not reveal bot cards." },
      { status: 500 },
    );
  }
}
