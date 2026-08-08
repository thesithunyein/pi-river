const { createPublicClient, createWalletClient, http, formatEther, parseEther } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { baseSepolia, sepolia } = require("viem/chains");
const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");
const line = env.split(/\r?\n/).find((l) => l.startsWith("PRIVATE_KEY="));
let pk = line.slice("PRIVATE_KEY=".length).trim().replace(/^["']|["']$/g, "");
if (!pk.startsWith("0x")) pk = "0x" + pk;
const account = privateKeyToAccount(pk);

async function main() {
  const base = createPublicClient({
    chain: baseSepolia,
    transport: http("https://base-sepolia-rpc.publicnode.com"),
  });
  const eth = createPublicClient({
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  });
  console.log("addr", account.address);
  console.log("base", formatEther(await base.getBalance({ address: account.address })));
  console.log("ethSep", formatEther(await eth.getBalance({ address: account.address })));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
