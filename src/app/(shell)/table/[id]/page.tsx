"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { formatEther, type Hex } from "viem";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import {
  RIVER_HOLDEM_ADDRESS,
  riverHoldemAbi,
  STAGE_LABELS,
} from "@/lib/contracts/riverHoldem";
import { decodeCard, peekMyCards, readRevealed, type DecodedCard } from "@/lib/inco/client";

type TableState = {
  player0: `0x${string}`;
  player1: `0x${string}`;
  buyIn: bigint;
  stack0: bigint;
  stack1: bigint;
  pot: bigint;
  bet0: bigint;
  bet1: bigint;
  currentBet: bigint;
  button: number;
  toAct: `0x${string}`;
  stage: number;
  folded0: boolean;
  folded1: boolean;
  boardCount: number;
  handLive: boolean;
};

function shortAddr(a?: string) {
  if (!a || a === "0x0000000000000000000000000000000000000000") return "Empty";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function CardFace({ card }: { card: DecodedCard }) {
  return (
    <div
      className={`flex h-[72px] w-[52px] flex-col justify-between rounded-xl border border-white/20 bg-gradient-to-b from-white to-slate-200 p-1.5 text-sm font-black shadow-lg ${
        card.isRed ? "text-red-600" : "text-slate-900"
      }`}
    >
      <span>
        {card.rank}
        <span className="ml-0.5 text-xs">{card.label.slice(-1)}</span>
      </span>
      <span className="self-end text-lg">{card.label.slice(-1)}</span>
    </div>
  );
}

function CardBack() {
  return (
    <div className="flex h-[72px] w-[52px] items-center justify-center rounded-xl border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-700 to-emerald-950 text-emerald-200/40 shadow-lg">
      ♦
    </div>
  );
}

export default function OnchainTablePage() {
  const params = useParams();
  const tableId = BigInt(String(params.id || "0"));
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const [table, setTable] = useState<TableState | null>(null);
  const [myCards, setMyCards] = useState<DecodedCard[]>([]);
  const [boardCards, setBoardCards] = useState<DecodedCard[]>([]);
  const [log, setLog] = useState("Loading table…");
  const [raiseToEth, setRaiseToEth] = useState("0.0004");

  const refresh = useCallback(async () => {
    if (!publicClient || !RIVER_HOLDEM_ADDRESS || tableId <= 0n) return;
    const row = (await publicClient.readContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "tables",
      args: [tableId],
    })) as readonly [
      `0x${string}`,
      `0x${string}`,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      number,
      `0x${string}`,
      number,
      boolean,
      boolean,
      number,
      boolean,
    ];

    const next: TableState = {
      player0: row[0],
      player1: row[1],
      buyIn: row[2],
      stack0: row[3],
      stack1: row[4],
      pot: row[5],
      bet0: row[6],
      bet1: row[7],
      currentBet: row[8],
      button: row[9],
      toAct: row[10],
      stage: row[11],
      folded0: row[12],
      folded1: row[13],
      boardCount: row[14],
      handLive: row[15],
    };
    setTable(next);
    setLog(`Stage: ${STAGE_LABELS[next.stage] || next.stage}`);

    if (address && (address === next.player0 || address === next.player1) && next.handLive) {
      try {
        const handles = (await publicClient.readContract({
          address: RIVER_HOLDEM_ADDRESS,
          abi: riverHoldemAbi,
          functionName: "getHoleHandles",
          args: [tableId],
          account: address,
        })) as readonly [Hex, Hex];
        if (walletClient && handles[0] !== "0x" + "0".repeat(64)) {
          const peeked = await peekMyCards(walletClient, [handles[0], handles[1]]);
          setMyCards(peeked.map((p) => decodeCard(p.value)));
        }
      } catch (e) {
        console.warn("peek failed", e);
      }
    }

    if (next.boardCount > 0) {
      try {
        const [outs, count] = (await publicClient.readContract({
          address: RIVER_HOLDEM_ADDRESS,
          abi: riverHoldemAbi,
          functionName: "getBoardHandles",
          args: [tableId],
        })) as readonly [readonly Hex[], number];
        const active = outs.slice(0, count).filter((h) => h && h !== (`0x${"0".repeat(64)}` as Hex));
        if (active.length) {
          const revealed = await readRevealed(active as Hex[]);
          setBoardCards(revealed.map((r) => decodeCard(r.value)));
        }
      } catch (e) {
        console.warn("board reveal failed", e);
      }
    } else {
      setBoardCards([]);
    }
  }, [address, publicClient, tableId, walletClient]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  const myTurn = useMemo(() => {
    if (!table || !address) return false;
    return table.toAct.toLowerCase() === address.toLowerCase();
  }, [table, address]);

  async function act(fn: "fold" | "checkCall") {
    const hash = await writeContractAsync({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: fn,
      args: [tableId],
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    await refresh();
  }

  async function raise() {
    const total = BigInt(Math.floor(Number(raiseToEth) * 1e18));
    const hash = await writeContractAsync({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "raiseTo",
      args: [tableId, total],
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    await refresh();
  }

  async function runShowdown() {
    if (!walletClient || !publicClient || !address || !table) return;
    setLog("Collecting Inco attestations for showdown…");

    const myHandles = (await publicClient.readContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "getHoleHandles",
      args: [tableId],
      account: address,
    })) as readonly [Hex, Hex];

    const isP0 = address.toLowerCase() === table.player0.toLowerCase();
    const myPeek = await peekMyCards(walletClient, [myHandles[0], myHandles[1]]);

    // Opponent must also submit their hole cards. For a complete settle both players
    // (or one player after both peeks are public at showdown) submit all 9 slots.
    // At showdown, hole cards get revealed via attested decrypt by owners then either
    // player can finalize once all slots are filled. Here we submit our two hole slots
    // and all board slots. Opponent hole slots require their peek or a mutual reveal step.
    const mySlots = isP0 ? [0, 1] : [2, 3];
    for (let i = 0; i < 2; i++) {
      await writeContractAsync({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "submitShowdownCard",
        args: [tableId, mySlots[i], myPeek[i].value, myPeek[i].sigs],
      });
    }

    const [outs, count] = (await publicClient.readContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "getBoardHandles",
      args: [tableId],
    })) as readonly [readonly Hex[], number];
    const board = await readRevealed(outs.slice(0, count) as Hex[]);
    for (let i = 0; i < board.length; i++) {
      await writeContractAsync({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "submitShowdownCard",
        args: [tableId, 4 + i, board[i].value, board[i].sigs],
      });
    }

    setLog("Your cards and board submitted. Opponent must submit hole cards, then Finalize.");
    await refresh();
  }

  async function finalize() {
    const hash = await writeContractAsync({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "finalizeShowdown",
      args: [tableId],
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    setLog("Hand settled on-chain.");
    await refresh();
  }

  if (!RIVER_HOLDEM_ADDRESS) {
    return (
      <GlassCard className="p-6">
        <p className="font-bold text-river-orange">
          Missing NEXT_PUBLIC_RIVER_HOLDEM_ADDRESS. Deploy the contract first.
        </p>
      </GlassCard>
    );
  }

  if (!isConnected) {
    return (
      <GlassCard className="p-6">
        <p className="font-bold text-river-white">Connect a Base Sepolia wallet to sit at this table.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-river-grey">Table</p>
            <h1 className="text-2xl font-black text-river-white">#{tableId.toString()}</h1>
          </div>
          <span className="rounded-full border border-river-cyan/30 bg-river-cyan/10 px-3 py-1 text-xs font-bold text-river-cyan">
            {table ? STAGE_LABELS[table.stage] : "…"}
          </span>
        </div>
        <p className="mt-2 text-sm text-river-grey">{log}</p>
      </GlassCard>

      <div
        className="relative overflow-hidden rounded-[28px] border border-emerald-900/50 bg-gradient-to-b from-[#14503C] via-[#0A3428] to-[#061E16] p-5 shadow-2xl"
      >
        <div className="mb-6 flex justify-between text-xs font-bold text-emerald-100/80">
          <span>P0 {shortAddr(table?.player0)} · {table ? formatEther(table.stack0) : "0"} ETH</span>
          <span>Pot {table ? formatEther(table.pot) : "0"} ETH</span>
          <span>P1 {shortAddr(table?.player1)} · {table ? formatEther(table.stack1) : "0"} ETH</span>
        </div>

        <div className="mb-8 flex min-h-[80px] items-center justify-center gap-2">
          {boardCards.length
            ? boardCards.map((c) => <CardFace key={c.id + c.label} card={c} />)
            : Array.from({ length: table?.boardCount || 0 }).map((_, i) => <CardBack key={i} />)}
          {!table?.boardCount ? (
            <p className="text-sm text-emerald-100/50">Board deals after preflop action</p>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-200/70">Your hole cards</p>
          <div className="flex gap-2">
            {myCards.length === 2 ? (
              myCards.map((c) => <CardFace key={c.id} card={c} />)
            ) : (
              <>
                <CardBack />
                <CardBack />
              </>
            )}
          </div>
          <p className="text-xs text-emerald-100/60">
            Only your wallet can decrypt these handles via Inco attestedDecrypt.
          </p>
        </div>
      </div>

      <GlassCard className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <GradientButton disabled={!myTurn || isPending} onClick={() => act("fold")} variant="secondary">
            Fold
          </GradientButton>
          <GradientButton disabled={!myTurn || isPending} onClick={() => act("checkCall")}>
            Check / Call
          </GradientButton>
          <div className="flex flex-1 gap-2">
            <input
              value={raiseToEth}
              onChange={(e) => setRaiseToEth(e.target.value)}
              className="min-h-11 w-28 rounded-2xl border border-river-line/25 bg-river-bg1 px-3 text-sm font-bold text-river-white"
            />
            <GradientButton disabled={!myTurn || isPending} onClick={raise} variant="secondary">
              Raise to (ETH)
            </GradientButton>
          </div>
        </div>
        {table?.stage === 5 ? (
          <div className="flex flex-wrap gap-2">
            <GradientButton disabled={isPending} onClick={runShowdown}>
              Submit my cards + board
            </GradientButton>
            <GradientButton disabled={isPending} variant="secondary" onClick={finalize}>
              Finalize showdown
            </GradientButton>
          </div>
        ) : null}
        <GradientButton variant="ghost" onClick={refresh}>
          Refresh
        </GradientButton>
      </GlassCard>
    </div>
  );
}
