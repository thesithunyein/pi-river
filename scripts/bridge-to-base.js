const {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { sepolia, baseSepolia } = require("viem/chains");
const fs = require("fs");

const L1_STANDARD_BRIDGE = "0xfd0Bf71F60660E2f608ed56e1659C450eB113120";
const bridgeAbi = [
  {
    type: "function",
    name: "bridgeETH",
    stateMutability: "payable",
    inputs: [
      { name: "_minGasLimit", type: "uint32" },
      { name: "_extraData", type: "bytes" },
    ],
    outputs: [],
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

  const l1 = createPublicClient({
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  });
  const l2 = createPublicClient({
    chain: baseSepolia,
    transport: http("https://base-sepolia-rpc.publicnode.com"),
  });
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  });

  const beforeL1 = await l1.getBalance({ address: account.address });
  const beforeL2 = await l2.getBalance({ address: account.address });
  console.log("addr", account.address);
  console.log("l1 before", formatEther(beforeL1));
  console.log("l2 before", formatEther(beforeL2));

  // Leave a little L1 gas; bridge the rest (cap ~0.001)
  const gasReserve = parseEther("0.00015");
  let amount = beforeL1 > gasReserve ? beforeL1 - gasReserve : 0n;
  const cap = parseEther("0.001");
  if (amount > cap) amount = cap;
  if (amount < parseEther("0.0003")) {
    console.log("not enough eth sepolia to bridge");
    return;
  }

  console.log("bridging", formatEther(amount));
  const hash = await wallet.writeContract({
    address: L1_STANDARD_BRIDGE,
    abi: bridgeAbi,
    functionName: "bridgeETH",
    args: [200000, "0x"],
    value: amount,
    account,
    chain: sepolia,
  });
  console.log("l1 tx", hash);
  await l1.waitForTransactionReceipt({ hash });
  console.log("l1 confirmed — wait ~1-3 min for Base Sepolia credit");

  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const bal = await l2.getBalance({ address: account.address });
    console.log(`l2 check ${i + 1}`, formatEther(bal));
    if (bal > beforeL2 + amount / 2n) {
      console.log("bridge arrived");
      return;
    }
  }
  console.log("still waiting — check later; deposit usually lands within a few minutes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
