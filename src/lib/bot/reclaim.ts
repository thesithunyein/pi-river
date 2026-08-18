import { formatEther, type Address, type Hex } from "viem";
import {
  LEGACY_RIVER_HOLDEM_ADDRESSES,
  RIVER_HOLDEM_ADDRESS,
  riverHoldemAbi,
} from "@/lib/contracts/riverHoldem";
import { BOT_BUY_IN, botWriteContract, getBotAccount, getBotPublicClient, getBotWalletClient } from "./wallet";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

function reclaimContracts(): `0x${string}`[] {
  const list: `0x${string}`[] = [...LEGACY_RIVER_HOLDEM_ADDRESSES];
  if (RIVER_HOLDEM_ADDRESS && !list.includes(RIVER_HOLDEM_ADDRESS)) {
    list.push(RIVER_HOLDEM_ADDRESS);
  }
  return list;
}

export type StuckHumanTable = {
  tableId: string;
  toAct: Address;
};

type TableRow = readonly [
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

/**
 * Pull River Bot stacks out of abandoned / settled tables so Quick Play
 * doesn't go offline every time chips are stuck on-chain.
 */
export async function botReclaimFunds(opts?: {
  maxTables?: number;
  /** Never cash the bot out of these tables (keep seat for next deal). */
  excludeTableIds?: Array<bigint | string>;
}) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const publicClient = getBotPublicClient();
  const exclude = new Set((opts?.excludeTableIds ?? []).map((id) => String(id)));
  if (!account || !wallet) {
    return {
      reclaimed: 0n,
      actions: [] as string[],
      stuckHuman: [] as StuckHumanTable[],
    };
  }

  const before = await publicClient.getBalance({ address: account.address });
  const actions: string[] = [];
  const stuckHuman: StuckHumanTable[] = [];
  const max = opts?.maxTables ?? 16;
  const bot = account.address.toLowerCase();

  for (const contract of reclaimContracts()) {
    try {
      const nextTableId = (await publicClient.readContract({
        address: contract,
        abi: riverHoldemAbi,
        functionName: "nextTableId",
      })) as bigint;
      const start = nextTableId > BigInt(max) ? nextTableId - BigInt(max) : 1n;

      for (let id = start; id < nextTableId; id++) {
        try {
          const row = (await publicClient.readContract({
            address: contract,
            abi: riverHoldemAbi,
            functionName: "tables",
            args: [id],
          })) as TableRow;

          const seat =
            row[0].toLowerCase() === bot ? 0 : row[1].toLowerCase() === bot ? 1 : -1;
          if (seat < 0) continue;

          // Keep bot seated on the table we're about to deal next
          if (exclude.has(id.toString()) && contract === RIVER_HOLDEM_ADDRESS) {
            actions.push(`keep#${id}`);
            continue;
          }

          const gas = await publicClient.getBalance({ address: account.address });
          if (gas < 8n * 10n ** 13n) {
            actions.push(`stop: low gas`);
            break;
          }

          let handLive = row[15];
          let stage = row[11];
          let toAct = row[10];
          let stack0 = row[3];
          let stack1 = row[4];
          let player0 = row[0];
          let player1 = row[1];

          if (
            handLive &&
            toAct !== ZERO &&
            toAct.toLowerCase() !== bot &&
            stage >= 1 &&
            stage <= 4
          ) {
            if (contract === RIVER_HOLDEM_ADDRESS) {
              stuckHuman.push({ tableId: id.toString(), toAct });
            }
            actions.push(`stuck#${id}:waiting ${toAct.slice(0, 8)}`);
            continue;
          }

          if (handLive && toAct.toLowerCase() === bot && stage >= 1 && stage <= 4) {
            const hash = await botWriteContract({
              address: contract,
              abi: riverHoldemAbi,
              functionName: "fold",
              args: [id],
              account,
              chain: wallet.chain,
            });
            await publicClient.waitForTransactionReceipt({ hash });
            actions.push(`fold#${id}@${contract.slice(0, 8)}`);
            const refreshed = (await publicClient.readContract({
              address: contract,
              abi: riverHoldemAbi,
              functionName: "tables",
              args: [id],
            })) as TableRow;
            handLive = refreshed[15];
            stage = refreshed[11];
            stack0 = refreshed[3];
            stack1 = refreshed[4];
            player0 = refreshed[0];
            player1 = refreshed[1];
          }

          if (!handLive && (stage === 0 || stage === 6)) {
            const stack = seat === 0 ? stack0 : stack1;
            const player = seat === 0 ? player0 : player1;
            if (stack > 0n && player.toLowerCase() === bot) {
              const hash = (await botWriteContract({
                address: contract,
                abi: riverHoldemAbi,
                functionName: "cashOut",
                args: [id],
                account,
                chain: wallet.chain,
              })) as Hex;
              await publicClient.waitForTransactionReceipt({ hash });
              actions.push(`cashOut#${id}:${formatEther(stack)}`);
            }
          }
        } catch (err) {
          actions.push(`skip#${id}:${err instanceof Error ? err.message.slice(0, 48) : "err"}`);
        }
      }
    } catch (err) {
      actions.push(
        `contract:${contract.slice(0, 10)}:${err instanceof Error ? err.message.slice(0, 40) : "err"}`
      );
    }
  }

  const after = await publicClient.getBalance({ address: account.address });
  return {
    reclaimed: after > before ? after - before : 0n,
    balance: after,
    actions,
    stuckHuman,
  };
}

export function botHasBuyIn(balance: bigint) {
  // buy-in + light gas — keep the house bot seating as long as possible
  return balance >= BOT_BUY_IN + 8n * 10n ** 12n;
}
