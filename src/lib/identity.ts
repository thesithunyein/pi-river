"use client";

export type LinkedIdentity = {
  googleUserId: string | null;
  email: string | null;
  walletAddress: string | null;
  /** User clicked disconnect — don't auto-reconnect until they link again */
  walletPaused: boolean;
  updatedAt: number;
};

const KEY = "pi_river_linked_identity_v1";
const LINKS_KEY = "pi_river_google_wallet_map_v1";

type GoogleWalletMap = Record<string, string>;

function readMap(): GoogleWalletMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LINKS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as GoogleWalletMap;
  } catch {
    return {};
  }
}

function writeMap(map: GoogleWalletMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LINKS_KEY, JSON.stringify(map));
}

export function readLinkedIdentity(): LinkedIdentity {
  if (typeof window === "undefined") {
    return { googleUserId: null, email: null, walletAddress: null, walletPaused: false, updatedAt: 0 };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return { googleUserId: null, email: null, walletAddress: null, walletPaused: false, updatedAt: 0 };
    }
    const parsed = JSON.parse(raw) as LinkedIdentity;
    return {
      googleUserId: parsed.googleUserId ?? null,
      email: parsed.email ?? null,
      walletAddress: parsed.walletAddress ? parsed.walletAddress.toLowerCase() : null,
      walletPaused: Boolean(parsed.walletPaused),
      updatedAt: parsed.updatedAt ?? 0,
    };
  } catch {
    return { googleUserId: null, email: null, walletAddress: null, walletPaused: false, updatedAt: 0 };
  }
}

export function writeLinkedIdentity(patch: Partial<LinkedIdentity>) {
  if (typeof window === "undefined") return;
  const current = readLinkedIdentity();
  const next: LinkedIdentity = {
    googleUserId: patch.googleUserId !== undefined ? patch.googleUserId : current.googleUserId,
    email: patch.email !== undefined ? patch.email : current.email,
    walletAddress:
      patch.walletAddress !== undefined
        ? patch.walletAddress
          ? patch.walletAddress.toLowerCase()
          : null
        : current.walletAddress,
    walletPaused: patch.walletPaused !== undefined ? patch.walletPaused : current.walletPaused,
    updatedAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(next));

  // Persist Google ↔ wallet mapping so re-login restores the same seat
  if (next.googleUserId && next.walletAddress) {
    const map = readMap();
    map[next.googleUserId] = next.walletAddress;
    writeMap(map);
  }

  return next;
}

/** Preferred wallet for this Google account (even if MetaMask is currently disconnected). */
export function walletForGoogleUser(googleUserId: string | null | undefined): string | null {
  if (!googleUserId || typeof window === "undefined") return null;
  const map = readMap();
  if (map[googleUserId]) return map[googleUserId].toLowerCase();
  const id = readLinkedIdentity();
  if (id.googleUserId === googleUserId && id.walletAddress) return id.walletAddress;
  return null;
}

export function pauseWalletLink() {
  writeLinkedIdentity({ walletPaused: true });
}

export function resumeWalletLink() {
  writeLinkedIdentity({ walletPaused: false });
}

export function clearLinkedIdentity() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  // Keep Google↔wallet map so the next Google sign-in can auto-reconnect.
}

/** Forget saved wallet for this Google account (Profile → Unlink). */
export function unlinkGoogleWallet(googleUserId: string | null | undefined) {
  if (!googleUserId || typeof window === "undefined") return;
  const map = readMap();
  delete map[googleUserId];
  writeMap(map);
  writeLinkedIdentity({ walletAddress: null, walletPaused: false });
}
