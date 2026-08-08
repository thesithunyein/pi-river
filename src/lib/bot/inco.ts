import { Lightning } from "@inco/lightning-js/lite";
import type { Hex } from "viem";
import { RIVER_HOLDEM_ADDRESS, riverHoldemAbi } from "@/lib/contracts/riverHoldem";
import { getBotAccount, getBotPublicClient, getBotWalletClient } from "./wallet";

let lightningPromise: Promise<Lightning> | null = null;

function getLightning() {
  if (!lightningPromise) {
    lightningPromise = Lightning.baseSepoliaTestnet({
      hostChainRpcUrls: [
        process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
          process.env.BASE_SEPOLIA_RPC_URL ||
          "https://sepolia.base.org",
      ],
    });
  }
  return lightningPromise;
}

function plaintextToBigInt(plaintext: unknown): bigint {
  if (typeof plaintext === "bigint") return plaintext;
  if (typeof plaintext === "number") return BigInt(plaintext);
  if (typeof plaintext === "string") return BigInt(plaintext);
  if (plaintext && typeof plaintext === "object" && "value" in plaintext) {
    return plaintextToBigInt((plaintext as { value: unknown }).value);
  }
  throw new Error("Unsupported plaintext shape");
}

function sigsToHex(sigs: unknown): Hex[] {
  if (!Array.isArray(sigs)) return [];
  return sigs.map((s) => {
    if (typeof s === "string") return s as Hex;
    if (s instanceof Uint8Array) {
      return (`0x${Buffer.from(s).toString("hex")}`) as Hex;
    }
    return (`0x${Buffer.from(s as ArrayLike<number>).toString("hex")}`) as Hex;
  });
}

/** Bot peeks its own hole cards and submits showdown slots. */
export async function botSubmitShowdown(tableId: bigint) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const publicClient = getBotPublicClient();
  if (!account || !wallet) throw new Error("Bot wallet is not configured on the server.");
  if (!RIVER_HOLDEM_ADDRESS) throw new Error("Contract address missing.");

  const table = await publicClient.readContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "tables",
    args: [tableId],
  });
  const stage = Number((table as readonly unknown[])[11]);
  if (stage !== 5) {
    return { skipped: true, reason: "Not showdown." };
  }

  const player0 = (table as readonly string[])[0].toLowerCase();
  const isP0 = player0 === account.address.toLowerCase();
  const slots = isP0 ? [0, 1] : [2, 3];

  const handles = (await publicClient.readContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "getHoleHandles",
    args: [tableId],
    account: account.address,
  })) as readonly [Hex, Hex];

  const zap = await getLightning();
  // At showdown the contract already called reveal on hole cards.
  let peeked: Array<{ value: bigint; sigs: Hex[] }>;
  try {
    const revealed = await zap.attestedReveal([handles[0], handles[1]]);
    peeked = revealed.map((a) => ({
      value: plaintextToBigInt(a.plaintext as unknown),
      sigs: sigsToHex(a.covalidatorSignatures),
    }));
  } catch {
    const attestations = await zap.attestedDecrypt(wallet as never, [handles[0], handles[1]]);
    peeked = attestations.map((a) => ({
      value: plaintextToBigInt(a.plaintext as unknown),
      sigs: sigsToHex(a.covalidatorSignatures),
    }));
  }

  const hashes: Hex[] = [];
  for (let i = 0; i < 2; i++) {
    const hash = await wallet.writeContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "submitShowdownCard",
      args: [tableId, slots[i], peeked[i].value, peeked[i].sigs],
      account,
      chain: wallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    hashes.push(hash);
  }

  return { skipped: false, hashes, slots };
}

export async function botStartNextHand(tableId: bigint) {
  const account = getBotAccount();
  const wallet = getBotWalletClient();
  const publicClient = getBotPublicClient();
  if (!account || !wallet) throw new Error("Bot wallet is not configured on the server.");
  if (!RIVER_HOLDEM_ADDRESS) throw new Error("Contract address missing.");

  const table = await publicClient.readContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "tables",
    args: [tableId],
  });
  const stage = Number((table as readonly unknown[])[11]);
  const handLive = Boolean((table as readonly unknown[])[15]);
  if (handLive || (stage !== 6 && stage !== 0)) {
    return { skipped: true, reason: "Table not ready for next hand." };
  }

  const hash = await wallet.writeContract({
    address: RIVER_HOLDEM_ADDRESS,
    abi: riverHoldemAbi,
    functionName: "startNextHand",
    args: [tableId],
    value: 0n,
    account,
    chain: wallet.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return { skipped: false, hash };
}
