"use client";

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  type Account,
  type Address,
  type Hex,
  type WalletClient,
  type WriteContractParameters,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  LEGACY_RIVER_HOLDEM_ADDRESSES,
  RIVER_HOLDEM_ADDRESS,
  riverHoldemAbi,
} from "@/lib/contracts/riverHoldem";

const STORAGE_KEY = "pi_river_play_wallets_v1";
/** Buy-in + share of Inco shuffle fee (~0.000104/hand) + gas */
const PLAY_NEED = 15n * 10n ** 12n + 80n * 10n ** 12n + 12n * 10n ** 12n; // ~0.000107

type PlayWalletStore = Record<string, Hex>;

function rpcUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
    "https://base-sepolia-rpc.publicnode.com"
  );
}

function readStore(): PlayWalletStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PlayWalletStore;
  } catch {
    return {};
  }
}

function writeStore(store: PlayWalletStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Play wallet bound to Google. Key stays in the browser. */
export function getOrCreatePlayPrivateKey(googleUserId: string): Hex {
  const id = googleUserId.trim();
  if (!id) throw new Error("Google sign-in required.");
  const store = readStore();
  if (store[id]) return store[id];
  const pk = generatePrivateKey();
  store[id] = pk;
  writeStore(store);
  return pk;
}

export function getPlayAccount(googleUserId: string): Account {
  return privateKeyToAccount(getOrCreatePlayPrivateKey(googleUserId));
}

export function getPlayAddress(googleUserId: string): `0x${string}` {
  return getPlayAccount(googleUserId).address;
}

export function getPlayPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl()),
  });
}

export function getPlayWalletClient(googleUserId: string): WalletClient {
  const account = getPlayAccount(googleUserId);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl()),
  });
}

export async function playWriteContract(
  googleUserId: string,
  params: Omit<WriteContractParameters, "account" | "chain">
) {
  const wallet = getPlayWalletClient(googleUserId);
  const account = getPlayAccount(googleUserId);
  const hash = await wallet.writeContract({
    ...params,
    account,
    chain: baseSepolia,
  } as WriteContractParameters);
  return hash;
}

function contractList(): `0x${string}`[] {
  const list: `0x${string}`[] = [...LEGACY_RIVER_HOLDEM_ADDRESSES];
  if (RIVER_HOLDEM_ADDRESS && !list.includes(RIVER_HOLDEM_ADDRESS)) {
    list.push(RIVER_HOLDEM_ADDRESS);
  }
  return list;
}

/**
 * Pull chips out of abandoned Waiting/Settled seats so Play doesn't stall
 * waiting on a house drip when funds are already on-table.
 */
export async function reclaimPlayWalletStacks(googleUserId: string) {
  const account = getPlayAccount(googleUserId);
  const wallet = getPlayWalletClient(googleUserId);
  const publicClient = getPlayPublicClient();
  const me = account.address.toLowerCase();
  let reclaimed = 0n;

  for (const address of contractList()) {
    try {
      const nextTableId = (await publicClient.readContract({
        address,
        abi: riverHoldemAbi,
        functionName: "nextTableId",
      })) as bigint;
      const start = nextTableId > 24n ? nextTableId - 24n : 1n;
      for (let id = start; id < nextTableId; id++) {
        const row = (await publicClient.readContract({
          address,
          abi: riverHoldemAbi,
          functionName: "tables",
          args: [id],
        })) as readonly [
          Address,
          Address,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          number,
          Address,
          number,
          boolean,
          boolean,
          number,
          boolean,
        ];
        const seat =
          row[0].toLowerCase() === me ? 0 : row[1].toLowerCase() === me ? 1 : -1;
        if (seat < 0) continue;
        const handLive = row[15];
        const stage = row[11];
        const stack = seat === 0 ? row[3] : row[4];
        if (handLive || stack === 0n) continue;
        if (stage !== 0 && stage !== 6) continue;
        try {
          const hash = await wallet.writeContract({
            address,
            abi: riverHoldemAbi,
            functionName: "cashOut",
            args: [id],
            account,
            chain: baseSepolia,
          });
          await publicClient.waitForTransactionReceipt({ hash });
          reclaimed += stack;
        } catch {
          // skip stuck seats
        }
      }
    } catch {
      // legacy / missing contract
    }
  }

  return reclaimed;
}

export async function ensurePlayWalletFunded(googleUserId: string) {
  const address = getPlayAddress(googleUserId);
  const publicClient = getPlayPublicClient();
  let balance = await publicClient.getBalance({ address });
  if (balance >= PLAY_NEED) {
    return { ok: true, funded: true, balanceEth: formatEther(balance), drippedEth: "0" };
  }

  // Recover chips left on abandoned tables before asking the house faucet
  try {
    await reclaimPlayWalletStacks(googleUserId);
  } catch {
    // continue to drip
  }
  balance = await publicClient.getBalance({ address });
  if (balance >= PLAY_NEED) {
    return {
      ok: true,
      funded: true,
      balanceEth: formatEther(balance),
      drippedEth: "0",
      reclaimed: true,
    };
  }

  const res = await fetch("/api/play/drip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, googleUserId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    funded?: boolean;
    balanceEth?: string;
    error?: string;
    drippedEth?: string;
  };

  balance = await publicClient.getBalance({ address });
  if (balance >= PLAY_NEED) {
    return {
      ok: true,
      funded: true,
      balanceEth: formatEther(balance),
      drippedEth: data.drippedEth || "0",
    };
  }

  if (!res.ok) {
    throw new Error(data.error || "Could not set up your seat. Try again.");
  }
  if (!data.funded) {
    throw new Error("Could not set up your seat. Try again in a moment.");
  }
  return data;
}
