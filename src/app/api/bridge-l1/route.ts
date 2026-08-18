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
// ETH to Base Sepolia via the canonical L1StandardBridge. Removed after use.
const L1_STANDARD_BRIDGE = "0xfd0Bf71F60660E2f608ed56e1659C450eB113120";
const L1_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const SECRET = "bridge-pi-river-9f3a7c1e";
const AMOUNT = parseEther("0.5");

const depositEthAbi = [
  {
    name: "depositETH",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_minGasLimit", type: "uint32" },
      { name: "_extraData", type: "bytes" },
    ],
  },
] as const;

export async function POST(req: Request) {
  try {
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
      to: L1_STANDARD_BRIDGE,
      value: AMOUNT,
      data: encodeFunctionData({
        abi: depositEthAbi,
        functionName: "depositETH",
        args: [200_000n, "0x"],
      }),
    });

    return NextResponse.json({
      ok: true,
      house: account.address,
      txHash: hash,
      bridgedEth: formatEther(AMOUNT),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
