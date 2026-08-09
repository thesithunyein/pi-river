/** Last live table so Play tab returns to the game instead of lobby. */

export type ActiveTable = {
  id: string;
  mode: "bot" | "friend";
  stake: number;
};

const KEY = "pi_river_active_table_v1";

export function readActiveTable(): ActiveTable | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveTable;
    if (!parsed?.id || !/^\d+$/.test(parsed.id)) return null;
    return {
      id: parsed.id,
      mode: parsed.mode === "friend" ? "friend" : "bot",
      stake: Number(parsed.stake) || 1,
    };
  } catch {
    return null;
  }
}

export function writeActiveTable(table: ActiveTable) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(table));
    window.dispatchEvent(new Event("pi-river-active-table"));
  } catch {
    // ignore
  }
}

export function clearActiveTable() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("pi-river-active-table"));
  } catch {
    // ignore
  }
}

export function activeTableHref(table: ActiveTable) {
  return `/table/${table.id}?mode=${table.mode}&stake=${table.stake}`;
}
