import { ECONOMY_VERSION, type ProgressPayload } from "@/lib/progressSync";

type CompactMatch = {
  o: string;
  r: "w" | "l";
  h: string;
  d: number;
  a: number;
};

/** Compact cloud blob for auth.user_metadata — works with zero SQL migrate. */
export type CompactCloud = {
  v: number;
  c: number;
  x: number;
  vt: string;
  cb: string;
  tf: string;
  ocb: string[];
  otf: string[];
  ld: number | null;
  rd: number;
  st: ProgressPayload["stats"];
  sfx: boolean;
  mus: boolean;
  dn: string;
  aid?: string;
  up?: boolean;
  au?: string | null;
  bio?: string;
  mc: number;
  tm: number;
  mp: Record<string, number>;
  mcl: string[];
  fr?: { c: string; n: string; id?: string }[];
  /** Recent hand log (survives login/logout without SQL) */
  mh?: CompactMatch[];
};

function compactMatches(raw: unknown): CompactMatch[] {
  if (!Array.isArray(raw)) return [];
  const out: CompactMatch[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const m = row as Record<string, unknown>;
    const a = typeof m.at === "number" ? m.at : typeof m.a === "number" ? m.a : 0;
    const o = String(m.opponent ?? m.o ?? "Opponent").slice(0, 28);
    const h = String(m.hand ?? m.h ?? "Hand").slice(0, 28);
    const r: "w" | "l" = m.result === "win" || m.r === "w" ? "w" : "l";
    const d = Math.trunc(Number(m.chipsDelta ?? m.d) || 0);
    if (!a) continue;
    const key = `${a}|${o}|${h}|${r}|${d}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ o, r, h, d, a });
    if (out.length >= 12) break;
  }
  return out;
}

export function toCompactCloud(p: ProgressPayload): CompactCloud {
  const au = p.profile?.avatarUrl;
  return {
    v: p.economyVersion ?? ECONOMY_VERSION,
    c: p.chips,
    x: p.xp,
    vt: p.vipTier,
    cb: p.equippedCardBack,
    tf: p.equippedTableFelt,
    ocb: p.ownedCardBacks?.slice(0, 12) ?? ["classic"],
    otf: p.ownedTableFelts?.slice(0, 12) ?? ["green"],
    ld: p.lastDailyBonusTime,
    rd: p.rewardTrackDay,
    st: p.stats,
    sfx: p.soundEnabled !== false,
    mus: p.musicEnabled !== false,
    dn: p.profile?.displayName || "Player",
    aid: p.profile?.avatarId,
    up: Boolean(p.profile?.usePresetAvatar),
    au: typeof au === "string" && au.startsWith("http") ? au.slice(0, 500) : null,
    bio: p.profile?.bio?.slice(0, 80),
    mc: p.megapotCredits,
    tm: p.ticketsMinted,
    mp: p.missionProgress || {},
    mcl: (p.missionsClaimed || []).slice(0, 20),
    fr: (p.friends || []).slice(0, 40),
    mh: compactMatches(p.matchHistory),
  };
}

export function fromCompactCloud(raw: unknown): ProgressPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<CompactCloud>;
  if (typeof c.c !== "number" || typeof c.x !== "number") return null;
  const mh = Array.isArray(c.mh)
    ? c.mh.map((m) => ({
        opponent: String(m.o || "Opponent"),
        result: (m.r === "w" ? "win" : "loss") as "win" | "loss",
        hand: String(m.h || "Hand"),
        chipsDelta: Math.trunc(Number(m.d) || 0),
        at: typeof m.a === "number" ? m.a : 0,
      }))
    : [];
  return {
    chips: c.c,
    xp: c.x,
    vipTier: typeof c.vt === "string" ? c.vt : "Bronze",
    equippedCardBack: typeof c.cb === "string" ? c.cb : "classic",
    equippedTableFelt: typeof c.tf === "string" ? c.tf : "green",
    ownedCardBacks: Array.isArray(c.ocb) && c.ocb.length ? c.ocb.map(String) : ["classic"],
    ownedTableFelts: Array.isArray(c.otf) && c.otf.length ? c.otf.map(String) : ["green"],
    lastDailyBonusTime: typeof c.ld === "number" ? c.ld : null,
    rewardTrackDay: typeof c.rd === "number" ? c.rd : 1,
    stats: {
      handsPlayed: Number(c.st?.handsPlayed) || 0,
      gamesWon: Number(c.st?.gamesWon) || 0,
      biggestWin: Number(c.st?.biggestWin) || 0,
      currentStreak: Number(c.st?.currentStreak) || 0,
      totalEarnings: Number(c.st?.totalEarnings) || 0,
    },
    matchHistory: mh,
    soundEnabled: c.sfx !== false,
    musicEnabled: c.mus !== false,
    profile: {
      displayName: typeof c.dn === "string" ? c.dn : "Player",
      bio: typeof c.bio === "string" ? c.bio : undefined,
      avatarId: typeof c.aid === "string" ? c.aid : undefined,
      avatarUrl: typeof c.au === "string" ? c.au : null,
      usePresetAvatar: Boolean(c.up),
    },
    megapotCredits: typeof c.mc === "number" ? c.mc : 0,
    ticketsMinted: typeof c.tm === "number" ? c.tm : 0,
    missionProgress: c.mp && typeof c.mp === "object" ? c.mp : {},
    missionsClaimed: Array.isArray(c.mcl) ? c.mcl.map(String) : [],
    economyVersion: typeof c.v === "number" ? c.v : ECONOMY_VERSION,
    friends: Array.isArray(c.fr)
      ? c.fr
          .filter((f) => f && typeof f.c === "string")
          .map((f) => ({ c: String(f.c).toUpperCase(), n: String(f.n || "Friend"), id: f.id }))
      : [],
  };
}

export const CLOUD_META_KEY = "river_progress_v3";
