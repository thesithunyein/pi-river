"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { formatEther, type Hex } from "viem";
import { BoltIcon, CardsIcon, LockIncoIcon, SpadeIcon } from "@/components/icons";
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
  if (!a || a === "0x0000000000000000000000000000000000000000") return "Waiting…";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function CardFace({ card, compact = false }: { card: DecodedCard; compact?: boolean }) {
  return (
    <div
      className={`flex flex-col justify-between rounded-xl border border-white/25 bg-gradient-to-b from-white to-[#e8eaf0] font-black shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${
        compact ? "h-14 w-10 p-1 text-[11px]" : "h-[76px] w-[54px] p-1.5 text-sm"
      } ${card.isRed ? "text-[#dc2626]" : "text-[#0f172a]"}`}
    >
      <span>
        {card.rank}
        <span className="ml-0.5 text-[10px]">{card.label.slice(-1)}</span>
      </span>
      <span className={`self-end ${compact ? "text-sm" : "text-lg"}`}>{card.label.slice(-1)}</span>
    </div>
  );
}

function CardBack({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border-2 border-[#F5C518]/35 bg-gradient-to-br from-[#1e293b] to-[#020617] text-[#F5C518] shadow-lg ${
        compact ? "h-14 w-10" : "h-[76px] w-[54px]"
      }`}
    >
      <SpadeIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
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
  const [log, setLog] = useState("Syncing table…");
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
    setLog(`${STAGE_LABELS[next.stage] || "Table"} | pot ${formatEther(next.pot)} ETH`);

    if (address && (address === next.player0 || address === next.player1) && next.handLive) {
      try {
        const handles = (await publicClient.readContract({
          address: RIVER_HOLDEM_ADDRESS,
          abi: riverHoldemAbi,
          functionName: "getHoleHandles",
          args: [tableId],
          account: address,
        })) as readonly [Hex, Hex];
        if (walletClient && handles[0] !== ("0x" + "0".repeat(64) as Hex)) {
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
    const id = setInterval(refresh, 6000);
    return () => clearInterval(id);
  }, [refresh]);

  const seat = useMemo(() => {
    if (!table || !address) return null;
    const a = address.toLowerCase();
    if (table.player0.toLowerCase() === a) return 0;
    if (table.player1.toLowerCase() === a) return 1;
    return null;
  }, [table, address]);

  const myTurn = useMemo(() => {
    if (!table || !address) return false;
    return table.toAct.toLowerCase() === address.toLowerCase();
  }, [table, address]);

  const opponent = useMemo(() => {
    if (!table || seat === null) return null;
    return seat === 0
      ? { addr: table.player1, stack: table.stack1, bet: table.bet1, folded: table.folded1 }
      : { addr: table.player0, stack: table.stack0, bet: table.bet0, folded: table.folded0 };
  }, [table, seat]);

  const me = useMemo(() => {
    if (!table || seat === null) return null;
    return seat === 0
      ? { stack: table.stack0, bet: table.bet0, folded: table.folded0 }
      : { stack: table.stack1, bet: table.bet1, folded: table.folded1 };
  }, [table, seat]);

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

  async function startHand() {
    const hash = await writeContractAsync({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "startNextHand",
      args: [tableId],
      value: 0n,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    setLog("Dealing encrypted hole cards…");
    await refresh();
  }

  async function runShowdown() {
    if (!walletClient || !publicClient || !address || !table) return;
    setLog("Collecting Inco attestations…");

    const myHandles = (await publicClient.readContract({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "getHoleHandles",
      args: [tableId],
      account: address,
    })) as readonly [Hex, Hex];

    const isP0 = address.toLowerCase() === table.player0.toLowerCase();
    const myPeek = await peekMyCards(walletClient, [myHandles[0], myHandles[1]]);
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

    setLog("Submitted. Opponent submits holes, then finalize.");
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
      <div className="animate-fade-in space-y-4 rounded-[28px] border border-[#F5C518]/25 bg-[#161322] p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5C518] text-[#1A1400]">
          <SpadeIcon className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black text-white">Table offline</h1>
        <p className="text-sm leading-relaxed text-[#9AA0B4]">
          Contract address is not set yet. Deploy RiverHoldem to Base Sepolia, then set{" "}
          <span className="font-mono text-[#F5C518]">NEXT_PUBLIC_RIVER_HOLDEM_ADDRESS</span> on Vercel.
        </p>
        <Link href="/" className="inline-flex text-sm font-bold text-[#F5C518]">
          ← Back to lobby
        </Link>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="animate-fade-in rounded-[28px] border border-white/10 bg-[#161322] p-6">
        <p className="font-bold text-white">Connect a Base Sepolia wallet to sit at this table.</p>
      </div>
    );
  }

  const bothSeated =
    table &&
    table.player0 !== "0x0000000000000000000000000000000000000000" &&
    table.player1 !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="animate-fade-in mx-auto flex w-full max-w-lg flex-col gap-3 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7d8398]">pi River</p>
          <h1 className="text-xl font-black text-white">Table #{tableId.toString()}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#F5C518]/30 bg-[#F5C518]/10 px-3 py-1 text-[11px] font-bold text-[#F5C518]">
            {table ? STAGE_LABELS[table.stage] : "…"}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-[#9AA0B4]"
          >
            Sync
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-[#1f6b4a]/55 bg-[radial-gradient(ellipse_at_center,#1a7a4f_0%,#0c3d2c_48%,#061910_100%)] px-4 pb-5 pt-4 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 20%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 70% 70%, #fff 0 1px, transparent 1.5px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* Opponent */}
        <div className="relative mb-3 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7B5CFF] text-[10px] font-black text-white">
              VS
            </span>
            <div className="text-left">
              <p className="font-mono text-[11px] font-bold text-white">
                {shortAddr(opponent?.addr || table?.player1)}
              </p>
              <p className="font-mono text-[10px] text-[#9dceb4]">
                {opponent ? `${formatEther(opponent.stack)} ETH` : "-"}
                {opponent?.bet && opponent.bet > 0n ? ` | bet ${formatEther(opponent.bet)}` : ""}
                {opponent?.folded ? " | folded" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 opacity-80">
            <CardBack compact />
            <CardBack compact />
          </div>
        </div>

        {/* Pot + board */}
        <div className="relative mb-4 flex flex-col items-center gap-3">
          <div className="rounded-full border border-[#F5C518]/35 bg-black/35 px-4 py-1.5 font-mono text-xs font-black text-[#F5C518]">
            Pot {table ? formatEther(table.pot) : "0"} ETH
          </div>
          <div className="flex min-h-[80px] items-center justify-center gap-1.5">
            {boardCards.length
              ? boardCards.map((c) => <CardFace key={c.id + c.label} card={c} />)
              : table?.boardCount
                ? Array.from({ length: table.boardCount }).map((_, i) => <CardBack key={i} />)
                : (
                  <p className="text-center text-xs text-[#9dceb4]/70">
                    Board deals after preflop action
                  </p>
                )}
          </div>
        </div>

        {/* You */}
        <div className="relative flex flex-col items-center gap-2">
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
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5C518] text-[10px] font-black text-[#1A1400]">
              YOU
            </span>
            <div>
              <p className="font-mono text-[11px] font-bold text-white">{shortAddr(address)}</p>
              <p className="font-mono text-[10px] text-[#9dceb4]">
                {me ? `${formatEther(me.stack)} ETH` : "-"}
                {me?.bet && me.bet > 0n ? ` | bet ${formatEther(me.bet)}` : ""}
                {myTurn ? " | your turn" : ""}
              </p>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9dceb4]/80">
            <LockIncoIcon className="h-3.5 w-3.5 text-[#F5C518]" />
            Hole cards private via Inco until showdown
          </p>
        </div>
      </div>

      <p className="px-1 text-center text-xs font-semibold text-[#9AA0B4]">{log}</p>

      <div className="sticky bottom-[5.5rem] z-30 space-y-2 rounded-[24px] border border-white/10 bg-[#12101c]/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:bottom-4">
        {bothSeated && table && !table.handLive ? (
          <GradientButton
            className="w-full min-h-12"
            icon={<BoltIcon className="h-5 w-5" />}
            disabled={isPending}
            onClick={startHand}
          >
            Deal next hand
          </GradientButton>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <GradientButton
            variant="secondary"
            className="min-h-12"
            disabled={!myTurn || isPending}
            onClick={() => act("fold")}
          >
            Fold
          </GradientButton>
          <GradientButton
            className="min-h-12"
            disabled={!myTurn || isPending}
            onClick={() => act("checkCall")}
          >
            Call
          </GradientButton>
          <GradientButton
            variant="secondary"
            className="min-h-12"
            disabled={!myTurn || isPending}
            onClick={raise}
          >
            Raise
          </GradientButton>
        </div>

        <div className="flex gap-2">
          <input
            value={raiseToEth}
            onChange={(e) => setRaiseToEth(e.target.value)}
            className="min-h-11 flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 font-mono text-sm font-bold text-white outline-none focus:border-[#F5C518]/40"
            aria-label="Raise to ETH"
          />
          <span className="flex min-h-11 items-center px-2 text-xs font-bold text-[#9AA0B4]">ETH total</span>
        </div>

        {table?.stage === 5 ? (
          <div className="grid grid-cols-2 gap-2">
            <GradientButton disabled={isPending} onClick={runShowdown} icon={<CardsIcon className="h-4 w-4" />}>
              Submit cards
            </GradientButton>
            <GradientButton disabled={isPending} variant="secondary" onClick={finalize}>
              Finalize
            </GradientButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
