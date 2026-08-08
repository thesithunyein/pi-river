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

// Base Sepolia OptimismPortal on Ethereum Sepolia
const PORTAL = "0x49f53e41452C74589E85cA1677426Ba426459e85";
const portalAbi = [
  {
    type: "function",
    name: "depositTransaction",
    stateMutability: "payable",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
      { name: "_gasLimit", type: "uint64" },
      { name: "_isCreation", type: "bool" },
      { name: "_data", type: "bytes" },
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
  console.log("l1", formatEther(beforeL1), "l2", formatEther(beforeL2));

  const gasReserve = parseEther("0.00008");
  let mint = beforeL1 > gasReserve ? beforeL1 - gasReserve : 0n;
  const cap = parseEther("0.00015");
  if (mint > cap) mint = cap;
  if (mint < parseEther("0.00005")) {
    console.log("too little to bridge");
    return;
  }

  // msg.value must cover mint + L1 data fee; for plain ETH deposit, value == mint
  console.log("depositing", formatEther(mint));
  const hash = await wallet.writeContract({
    address: PORTAL,
    abi: portalAbi,
    functionName: "depositTransaction",
    args: [account.address, mint, 100000n, false, "0x"],
    value: mint,
    account,
    chain: sepolia,
  });
  console.log("tx", hash);
  const receipt = await l1.waitForTransactionReceipt({ hash });
  console.log("status", receipt.status);

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const bal = await l2.getBalance({ address: account.address });
    console.log(`l2 ${i + 1}`, formatEther(bal));
    if (bal >= beforeL2 + mint / 2n) {
      console.log("arrived");
      return;
    }
  }
  console.log("timeout waiting for L2 credit");
}

main().catch((e) => {
  console.error(e.shortMessage || e.message || e);
  process.exit(1);
});
