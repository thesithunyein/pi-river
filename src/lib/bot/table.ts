import { formatEther, type Address, type Hex } from "viem";
import { RIVER_HOLDEM_ADDRESS, riverHoldemAbi } from "@/lib/contracts/riverHoldem";
import { BOT_BUY_IN, botWriteContract, getBotAccount, getBotPublicClient, getBotWalletClient } from "./wallet";

export type LiveTable = {
  player0: Address;
  player1: Address;
  buyIn: bigint;
  stack0: bigint;
  stack1: bigint;
  pot: bigint;
  bet0: bigint;
  bet1: bigint;
  currentBet: bigint;
  button: number;
  toAct: Address;
  stage: number;
  folded0: boolean;
  folded1: boolean;
  boardCount: number;
  handLive: boolean;
};

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export type BotDifficulty = 1 | 2 | 3;

/** Map player XP → bot difficulty (1 easy → 3 hard). */
export function difficultyFromXp(xp: number): BotDifficulty {
  if (xp >= 4000) return 3;
  if (xp >= 1200) return 2;
  return 1;
}

export async function readTable(tableId: bigint): Promise<LiveTable> {
  const client = getBotPublicClient();
  const row = (await client.readContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "tables",
    args: [tableId],
  })) as readonly [
    Address,
    Address,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    number,
    Address,
    number,
    boolean,
    boolean,
    number,
    boolean,
  ];

  return {
    player0: row[0],
    player1: row[1],
    buyIn: row[2],
    stack0: row[3],
    stack1: row[4],
    pot: row[5],
    bet0: row[6],
    bet1: row[7],
    currentBet: row[8],
    button: row[9],
    toAct: row[10],
    stage: row[11],
    folded0: row[12],
    folded1: row[13],
    boardCount: row[14],
    handLive: row[15],
  };
}

async function waitFast(hash: Hex) {
  const publicClient = getBotPublicClient();
  return publicClient.waitForTransactionReceipt({
    hash,
    pollingInterval: 400,
    timeout: 60_000,
  });
}

export async function botJoin(tableId: bigint) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const publicClient = getBotPublicClient();
  if (!account || !wallet) throw new Error("Bot wallet is not configured on the server.");
  if (!RIVER_HOLDEM_ADDRESS) throw new Error("Contract address missing.");

  const table = await readTable(tableId);
  if (table.player0 === ZERO) throw new Error("Table does not exist.");
  if (table.player1 !== ZERO) {
    if (table.player1.toLowerCase() === account.address.toLowerCase()) {
      return { alreadyJoined: true, hash: null as `0x${string}` | null, address: account.address };
    }
    throw new Error("Table already has two players.");
  }
  if (table.player0.toLowerCase() === account.address.toLowerCase()) {
    throw new Error("Bot cannot join its own table.");
  }

  const hash = await botWriteContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "joinTable",
    args: [tableId],
    value: table.buyIn || BOT_BUY_IN,
    account,
    chain: wallet.chain,
  });
  await waitFast(hash);
  return { alreadyJoined: false, hash, address: account.address };
}

/**
 * If bot stack is too low between hands, cash out and rebuy so it can keep playing
 * (testnet “house bank” feel — as long as the house wallet is funded).
 */
export async function botRefillSeat(tableId: bigint) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  if (!account || !wallet || !RIVER_HOLDEM_ADDRESS) {
    return { refilled: false, reason: "Bot not configured." };
  }

  const table = await readTable(tableId);
  if (table.handLive) return { refilled: false, reason: "Hand live." };

  const bot = account.address.toLowerCase();
  const seat = table.player0.toLowerCase() === bot ? 0 : table.player1.toLowerCase() === bot ? 1 : -1;
  if (seat < 0) return { refilled: false, reason: "Bot not seated." };

  const stack = seat === 0 ? table.stack0 : table.stack1;
  const need = table.buyIn || BOT_BUY_IN;
  // Keep playing while stack covers a few blinds; refill when thin
  if (stack >= need / 2n) return { refilled: false, reason: "Stack ok." };

  if (table.stage !== 0 && table.stage !== 6) {
    return { refilled: false, reason: "Bad stage." };
  }

  const cashHash = (await botWriteContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "cashOut",
    args: [tableId],
    account,
    chain: wallet.chain,
  })) as Hex;
  await waitFast(cashHash);

  const join = await botJoin(tableId);
  return { refilled: true, hash: join.hash, address: account.address };
}

/** Aggressive bot — faster decisions on-chain; harder with higher difficulty. */
export async function botAct(tableId: bigint, difficulty: BotDifficulty = 1) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  if (!account || !wallet) throw new Error("Bot wallet is not configured on the server.");
  if (!RIVER_HOLDEM_ADDRESS) throw new Error("Contract address missing.");

  const table = await readTable(tableId);
  if (!table.handLive || table.stage < 1 || table.stage > 4) {
    return { skipped: true, reason: "Not a live betting street.", action: null as string | null };
  }
  if (table.toAct.toLowerCase() !== account.address.toLowerCase()) {
    return { skipped: true, reason: "Not bot turn.", action: null as string | null };
  }

  const seat = table.player0.toLowerCase() === account.address.toLowerCase() ? 0 : 1;
  const myBet = seat === 0 ? table.bet0 : table.bet1;
  const myStack = seat === 0 ? table.stack0 : table.stack1;
  const toCall = table.currentBet > myBet ? table.currentBet - myBet : 0n;
  const roll = Math.random();

  // Higher difficulty = fewer folds, more raises, bigger sizing
  // Keep folds rare so hands can reach flop/turn/river like real poker
  const foldChance = difficulty === 3 ? 0.03 : difficulty === 2 ? 0.05 : 0.07;
  const raiseChance = difficulty === 3 ? 0.38 : difficulty === 2 ? 0.24 : 0.14;
  const raiseMult = difficulty === 3 ? 3n : difficulty === 2 ? 2n : 2n;

  let action = "checkCall";
  let hash: `0x${string}`;

  const tinyBet = toCall > 0n && toCall <= table.pot / 4n;

  if (toCall > 0n && !tinyBet && roll < foldChance && myStack > toCall) {
    const potOddsPressure = toCall > table.pot / 2n;
    if (potOddsPressure && roll < foldChance) {
      action = "fold";
      hash = await botWriteContract({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "fold",
        args: [tableId],
        account,
        chain: wallet.chain,
      });
    } else {
      action = "call";
      hash = await botWriteContract({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "checkCall",
        args: [tableId],
        account,
        chain: wallet.chain,
      });
    }
  } else if (toCall === 0n && roll < raiseChance && myStack > 0n) {
    const bump = (table.buyIn / 10n || 10n ** 14n) * raiseMult;
    const raiseTo = table.currentBet + bump;
    const capped = raiseTo > myBet + myStack ? myBet + myStack : raiseTo;
    if (capped > table.currentBet) {
      action = "raise";
      hash = await botWriteContract({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "raiseTo",
        args: [tableId, capped],
        account,
        chain: wallet.chain,
      });
    } else {
      action = "check";
      hash = await botWriteContract({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "checkCall",
        args: [tableId],
        account,
        chain: wallet.chain,
      });
    }
  } else {
    action = toCall > 0n ? "call" : "check";
    hash = await botWriteContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "checkCall",
      args: [tableId],
      account,
      chain: wallet.chain,
    });
  }

  await waitFast(hash);
  const next = await readTable(tableId);
  return {
    skipped: false,
    reason: null,
    action,
    difficulty,
    hash,
    pot: formatEther(next.pot),
    stage: next.stage,
  };
}
