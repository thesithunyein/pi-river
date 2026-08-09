import { formatEther, type Hex } from "viem";
import { RIVER_HOLDEM_ADDRESS, riverHoldemAbi } from "@/lib/contracts/riverHoldem";
import { getBotAccount, getBotPublicClient, getBotWalletClient } from "./wallet";

/** Measured on Base Sepolia — Inco shuffledRange fee for a 52-card deck. */
export const SHUFFLE_FEE_FALLBACK = 104n * 10n ** 12n; // 0.000104 ETH
const FEE_BUFFER = 5n * 10n ** 12n; // 0.000005 dust / drift
const GAS_RESERVE = 12n * 10n ** 12n; // keep gas for join / deal txs

export async function readDeckFee(): Promise<bigint> {
  if (!RIVER_HOLDEM_ADDRESS) return SHUFFLE_FEE_FALLBACK;
  const client = getBotPublicClient();
  try {
    const { result } = await client.simulateContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "deckFee",
      args: [52],
    });
    return result as bigint;
  } catch {
    return SHUFFLE_FEE_FALLBACK;
  }
}

/** How much ETH the contract still needs before a hand can start. */
export async function shuffleFeeShortfall(incomingBuyIn = 0n): Promise<bigint> {
  if (!RIVER_HOLDEM_ADDRESS) return 0n;
  const client = getBotPublicClient();
  const [fee, bal] = await Promise.all([
    readDeckFee(),
    client.getBalance({ address: RIVER_HOLDEM_ADDRESS }),
  ]);
  const need = fee + FEE_BUFFER;
  const projected = bal + incomingBuyIn;
  return projected >= need ? 0n : need - projected;
}

/**
 * Top up RiverHoldem.fundFees so joinTable → _startHand does not revert
 * with "fund shuffle fee". Prefunds ~3 hands when short.
 */
export async function ensureShuffleFees(incomingBuyIn = 0n): Promise<{
  funded: boolean;
  shortfall: bigint;
  hash: Hex | null;
}> {
  const shortfall = await shuffleFeeShortfall(incomingBuyIn);
  if (shortfall === 0n) {
    // Keep a multi-hand buffer on the contract when house can afford it
    const fee = await readDeckFee();
    const client = getBotPublicClient();
    const bal = await client.getBalance({ address: RIVER_HOLDEM_ADDRESS });
    const want = fee * 3n + FEE_BUFFER;
    if (bal >= want) {
      return { funded: false, shortfall: 0n, hash: null };
    }
    const topUp = want - bal;
    const account = getBotAccount();
    const wallet = getBotWalletClient();
    if (!account || !wallet || !RIVER_HOLDEM_ADDRESS) {
      return { funded: false, shortfall: 0n, hash: null };
    }
    const botBal = await client.getBalance({ address: account.address });
    const available = botBal > GAS_RESERVE ? botBal - GAS_RESERVE : 0n;
    if (available < topUp) {
      return { funded: false, shortfall: 0n, hash: null };
    }
    const hash = (await wallet.writeContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "fundFees",
      value: topUp,
      account,
      chain: wallet.chain,
    })) as Hex;
    await client.waitForTransactionReceipt({
      hash,
      pollingInterval: 400,
      timeout: 60_000,
    });
    return { funded: true, shortfall: topUp, hash };
  }
  if (!RIVER_HOLDEM_ADDRESS) {
    throw new Error("Contract address missing.");
  }

  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const client = getBotPublicClient();
  if (!account || !wallet) {
    throw new Error("Bot wallet is not configured on the server.");
  }

  // When short, fund current shortfall + 2 extra hands
  const fee = await readDeckFee();
  const fundAmount = shortfall + fee * 2n;
  const botBal = await client.getBalance({ address: account.address });
  const available = botBal > GAS_RESERVE ? botBal - GAS_RESERVE : 0n;
  const value = fundAmount > available ? (available >= shortfall ? shortfall : 0n) : fundAmount;
  if (value === 0n) {
    throw new Error(
      `TABLE_FEE_SHORTFALL:${formatEther(shortfall)} (house has ${formatEther(botBal)})`
    );
  }

  const hash = (await wallet.writeContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "fundFees",
    value,
    account,
    chain: wallet.chain,
  })) as Hex;
  await client.waitForTransactionReceipt({
    hash,
    pollingInterval: 400,
    timeout: 60_000,
  });
  return { funded: true, shortfall: value, hash };
}

export function parseFeeShortfall(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.match(/TABLE_FEE_SHORTFALL:([0-9.]+)/);
  return m?.[1] ?? null;
}
