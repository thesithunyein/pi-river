/** Relative clock for match history / activity feeds. */
export function formatRelativeTime(at: number, now = Date.now()): string {
  if (!Number.isFinite(at) || at <= 0) return "—";
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 45) return "Just now";
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d ago`;
  try {
    return new Date(at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}
