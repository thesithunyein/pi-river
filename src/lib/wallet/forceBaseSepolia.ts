import { baseSepolia } from "wagmi/chains";
import { baseSepoliaRpcUrls } from "@/lib/rpc";

const BASE_SEPOLIA_HEX = `0x${baseSepolia.id.toString(16)}`;

/** Add + switch to Base Sepolia for wallets that only know Base mainnet / Eth Sepolia. */
export async function forceBaseSepolia(
  switchChainAsync?: (args: { chainId: number }) => Promise<unknown>
) {
  try {
    if (switchChainAsync) {
      await switchChainAsync({ chainId: baseSepolia.id });
      return true;
    }
  } catch {
    // fall through to wallet_addEthereumChain
  }

  const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!ethereum?.request) return false;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA_HEX }],
    });
    return true;
  } catch (err) {
    const code = (err as { code?: number })?.code;
    // 4902 = chain not added yet
    if (code !== 4902 && code !== -32603) {
      // still try add — Coinbase sometimes uses different codes
    }
  }

  try {
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BASE_SEPOLIA_HEX,
          chainName: "Base Sepolia",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: baseSepoliaRpcUrls(),
          blockExplorerUrls: ["https://sepolia.basescan.org"],
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export { baseSepolia };
