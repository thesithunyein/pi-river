import { formatUnits, type Address, type Hex } from "viem";
import { botWriteContract, getBotAccount, getBotPublicClient, getBotWalletClient } from "@/lib/bot/wallet";
import {
  MEGAPOT_SEPOLIA,
  MEGAPOT_SOURCE,
  PRECISE_UNIT,
  megapotAbi,
} from "./addresses";

export async function readMegapotPool() {
  const client = getBotPublicClient();
  const drawingId = (await client.readContract({
    address: MEGAPOT_SEPOLIA.jackpot,
    abi: megapotAbi,
    functionName: "currentDrawingId",
  })) as bigint;

  const raw = (await client.readContract({
    address: MEGAPOT_SEPOLIA.jackpot,
    abi: megapotAbi,
    functionName: "getDrawingState",
    args: [drawingId],
  })) as unknown;

  const asTuple = Array.isArray(raw)
    ? (raw as unknown as readonly [
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        number,
        number,
        Address,
        boolean,
      ])
    : null;
  const asObj = !asTuple
    ? (raw as {
        prizePool: bigint;
        drawingTime: bigint;
        globalTicketsBought: bigint;
        jackpotLock: boolean;
      })
    : null;

  const prizePool = asTuple ? asTuple[0] : asObj!.prizePool;
  const drawingTime = asTuple ? asTuple[7] : asObj!.drawingTime;
  const globalTicketsBought = asTuple ? asTuple[5] : asObj!.globalTicketsBought;
  const jackpotLock = asTuple ? asTuple[12] : asObj!.jackpotLock;

  const ticketPrice = (await client.readContract({
    address: MEGAPOT_SEPOLIA.jackpot,
    abi: megapotAbi,
    functionName: "ticketPrice",
  })) as bigint;

  return {
    drawingId: drawingId.toString(),
    prizePoolUsdc: formatUnits(prizePool, 6),
    ticketPriceUsdc: formatUnits(ticketPrice, 6),
    drawingTime: Number(drawingTime),
    ticketsBought: Number(globalTicketsBought),
    locked: Boolean(jackpotLock),
  };
}

/** House buys 1 random Megapot ticket for recipient play wallet. */
export async function mintMegapotTicket(recipient: Address) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const publicClient = getBotPublicClient();
  if (!account || !wallet) {
    throw new Error("House wallet not configured for Megapot mint.");
  }

  const ticketPrice = (await publicClient.readContract({
    address: MEGAPOT_SEPOLIA.jackpot,
    abi: megapotAbi,
    functionName: "ticketPrice",
  })) as bigint;

  const usdcBal = (await publicClient.readContract({
    address: MEGAPOT_SEPOLIA.usdc,
    abi: megapotAbi,
    functionName: "balanceOf",
    args: [account.address],
  })) as bigint;

  if (usdcBal < ticketPrice) {
    throw new Error("JACKPOT_USDC_REFILL");
  }

  const allowance = (await publicClient.readContract({
    address: MEGAPOT_SEPOLIA.usdc,
    abi: megapotAbi,
    functionName: "allowance",
    args: [account.address, MEGAPOT_SEPOLIA.randomBuyer],
  })) as bigint;

  if (allowance < ticketPrice) {
    const approveHash = (await botWriteContract({
      address: MEGAPOT_SEPOLIA.usdc,
      abi: megapotAbi,
      functionName: "approve",
      args: [MEGAPOT_SEPOLIA.randomBuyer, ticketPrice * 20n],
      account,
      chain: wallet.chain,
    })) as Hex;
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const referrer = account.address;
  const buyHash = (await botWriteContract({
    address: MEGAPOT_SEPOLIA.randomBuyer,
    abi: megapotAbi,
    functionName: "buyTickets",
    args: [1n, recipient, [referrer], [PRECISE_UNIT], MEGAPOT_SOURCE],
    account,
    chain: wallet.chain,
  })) as Hex;
  const receipt = await publicClient.waitForTransactionReceipt({ hash: buyHash });

  return {
    txHash: buyHash,
    status: receipt.status,
    recipient,
    ticketPriceUsdc: formatUnits(ticketPrice, 6),
  };
}
