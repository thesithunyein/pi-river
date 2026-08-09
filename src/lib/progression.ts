/** Economy + progression — tuned so daily/missions can't empty the shop. */

import { formatEther } from "viem";

export const XP_PER_LEVEL = 500;
export const STARTING_CHIPS = 8_000;

/** Map on-chain stack delta (wei) → fun-chip ledger amount. */
export function funChipsFromStackDelta(deltaWei: bigint): number {
  const eth = Math.abs(Number(formatEther(deltaWei)));
  if (!Number.isFinite(eth) || eth === 0) return 180;
  // ~0.000015 ETH pot ≈ 600 fun chips (was 1,500 — too generous)
  const chips = Math.round(eth * 40_000_000);
  return Math.max(80, Math.min(4_500, chips));
}

/** Soft fold loss — still costs something so folding isn't free. */
export function foldLossChips(): number {
  return 120;
}

/** XP for a finished hand — wins pay more; losses still grant a little grind XP. */
export function xpFromHand(win: boolean, funChips: number): number {
  const potXp = Math.min(180, Math.floor(Math.max(0, funChips) / 28));
  if (win) return 55 + potXp;
  return 18 + Math.min(40, Math.floor(potXp / 3));
}

export function getPlayerLevel(xp: number, wins = 0) {
  const fromXp = Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
  const fromWins = Math.floor(Math.max(0, wins) / 5);
  return Math.max(1, 1 + fromXp + fromWins);
}

export function xpIntoLevel(xp: number) {
  const into = Math.max(0, xp) % XP_PER_LEVEL;
  return {
    into,
    span: XP_PER_LEVEL,
    pct: Math.min(100, Math.round((into / XP_PER_LEVEL) * 100)),
    toNext: XP_PER_LEVEL - into,
  };
}

export function levelTitle(level: number) {
  if (level >= 25) return "River Legend";
  if (level >= 18) return "High Roller";
  if (level >= 12) return "Table Shark";
  if (level >= 8) return "Grinder";
  if (level >= 5) return "Regular";
  if (level >= 3) return "Amateur";
  return "Rookie";
}

export function vipTierForLevel(level: number) {
  if (level >= 20) return "Diamond";
  if (level >= 12) return "Gold";
  if (level >= 6) return "Silver";
  return "Bronze";
}

/** Modest daily login — ~1 cheap cosmetic every few days, not the whole shop. */
export function dailyRewardForDay(day: number) {
  const d = Math.min(16, Math.max(1, day));
  return {
    chips: 350 + (d - 1) * 75,
    xp: 35 + (d - 1) * 8,
  };
}
