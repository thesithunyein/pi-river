import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  http,
  parseEther,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

export const runtime = "nodejs";
export const maxDuration = 60;

// TEMPORARY: one-shot helper to bridge the house wallet's L1 (Ethereum Sepolia)
// ETH to Base Sepolia. Removed after use.
const PORTAL = "0x49f53e41452C74589E85cA1677426Ba426459e85";
const L1_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const SECRET = "bridge-pi-river-9f3a7c1e";
const AMOUNT = parseEther("0.5");

const depositAbi = [
  {
    name: "depositTransaction",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_mint", type: "uint256" },
      { name: "_value", type: "uint256" },
      { name: "_gasLimit", type: "uint64" },
      { name: "_isCreation", type: "bool" },
      { name: "_data", type: "bytes" },
    ],
  },
] as const;

export async function POST(req: Request) {
  const secret = req.headers.get("x-bridge-secret");
  if (secret !== SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pk = process.env.PRIVATE_KEY || process.env.BOT_PRIVATE_KEY;
  if (!pk) {
    return NextResponse.json({ error: "no house key" }, { status: 503 });
  }
  const account = privateKeyToAccount(
    pk.startsWith("0x") ? (pk as Hex) : (`0x${pk}` as Hex)
  );

  const l1 = createPublicClient({ chain: sepolia, transport: http(L1_RPC) });
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(L1_RPC) });

  const bal = await l1.getBalance({ address: account.address });
  if (bal < AMOUNT + parseEther("0.002")) {
    return NextResponse.json(
      { error: `L1 balance too low: ${formatEther(bal)}`, house: account.address },
      { status: 400 }
    );
  }

  const hash = await wallet.sendTransaction({
    to: PORTAL,
    value: AMOUNT,
    data: encodeFunctionData({
      abi: depositAbi,
      functionName: "depositTransaction",
      args: [account.address, AMOUNT, 0n, 200_000n, false, "0x"],
    }),
  });

  const receipt = await l1.waitForTransactionReceipt({ hash });
  return NextResponse.json({
    ok: true,
    house: account.address,
    txHash: hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status,
    bridgedEth: formatEther(AMOUNT),
  });
}
