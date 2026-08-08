import { NextResponse } from "next/server";
import { botAct, difficultyFromXp, type BotDifficulty } from "@/lib/bot/table";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      tableId?: string | number;
      xp?: number;
      difficulty?: number;
    };
    const tableId = BigInt(String(body.tableId ?? "0"));
    if (tableId <= 0n) {
      return NextResponse.json({ error: "Invalid table id." }, { status: 400 });
    }
    let difficulty: BotDifficulty = 1;
    if (body.difficulty === 2 || body.difficulty === 3) {
      difficulty = body.difficulty;
    } else if (typeof body.xp === "number") {
      difficulty = difficultyFromXp(body.xp);
    }
    const result = await botAct(tableId, difficulty);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bot act failed." },
      { status: 500 }
    );
  }
}
