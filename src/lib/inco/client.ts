"use client";

import { Lightning } from "@inco/lightning-js/lite";
import type { Hex } from "viem";
import type { WalletClient } from "viem";
import { baseSepoliaRpcUrls } from "@/lib/rpc";

let lightningPromise: Promise<Lightning> | null = null;

export async function getLightning() {
  if (!lightningPromise) {
    lightningPromise = Lightning.baseSepoliaTestnet({
      hostChainRpcUrls: baseSepoliaRpcUrls(),
    });
  }
  return lightningPromise;
}

export type DecodedCard = {
  id: number;
  rank: string;
  suit: "s" | "h" | "d" | "c";
  label: string;
  isRed: boolean;
};

export type PeekedCard = {
  value: bigint;
  sigs: Hex[];
  handle: Hex;
};

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
const SUITS = ["s", "h", "d", "c"] as const;
const SUIT_GLYPH: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };

/** Inco deck values are 1..52 */
export function decodeCard(value: number | bigint): DecodedCard {
  const id = Number(value);
  if (id < 1 || id > 52) {
    throw new Error(`Invalid card value: ${id}`);
  }
  const rank = RANKS[(id - 1) % 13];
  const suit = SUITS[Math.floor((id - 1) / 13)];
  return {
    id,
    rank,
    suit,
    label: `${rank}${SUIT_GLYPH[suit]}`,
    isRed: suit === "h" || suit === "d",
  };
}

function plaintextToBigInt(plaintext: unknown): bigint {
  if (typeof plaintext === "bigint") return plaintext;
  if (typeof plaintext === "number") return BigInt(plaintext);
  if (typeof plaintext === "string") return BigInt(plaintext);
  if (plaintext && typeof plaintext === "object" && "value" in plaintext) {
    return plaintextToBigInt((plaintext as { value: unknown }).value);
  }
  throw new Error("Unsupported plaintext shape");
}

function sigsToHex(sigs: unknown): Hex[] {
  if (!Array.isArray(sigs)) return [];
  return sigs.map((s) => {
    if (typeof s === "string") return s as Hex;
    if (s instanceof Uint8Array) {
      return (`0x${Buffer.from(s).toString("hex")}`) as Hex;
    }
    return (`0x${Buffer.from(s as ArrayLike<number>).toString("hex")}`) as Hex;
  });
}

function handlesKey(handles: Hex[]) {
  return handles.map((h) => h.toLowerCase()).join("|");
}

/** Cache peeks so MetaMask AttestedDecrypt is not requested every poll. */
const peekCache = new Map<string, PeekedCard[]>();
const peekInflight = new Map<string, Promise<PeekedCard[]>>();

export function clearPeekCache() {
  peekCache.clear();
  peekInflight.clear();
}

export function getCachedPeeks(handles: Hex[]): PeekedCard[] | null {
  return peekCache.get(handlesKey(handles)) ?? null;
}

/**
 * Decrypt hole cards once per handle set.
 * Pass force=true only when you intentionally need a fresh attestation (rare).
 */
export async function peekMyCards(
  walletClient: WalletClient,
  handles: Hex[],
  opts?: { force?: boolean }
): Promise<PeekedCard[]> {
  const key = handlesKey(handles);
  if (!opts?.force) {
    const cached = peekCache.get(key);
    if (cached) return cached;
    const inflight = peekInflight.get(key);
    if (inflight) return inflight;
  }

  const job = (async () => {
    const zap = await getLightning();
    // One wallet signature covers all handles in this call
    const attestations = await zap.attestedDecrypt(walletClient as never, handles);
    const peeked = attestations.map((a) => ({
      handle: a.handle as Hex,
      value: plaintextToBigInt(a.plaintext as unknown),
      sigs: sigsToHex(a.covalidatorSignatures),
    }));
    peekCache.set(key, peeked);
    return peeked;
  })();

  peekInflight.set(key, job);
  try {
    return await job;
  } finally {
    peekInflight.delete(key);
  }
}

const boardCache = new Map<string, PeekedCard[]>();

export async function readRevealed(handles: Hex[]): Promise<PeekedCard[]> {
  const key = handlesKey(handles);
  const cached = boardCache.get(key);
  if (cached) return cached;

  const zap = await getLightning();
  const attestations = await zap.attestedReveal(handles);
  const revealed = attestations.map((a) => ({
    handle: a.handle as Hex,
    value: plaintextToBigInt(a.plaintext as unknown),
    sigs: sigsToHex(a.covalidatorSignatures),
  }));
  boardCache.set(key, revealed);
  return revealed;
}

export function clearBoardCache() {
  boardCache.clear();
}
