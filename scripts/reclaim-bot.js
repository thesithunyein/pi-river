const { createPublicClient, createWalletClient, http, formatEther } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { baseSepolia } = require("viem/chains");
const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");
const line = env.split(/\r?\n/).find((l) => l.startsWith("PRIVATE_KEY="));
let pk = line.slice("PRIVATE_KEY=".length).trim().replace(/^["']|["']$/g, "");
if (!pk.startsWith("0x")) pk = "0x" + pk;
const account = privateKeyToAccount(pk);

const ADDR = process.env.NEXT_PUBLIC_RIVER_HOLDEM_ADDRESS || "0xE33388db0C0e029C0db90f459EDc33FA1366d2FF";
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
    name: "tables",
    stateMutability: "view",
    inputs: [{ name: "tableId", type: "uint256" }],
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
  {
    type: "function",
    name: "cashOut",
    stateMutability: "nonpayable",
    inputs: [{ name: "tableId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "fold",
    stateMutability: "nonpayable",
    inputs: [{ name: "tableId", type: "uint256" }],
    outputs: [],
  },
];

const ZERO = "0x0000000000000000000000000000000000000000";

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http("https://base-sepolia-rpc.publicnode.com"),
  });
  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://base-sepolia-rpc.publicnode.com"),
  });

  console.log("bot", account.address);
  console.log("before", formatEther(await publicClient.getBalance({ address: account.address })));

  const next = await publicClient.readContract({
    address: ADDR,
    abi,
    functionName: "nextTableId",
  });

  for (let id = 1n; id < next; id++) {
    const t = await publicClient.readContract({
      address: ADDR,
      abi,
      functionName: "tables",
      args: [id],
    });
    const p0 = t[0].toLowerCase();
    const p1 = t[1].toLowerCase();
    const bot = account.address.toLowerCase();
    const seat = p0 === bot ? 0 : p1 === bot ? 1 : -1;
    if (seat < 0) continue;

    const stack = seat === 0 ? t[3] : t[4];
    const handLive = t[15];
    const toAct = t[10].toLowerCase();
    console.log(
      `#${id} live=${handLive} toAct=${toAct.slice(0, 10)} stack=${formatEther(stack)} pot=${formatEther(t[5])}`
    );

    if (handLive && toAct === bot && t[11] >= 1 && t[11] <= 4) {
      try {
        const hash = await wallet.writeContract({
          address: ADDR,
          abi,
          functionName: "fold",
          args: [id],
          account,
          chain: baseSepolia,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("fold", id.toString());
      } catch (e) {
        console.log("fold fail", id.toString(), e.shortMessage || e.message);
      }
    }

    const t2 = await publicClient.readContract({
      address: ADDR,
      abi,
      functionName: "tables",
      args: [id],
    });
    if (!t2[15] && t2[0] !== ZERO) {
      const stack2 = seat === 0 ? t2[3] : t2[4];
      if (stack2 > 0n) {
        try {
          const hash = await wallet.writeContract({
            address: ADDR,
            abi,
            functionName: "cashOut",
            args: [id],
            account,
            chain: baseSepolia,
          });
          await publicClient.waitForTransactionReceipt({ hash });
          console.log("cashOut", id.toString(), formatEther(stack2));
        } catch (e) {
          console.log("cashOut fail", id.toString(), e.shortMessage || e.message);
        }
      }
    }
  }

  console.log("after", formatEther(await publicClient.getBalance({ address: account.address })));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
