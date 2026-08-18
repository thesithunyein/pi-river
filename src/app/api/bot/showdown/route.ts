import { NextResponse } from "next/server";
import type { Hex } from "viem";
import { botSubmitShowdown } from "@/lib/bot/inco";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      tableId?: string | number;
      board?: Array<{ value?: string | number; sigs?: string[] }>;
    };
    const tableId = BigInt(String(body.tableId ?? "0"));
    if (tableId <= 0n) {
      return NextResponse.json({ error: "Invalid table id." }, { status: 400 });
    }
    const boardProofs = Array.isArray(body.board)
      ? body.board
          .filter((proof) => proof && proof.value !== undefined && Array.isArray(proof.sigs))
          .slice(0, 5)
          .map((proof) => ({
            value: BigInt(String(proof.value)),
            sigs: proof.sigs as Hex[],
          }))
      : [];
    const result = await botSubmitShowdown(tableId, boardProofs);
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
