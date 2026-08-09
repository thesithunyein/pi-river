/** Recent Challenge invites — local retention until friends graph exists. */

const KEY = "pi_river_recent_challenges_v1";

export type RecentChallenge = {
  tableId: string;
  createdAt: number;
  role: "host" | "guest";
};

export function readRecentChallenges(): RecentChallenge[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentChallenge[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.tableId === "string")
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function pushRecentChallenge(tableId: string, role: "host" | "guest") {
  if (typeof window === "undefined") return;
  try {
    const prev = readRecentChallenges().filter((c) => c.tableId !== tableId);
    const next = [{ tableId, createdAt: Date.now(), role }, ...prev].slice(0, 8);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("pi-river-challenges"));
  } catch {
    // ignore
  }
}

export function challengeInviteUrl(tableId: string) {
  if (typeof window === "undefined") return `/?join=${tableId}`;
  return `${window.location.origin}/?join=${tableId}`;
}
