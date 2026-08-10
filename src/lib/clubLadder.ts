import { ladderScore } from "@/lib/progressSync";

export type LadderEntry = {
  id: string;
  name: string;
  wins: number;
  tickets: number;
  score: number;
  avatarId?: string;
  avatarUrl?: string;
  usePresetAvatar?: boolean;
  equippedFrame?: string;
  online?: boolean;
  isYou?: boolean;
  isHouse?: boolean;
};

/** Merge live rows; always include you. No house fillers. */
export function mergeLiveLadder(
  live: LadderEntry[],
  you: { displayName: string; wins: number; tickets: number; totalEarnings: number }
): LadderEntry[] {
  const youScore = ladderScore(you.wins, you.tickets, you.totalEarnings);
  const youRow: LadderEntry = {
    id: "you",
    name: you.displayName || "You",
    wins: you.wins,
    tickets: you.tickets,
    score: youScore,
    isYou: true,
  };

  const withoutYouDup = live.filter((e) => !e.isYou && !e.isHouse);
  let board = [...withoutYouDup];
  if (!board.some((e) => e.isYou) && !live.some((e) => e.isYou)) {
    board.push(youRow);
  } else if (live.some((e) => e.isYou)) {
    board = live.map((e) => (e.isYou ? { ...e, ...youRow, id: e.id } : e));
  } else {
    board.push(youRow);
  }

  return board.sort((a, b) => b.score - a.score || b.wins - a.wins).slice(0, 8);
}

/** Offline / empty board — just you. */
export function buildClubLadder(opts: {
  displayName: string;
  wins: number;
  tickets: number;
  totalEarnings: number;
}): LadderEntry[] {
  return mergeLiveLadder([], opts);
}

export function formatMatchChips(delta: number, result: "win" | "loss", hand: string): string {
  if (result === "win") return `+${Math.abs(delta).toLocaleString()}`;
  if (delta === 0) {
    if (/fold/i.test(hand)) return "Folded";
    return "—";
  }
  return `-${Math.abs(delta).toLocaleString()}`;
}
