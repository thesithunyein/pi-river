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
  return next;
}

/** Which Google owns this wallet (if any). */
export function googleForWallet(walletAddress: string | null | undefined): string | null {
  if (!walletAddress) return null;
  const wallet = walletAddress.toLowerCase();
  const map = readMap();
  for (const [gid, w] of Object.entries(map)) {
    if (w?.toLowerCase() === wallet) return gid;
  }
  return null;
}

/**
 * Bind wallet ↔ Google for one account.
 * Same wallet cannot belong to two Googles; same Google can keep one wallet.
 */
export function claimWalletForGoogle(
  googleUserId: string,
  walletAddress: string
): { ok: true } | { ok: false; reason: string } {
  if (!googleUserId || !walletAddress) {
    return { ok: false, reason: "Missing Google or wallet." };
  }
  const wallet = walletAddress.toLowerCase();
  const map = readMap();
  const owner = googleForWallet(wallet);
  if (owner && owner !== googleUserId) {
    return {
      ok: false,
      reason: "This wallet is already linked to another Google account. Use that Google, or a different wallet.",
    };
  }

  const previous = map[googleUserId];
  if (previous && previous.toLowerCase() !== wallet) {
    // Replacing this Google's wallet — free the old binding if it pointed here
    // (forward map only stores one wallet per Google)
  }
  map[googleUserId] = wallet;
  writeMap(map);
  writeLinkedIdentity({
    googleUserId,
    walletAddress: wallet,
    walletPaused: false,
  });
  return { ok: true };
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
  // Keep Google↔wallet map so the next Google sign-in can restore the same wallet binding.
}

/** Forget saved wallet for this Google account (Profile → Unlink). */
export function unlinkGoogleWallet(googleUserId: string | null | undefined) {
  if (!googleUserId || typeof window === "undefined") return;
  const map = readMap();
  delete map[googleUserId];
  writeMap(map);
  writeLinkedIdentity({ walletAddress: null, walletPaused: false });
}
