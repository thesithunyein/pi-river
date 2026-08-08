import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = fs.readFileSync(path.join(root, ".env.local"), "utf8");
let pk = (env.match(/^PRIVATE_KEY=(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, "");
if (!pk) throw new Error("PRIVATE_KEY missing");
if (!pk.startsWith("0x")) pk = `0x${pk}`;

const account = privateKeyToAccount(pk);
const pub = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});
const wallet = createWalletClient({
  account,
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

const bal = await pub.getBalance({ address: account.address });
console.log("addr", account.address, "ethSep", formatEther(bal));

// Base Sepolia L1StandardBridge
const bridge = "0xfd0Bf71F60660E2f608ed56e1659C450eB113120";
const abi = [
  {
    name: "bridgeETH",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_minGasLimit", type: "uint32" },
      { name: "_extraData", type: "bytes" },
    ],
    outputs: [],
  },
];

const value = parseEther("0.00012");
const gasReserve = parseEther("0.00008");
if (bal < value + gasReserve) {
  console.log("skip bridge, too low");
  process.exit(0);
}

const hash = await wallet.writeContract({
  address: bridge,
  abi,
  functionName: "bridgeETH",
  args: [200000, "0x"],
  value,
});
console.log("bridge tx", hash);
const receipt = await pub.waitForTransactionReceipt({ hash });
console.log("status", receipt.status);
