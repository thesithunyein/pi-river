import { Lightning } from "@inco/lightning-js/lite";
import type { Hex } from "viem";
import { RIVER_HOLDEM_ADDRESS, riverHoldemAbi } from "@/lib/contracts/riverHoldem";
import { lightningRpcUrls } from "@/lib/rpc";
import { botWriteContract, getBotAccount, getBotPublicClient, getBotWalletClient } from "./wallet";

let lightningPromise: Promise<Lightning> | null = null;

function getLightning() {
  if (!lightningPromise) {
    lightningPromise = Lightning.baseSepoliaTestnet({
      hostChainRpcUrls: lightningRpcUrls(),
    });
  }
  return lightningPromise;
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

export type ShowdownProof = { value: bigint; sigs: Hex[] };

/**
 * At showdown the contract has already called e.reveal on every hole card, so
 * attestedReveal (no wallet signature) is the correct call. It is read-only,
 * so retrying aggressively on covalidator rate limits is safe. attestedDecrypt
 * requires a wallet signature and re-encryption and is NOT used here.
 */
async function revealHandles(
  zap: Lightning,
  handles: Hex[]
): Promise<Array<{ value: bigint; sigs: Hex[] }>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const revealed = await zap.attestedReveal(handles, {
        backoffConfig: { maxRetries: 4, baseDelayInMs: 700, backoffFactor: 1.6 },
      });
      return revealed.map((a) => ({
        value: plaintextToBigInt(a.plaintext as unknown),
        sigs: sigsToHex(a.covalidatorSignatures),
      }));
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/**
 * Full server-side showdown for vs-bot tables: reveal the bot cards, submit
 * all nine proofs with the reliable house wallet, and finalize the pot. The
 * browser only supplies its own hole proofs (already cached on screen) and the
 * public board proofs, so no player wallet writes happen at showdown.
 */
export async function botSubmitShowdown(
  tableId: bigint,
  playerHoleProofs: ReadonlyArray<ShowdownProof> = [],
  boardProofs: ReadonlyArray<ShowdownProof> = [],
) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const publicClient = getBotPublicClient();
  if (!account || !wallet) throw new Error("Bot wallet is not configured on the server.");
  if (!RIVER_HOLDEM_ADDRESS) throw new Error("Contract address missing.");

  const table = (await publicClient.readContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "tables",
    args: [tableId],
  })) as readonly unknown[];
  const stage = Number(table[11]);
  if (stage !== 5) {
    return { skipped: true, reason: "Not showdown." };
  }

  const botIsP0 = String(table[0]).toLowerCase() === account.address.toLowerCase();
  const botSlots = botIsP0 ? [0, 1] : [2, 3];
  const playerSlots = botIsP0 ? [2, 3] : [0, 1];
  const botStackBefore = (botIsP0 ? table[3] : table[4]) as bigint;
  const playerStackBefore = (botIsP0 ? table[4] : table[3]) as bigint;

  const handles = (await publicClient.readContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "getHoleHandles",
    args: [tableId],
    account: account.address,
  })) as readonly [Hex, Hex];

  const zap = await getLightning();
  const botProofs = await revealHandles(zap, [handles[0], handles[1]]);

  // Prefer the browser's board attestations; fall back to a server reveal.
  let board: ReadonlyArray<ShowdownProof> = boardProofs;
  if (board.length < 5) {
    const [outs, count] = (await publicClient.readContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "getBoardHandles",
      args: [tableId],
    })) as readonly [readonly Hex[], number];
    board = await revealHandles(zap, outs.slice(0, Number(count)) as Hex[]);
  }

  if (playerHoleProofs.length < 2 || board.length < 5) {
    throw new Error("Missing card proofs. Tap Reveal & settle again.");
  }

  const hashes: Hex[] = [];
  const submit = async (slot: number, proof: ShowdownProof) => {
    const hash = await botWriteContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "submitShowdownCard",
      args: [tableId, slot, proof.value, proof.sigs],
      account,
      chain: wallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash, pollingInterval: 300, timeout: 45_000 });
    hashes.push(hash);
  };

  for (let i = 0; i < 2; i++) await submit(botSlots[i], botProofs[i]);
  for (let i = 0; i < 2; i++) await submit(playerSlots[i], playerHoleProofs[i]);
  for (let i = 0; i < 5; i++) await submit(4 + i, board[i]);

  // Finalize on the server so the player never has to send the last tx.
  const finalizeHash = await botWriteContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "finalizeShowdown",
    args: [tableId],
    account,
    chain: wallet.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash: finalizeHash, pollingInterval: 300, timeout: 45_000 });

  const after = (await publicClient.readContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "tables",
    args: [tableId],
  })) as readonly unknown[];
  const botStackAfter = (botIsP0 ? after[3] : after[4]) as bigint;
  const playerStackAfter = (botIsP0 ? after[4] : after[3]) as bigint;
  let winner: "player" | "bot" | "chop" = "chop";
  if (playerStackAfter > playerStackBefore && botStackAfter <= botStackBefore) winner = "player";
  else if (botStackAfter > botStackBefore && playerStackAfter <= playerStackBefore) winner = "bot";

  return {
    skipped: false,
    hashes,
    finalizeHash,
    botValues: botProofs.map((p) => Number(p.value)),
    playerValues: playerHoleProofs.map((p) => Number(p.value)),
    winner,
    boardSubmitted: board.length,
  };
}

/**
 * Cosmetic peek: bot decrypts its own holes so the client can flip them face-up
 * after a fold or showdown (player cards stay private until real showdown).
 * Must run before the next hand reshuffles the deck.
 */
export async function botPeekHoles(tableId: bigint) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const publicClient = getBotPublicClient();
  if (!account || !wallet) throw new Error("Bot wallet is not configured on the server.");
  if (!RIVER_HOLDEM_ADDRESS) throw new Error("Contract address missing.");

  const table = await publicClient.readContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "tables",
    args: [tableId],
  });
  const player0 = String((table as readonly unknown[])[0]).toLowerCase();
  const player1 = String((table as readonly unknown[])[1]).toLowerCase();
  const bot = account.address.toLowerCase();
  if (bot !== player0 && bot !== player1) {
    throw new Error("Bot is not seated at this table.");
  }

  const handles = (await publicClient.readContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "getHoleHandles",
    args: [tableId],
    account: account.address,
  })) as readonly [Hex, Hex];

  if (handles[0] === (`0x${"0".repeat(64)}` as Hex)) {
    throw new Error("No hole cards left to show (hand already redealt).");
  }

  const zap = await getLightning();
  let values: number[];
  try {
    const revealed = await zap.attestedReveal([handles[0], handles[1]]);
    values = revealed.map((a) => Number(plaintextToBigInt(a.plaintext as unknown)));
  } catch {
    const attestations = await zap.attestedDecrypt(wallet as never, [handles[0], handles[1]]);
    values = attestations.map((a) => Number(plaintextToBigInt(a.plaintext as unknown)));
  }

  return { values };
}

export async function botStartNextHand(tableId: bigint) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const publicClient = getBotPublicClient();
  if (!account || !wallet) throw new Error("Bot wallet is not configured on the server.");
  if (!RIVER_HOLDEM_ADDRESS) throw new Error("Contract address missing.");

  const table = await publicClient.readContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "tables",
    args: [tableId],
  });
  const stage = Number((table as readonly unknown[])[11]);
  const handLive = Boolean((table as readonly unknown[])[15]);
  const player0 = String((table as readonly unknown[])[0]).toLowerCase();
  const player1 = String((table as readonly unknown[])[1]).toLowerCase();
  const stack0 = (table as readonly unknown[])[3] as bigint;
  const stack1 = (table as readonly unknown[])[4] as bigint;
  const bot = account.address.toLowerCase();

  if (handLive || (stage !== 6 && stage !== 0)) {
    return { skipped: true, reason: "Table not ready for next hand." };
  }
  if (bot !== player0 && bot !== player1) {
    throw new Error("seat");
  }
  // ~4 BB minimum — matches client auto-deal gate
  const minStack = 10n * 10n ** 12n;
  if (stack0 < minStack || stack1 < minStack) {
    throw new Error("stacks");
  }

  try {
    const hash = await botWriteContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "startNextHand",
      args: [tableId],
      value: 0n,
      account,
      chain: wallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return { skipped: false, hash };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    if (/fund shuffle fee/i.test(raw)) throw new Error("fund shuffle fee");
    if (/\bseat\b/i.test(raw)) throw new Error("seat");
    if (/\bbusy\b/i.test(raw)) throw new Error("busy");
    if (/\bstacks\b/i.test(raw)) throw new Error("stacks");
    throw err;
  }
}
