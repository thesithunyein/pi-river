"use client";

export type LinkedIdentity = {
  googleUserId: string | null;
  email: string | null;
  walletAddress: string | null;
  updatedAt: number;
};

const KEY = "pi_river_linked_identity_v1";

export function readLinkedIdentity(): LinkedIdentity {
  if (typeof window === "undefined") {
    return { googleUserId: null, email: null, walletAddress: null, updatedAt: 0 };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { googleUserId: null, email: null, walletAddress: null, updatedAt: 0 };
    const parsed = JSON.parse(raw) as LinkedIdentity;
    return {
      googleUserId: parsed.googleUserId ?? null,
      email: parsed.email ?? null,
      walletAddress: parsed.walletAddress ? parsed.walletAddress.toLowerCase() : null,
      updatedAt: parsed.updatedAt ?? 0,
    };
  } catch {
    return { googleUserId: null, email: null, walletAddress: null, updatedAt: 0 };
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
    updatedAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearLinkedIdentity() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
