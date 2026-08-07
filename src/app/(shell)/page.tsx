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
import {
  BoltIcon,
  CardsIcon,
  LockIncoIcon,
  TableIcon,
  TrophyIcon,
} from "@/components/icons";
import { GradientButton } from "@/components/ui/GradientButton";
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
    if (!isConnected) {
      setStatus("Connect your wallet to sit down.");
      return;
    }
    if (!contractReady) {
      setStatus("Tables open soon. Contract deploy is finishing.");
      return;
    }
    try {
      setStatus("Opening your table…");
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
          // skip
        }
      }
      if (tableId === undefined) {
        setStatus("Table opened. Check your wallet activity for the id.");
        return;
      }
      router.push(`/table/${tableId.toString()}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not create table");
    }
  }

  async function joinTable() {
    if (!isConnected) {
      setStatus("Connect your wallet to join.");
      return;
    }
    if (!contractReady) {
      setStatus("Tables open soon. Contract deploy is finishing.");
      return;
    }
    const id = BigInt(joinId || "0");
    if (id <= 0n) {
      setStatus("Enter a table number from your opponent.");
      return;
    }
    try {
      setStatus(`Joining table #${id.toString()}…`);
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
      setStatus(err instanceof Error ? err.message : "Could not join table");
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Hero felt */}
      <section className="relative overflow-hidden rounded-[32px] border border-[#2a6b4a]/50 bg-[radial-gradient(ellipse_at_center,#1b6b45_0%,#0d3a28_55%,#071a14_100%)] px-5 pb-6 pt-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0 1px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 0 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[#F5C518] shadow-[0_12px_40px_rgba(245,197,24,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mi-mark.svg" alt="pi" className="h-16 w-16" />
          </div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#9dceb4]">
            pi River · Heads-up · Private hole cards
          </p>
          <h1 className="font-display text-4xl font-black leading-[1.05] text-white sm:text-5xl">
            Sit down.
            <br />
            <span className="text-[#F5C518]">Keep your hand.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#b7d7c6]">
            Two players. Encrypted hole cards on Inco Lightning. Public board.
            Winner takes the pot on Base Sepolia.
          </p>

          <div className="mt-6 flex w-full flex-col gap-3">
            <GradientButton
              className="w-full min-h-14 text-base"
              icon={<BoltIcon className="h-5 w-5" />}
              onClick={createTable}
              disabled={isPending}
            >
              {isPending ? "Confirm in wallet…" : "Create table · 0.001 ETH"}
            </GradientButton>

            <div className="flex gap-2">
              <input
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Table #"
                inputMode="numeric"
                className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 text-center text-base font-bold text-white outline-none placeholder:text-white/35 focus:border-[#F5C518]/50"
              />
              <GradientButton
                variant="secondary"
                className="min-h-14 min-w-[7.5rem] border-white/15 bg-black/30"
                icon={<CardsIcon className="h-5 w-5" />}
                onClick={joinTable}
                disabled={isPending}
              >
                Join
              </GradientButton>
            </div>
          </div>

          {status ? (
            <p className="mt-3 text-sm font-semibold text-[#F5C518]">{status}</p>
          ) : null}
        </div>
      </section>

      {/* How it plays */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: LockIncoIcon,
            title: "Private cards",
            body: "Only your wallet can decrypt your hole cards.",
          },
          {
            icon: TableIcon,
            title: "Public board",
            body: "Flop, turn, and river reveal for both players.",
          },
          {
            icon: TrophyIcon,
            title: "On-chain settle",
            body: "Showdown verifies attestations, then pays the pot.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-[24px] border border-white/8 bg-[#161322]/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5C518]/12 text-[#F5C518]">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-black text-white">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#9AA0B4]">{body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[24px] border border-white/8 bg-[#161322]/90 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7B5CFF]/15 text-[#B9A8FF]">
            <TableIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Quick rules</h2>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[#9AA0B4]">
              <li>1. Connect a Base Sepolia wallet</li>
              <li>2. Create a table or join with a table number</li>
              <li>3. Play heads-up. Cash out when the hand settles</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
