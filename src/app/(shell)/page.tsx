"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther, decodeEventLog } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { BoltIcon, CardsIcon, GiftIcon, LockIncoIcon, TrophyIcon } from "@/components/icons";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RIVER_HOLDEM_ADDRESS, riverHoldemAbi } from "@/lib/contracts/riverHoldem";

const BUY_IN = parseEther("0.001");

export default function LobbyPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [joinId, setJoinId] = useState("");
  const [status, setStatus] = useState("");
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync, isPending } = useWriteContract();
  useWaitForTransactionReceipt({ hash: pendingHash });

  const contractReady = Boolean(RIVER_HOLDEM_ADDRESS);

  async function createTable() {
    if (!contractReady) {
      setStatus("Contract address missing. Deploy RiverHoldem to Base Sepolia first.");
      return;
    }
    if (!isConnected) {
      setStatus("Connect a Base Sepolia wallet first.");
      return;
    }
    try {
      setStatus("Creating table on Base Sepolia...");
      const hash = await writeContractAsync({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "createTable",
        value: BUY_IN,
      });
      setPendingHash(hash);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      let tableId: bigint | undefined;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: riverHoldemAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "TableCreated") {
            tableId = (decoded.args as { tableId: bigint }).tableId;
            break;
          }
        } catch {
          // skip unrelated logs
        }
      }
      if (tableId === undefined) {
        setStatus("Table created but id not found in logs. Check explorer.");
        return;
      }
      setStatus(`Table #${tableId.toString()} created. Waiting for opponent.`);
      router.push(`/table/${tableId.toString()}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function joinTable() {
    if (!contractReady) {
      setStatus("Contract address missing. Deploy RiverHoldem to Base Sepolia first.");
      return;
    }
    if (!isConnected) {
      setStatus("Connect a Base Sepolia wallet first.");
      return;
    }
    const id = BigInt(joinId || "0");
    if (id <= 0n) {
      setStatus("Enter a valid table id.");
      return;
    }
    try {
      setStatus(`Joining table #${id.toString()}...`);
      const hash = await writeContractAsync({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "joinTable",
        args: [id],
        value: BUY_IN,
      });
      setPendingHash(hash);
      await publicClient!.waitForTransactionReceipt({ hash });
      router.push(`/table/${id.toString()}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Join failed");
    }
  }

  return (
    <div className="space-y-6">
      <GlassCard accent="purple" className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-river-gold/10 to-transparent" aria-hidden />
        <div className="relative space-y-5">
          <span className="inline-flex min-h-10 items-center rounded-full border border-river-gold/20 bg-river-gold/10 px-4 text-[11px] font-extrabold uppercase tracking-[0.22em] text-river-gold">
            Inco Summer Game Jam
          </span>
          <h1 className="max-w-xl text-4xl font-black leading-tight text-river-white sm:text-5xl">
            Heads-up Hold&apos;em where only you can see your cards.
          </h1>
          <p className="max-w-prose text-sm leading-7 text-river-grey sm:text-base">
            mi River deals hole cards with Inco Lightning on Base Sepolia. The board is public.
            Showdown settles with covalidator attestations. Buy-in is 0.001 ETH on testnet.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <GradientButton
              icon={<BoltIcon className="h-5 w-5" />}
              onClick={createTable}
              disabled={isPending}
            >
              {isPending ? "Confirm in wallet" : "Create table (0.001 ETH)"}
            </GradientButton>
            <div className="flex flex-1 gap-2">
              <input
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Table id"
                className="min-h-12 flex-1 rounded-2xl border border-river-line/25 bg-river-bg1/80 px-4 text-sm font-bold text-river-white outline-none focus:border-river-gold/40"
              />
              <GradientButton
                variant="secondary"
                icon={<CardsIcon className="h-5 w-5" />}
                onClick={joinTable}
                disabled={isPending}
              >
                Join
              </GradientButton>
            </div>
          </div>
          {status ? (
            <p className="text-sm font-semibold text-river-cyan">{status}</p>
          ) : null}
          {!contractReady ? (
            <p className="text-xs text-river-orange">
              Set NEXT_PUBLIC_RIVER_HOLDEM_ADDRESS after deploying contracts/src/RiverHoldem.sol.
            </p>
          ) : null}
        </div>
      </GlassCard>

      <SectionHeader
        eyebrow="Why mi River"
        title="Built for real play, not a mock demo"
        description="Hidden hole cards, public board, attested settlement. Cosmetics and daily rewards stay off the critical fairness path."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Privacy", value: "Inco hole cards", icon: LockIncoIcon },
          { label: "Stakes", value: "0.001 ETH buy-in", icon: TrophyIcon },
          { label: "Rewards", value: "Daily cosmetics", icon: GiftIcon },
          { label: "Network", value: "Base Sepolia", icon: BoltIcon },
        ].map(({ label, value, icon: Icon }) => (
          <GlassCard key={label} className="p-4">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-river-violet/12 text-river-violet">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-river-grey">{label}</p>
            <p className="mt-1 text-sm font-bold text-river-white">{value}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
