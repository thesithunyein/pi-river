import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ladderScore } from "@/lib/progressSync";
import type { LadderEntry } from "@/lib/clubLadder";
import { readClubLadder } from "@/lib/economy/onchain";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  // 1) On-chain RiverClub (durable, no SQL)
  try {
    const chainRows = await readClubLadder(12);
    if (chainRows.length > 0) {
      const entries: LadderEntry[] = chainRows.map((row) => ({
        id: row.id,
        name: row.name,
        wins: row.wins,
        tickets: row.tickets,
        score: row.score,
        isYou: false,
        isHouse: false,
      }));
      return NextResponse.json({
        ok: true,
        entries,
        source: "chain",
        me: user?.id ?? null,
      });
    }
  } catch {
    // fall through
  }

  // 2) Optional SQL table
  if (supabase) {
    const { data, error } = await supabase
      .from("player_progress")
      .select("user_id, display_name, avatar_url, wins, tickets_minted, total_earnings, score, profile")
      .order("score", { ascending: false })
      .order("wins", { ascending: false })
      .limit(12);

    if (!error && data?.length) {
      const entries: LadderEntry[] = (data as Array<Record<string, unknown>>).map((row) => {
        const wins = Number(row.wins) || 0;
        const tickets = Number(row.tickets_minted) || 0;
        const earnings = Number(row.total_earnings) || 0;
        const profile = (row.profile && typeof row.profile === "object" ? row.profile : {}) as {
          avatarId?: string;
        };
        return {
          id: String(row.user_id),
          name: (typeof row.display_name === "string" && row.display_name) || "Player",
          wins,
          tickets,
          score: Number(row.score) || ladderScore(wins, tickets, earnings),
          avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : undefined,
          avatarId: profile.avatarId,
          isYou: Boolean(user?.id && row.user_id === user.id),
          isHouse: false,
        };
      });
      return NextResponse.json({ ok: true, entries, source: "table", me: user?.id ?? null });
    }
  }

  // 3) Honest empty — no house fillers
  return NextResponse.json({
    ok: true,
    entries: [],
    source: "empty",
    me: user?.id ?? null,
  });
}
