const { createPublicClient, createWalletClient, http, formatEther } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { baseSepolia } = require("viem/chains");
const fs = require("fs");

const OLD = "0xE33388db0C0e029C0db90f459EDc33FA1366d2FF";
const abi = [
  {
    type: "function",
    name: "nextTableId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "cashOut",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "fold",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "tables",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "player0", type: "address" },
      { name: "player1", type: "address" },
      { name: "buyIn", type: "uint256" },
      { name: "stack0", type: "uint256" },
      { name: "stack1", type: "uint256" },
      { name: "pot", type: "uint256" },
      { name: "bet0", type: "uint256" },
      { name: "bet1", type: "uint256" },
      { name: "currentBet", type: "uint256" },
      { name: "button", type: "uint8" },
      { name: "toAct", type: "address" },
      { name: "stage", type: "uint8" },
      { name: "folded0", type: "bool" },
      { name: "folded1", type: "bool" },
      { name: "boardCount", type: "uint8" },
      { name: "handLive", type: "bool" },
    ],
  },
];

async function main() {
  const env = fs.readFileSync(".env.local", "utf8");
  let pk = env
    .split(/\r?\n/)
    .find((l) => l.startsWith("PRIVATE_KEY="))
    .slice("PRIVATE_KEY=".length)
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!pk.startsWith("0x")) pk = "0x" + pk;
  const account = privateKeyToAccount(pk);
  const pub = createPublicClient({
    chain: baseSepolia,
    transport: http("https://base-sepolia-rpc.publicnode.com"),
  });
  const wal = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://base-sepolia-rpc.publicnode.com"),
  });

  const n = Number(await pub.readContract({ address: OLD, abi, functionName: "nextTableId" }));
  console.log("bot", account.address);
  console.log("before", formatEther(await pub.getBalance({ address: account.address })));
  console.log("tables", n - 1);

  for (let i = 1; i < n; i++) {
    const t = await pub.readContract({ address: OLD, abi, functionName: "tables", args: [BigInt(i)] });
    const bot = account.address.toLowerCase();
    const seat = t[0].toLowerCase() === bot ? 0 : t[1].toLowerCase() === bot ? 1 : -1;
    if (seat < 0) continue;

    const stack = seat === 0 ? t[3] : t[4];
    console.log("table", i, {
      stage: t[11],
      handLive: t[15],
      stack: formatEther(stack),
      toAct: t[10],
    });

    if (t[15] && t[10].toLowerCase() === bot && t[11] >= 1 && t[11] <= 4) {
      try {
        const h = await wal.writeContract({
          address: OLD,
          abi,
          functionName: "fold",
          args: [BigInt(i)],
          account,
          chain: baseSepolia,
        });
        await pub.waitForTransactionReceipt({ hash: h });
        console.log("  folded", i);
      } catch (e) {
        console.log("  fold fail", i, e.shortMessage || e.message);
      }
    }

    const t2 = await pub.readContract({ address: OLD, abi, functionName: "tables", args: [BigInt(i)] });
    const stack2 = seat === 0 ? t2[3] : t2[4];
    // Settled=6 Waiting=0
    if (!t2[15] && (t2[11] === 0 || t2[11] === 6) && stack2 > 0n) {
      try {
        const h = await wal.writeContract({
          address: OLD,
          abi,
          functionName: "cashOut",
          args: [BigInt(i)],
          account,
          chain: baseSepolia,
        });
        await pub.waitForTransactionReceipt({ hash: h });
        console.log("  cashOut", i, formatEther(stack2));
      } catch (e) {
        console.log("  cashOut fail", i, e.shortMessage || e.message);
      }
    }
  }

  console.log("after", formatEther(await pub.getBalance({ address: account.address })));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
