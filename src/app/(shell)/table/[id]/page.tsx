"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { formatEther, parseEther, type Hex } from "viem";
import { BoltIcon, CardsIcon, LockIncoIcon, SpadeIcon, ZoomInIcon, ZoomOutIcon } from "@/components/icons";
import { GradientButton } from "@/components/ui/GradientButton";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { BotAvatar } from "@/components/BotAvatar";
import { useAuthGate } from "@/components/AuthGate";
import { useGame } from "@/context/GameContext";
import { cn } from "@/lib/cn";
import {
  RIVER_HOLDEM_ADDRESS,
  riverHoldemAbi,
  STAGE_LABELS,
} from "@/lib/contracts/riverHoldem";
import { decodeCard, peekMyCards, readRevealed, getCachedPeeks, clearPeekCache, clearBoardCache, type DecodedCard } from "@/lib/inco/client";
import { sound } from "@/lib/sound";
import { usePlaySession } from "@/hooks/usePlaySession";

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

/** Friendly stack display — no "ETH" chrome for players. */
function formatStack(value: bigint) {
  const n = Number(formatEther(value));
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n < 0.001) return n.toFixed(5);
  if (n < 0.01) return n.toFixed(4);
  return n.toFixed(3);
}

const BOT_LINES = {
  thinking: [
    "River Bot is sizing you up…",
    "Bot counts chips in its head…",
    "Bot whispers to the dealer…",
  ],
  check: ["River Bot checks. Cool as ice.", "Bot taps the felt. Check."],
  call: ["River Bot calls. Bring it.", "Bot slides chips in. Call."],
  raise: ["River Bot raises! Pressure on.", "Bot bumps the pot. Raise!"],
  fold: ["River Bot folds. Nice steal.", "Bot mucks. Pot is yours."],
} as const;

function pickLine(lines: readonly string[]) {
  return lines[Math.floor(Math.random() * lines.length)];
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
  const search = useSearchParams();
  const modeHint = search.get("mode");
  const stakeParam = Number(search.get("stake") || "0");
  const tableId = BigInt(String(params.id || "0"));
  const { address: mmAddress, isConnected: mmConnected } = useAccount();
  const { googleUser } = useAuthGate();
  const {
    profile,
    startMegapotSession,
    awardMegapotWin,
    megapotCredits,
    xp,
    recordHandResult,
  } = useGame();
  const play = usePlaySession();
  const wagmiPublic = usePublicClient();
  const { data: mmWalletClient } = useWalletClient();
  const { writeContractAsync: mmWrite, isPending: mmPending } = useWriteContract();

  const silent = play.silent;
  const address = silent ? play.address : mmAddress;
  const isConnected = silent ? Boolean(play.address) : mmConnected;
  const publicClient = silent ? play.publicClient : wagmiPublic;
  const walletClient = silent ? play.walletClient : mmWalletClient;
  const isPending = silent ? false : mmPending;

  async function writeFn(params: {
    address: `0x${string}`;
    abi: typeof riverHoldemAbi;
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
  }) {
    if (silent) {
      return play.writeContract(params);
    }
    return mmWrite({
      ...params,
      args: params.args as never,
    } as never);
  }

  async function waitTx(hash: Hex) {
    if (silent) return play.waitForTx(hash);
    return publicClient!.waitForTransactionReceipt({ hash });
  }

  const displayName = useMemo(() => {
    const meta = googleUser?.user_metadata as Record<string, unknown> | undefined;
    const googleName =
      (typeof meta?.full_name === "string" && meta.full_name) ||
      (typeof meta?.name === "string" && meta.name) ||
      googleUser?.email?.split("@")[0] ||
      null;
    if (profile.displayName && profile.displayName !== "Player") return profile.displayName;
    if (googleName) return String(googleName);
    return shortAddr(address ?? undefined);
  }, [profile.displayName, googleUser, address]);

  const [table, setTable] = useState<TableState | null>(null);
  const [myCards, setMyCards] = useState<DecodedCard[]>([]);
  const [boardCards, setBoardCards] = useState<DecodedCard[]>([]);
  const [log, setLog] = useState("Loading table…");
  const [raiseToEth, setRaiseToEth] = useState("0.000015");
  const [botAddress, setBotAddress] = useState<string | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [seatingBot, setSeatingBot] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [poolUsdc, setPoolUsdc] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [wideView, setWideView] = useState(false);
  const botActing = useRef(false);
  const showdownBusy = useRef(false);
  const dealBusy = useRef(false);
  const prevStage = useRef<number | null>(null);
  const lastHoleKey = useRef<string>("");
  const lastBoardKey = useRef<string>("");
  const holePeekRef = useRef<Awaited<ReturnType<typeof peekMyCards>> | null>(null);
  const awardedHand = useRef(false);
  const handStartStack = useRef<bigint | null>(null);
  const botLevel = xp >= 4000 ? 3 : xp >= 1200 ? 2 : 1;

  useEffect(() => {
    if (modeHint === "friend" || modeHint === "bot") {
      startMegapotSession(modeHint);
    } else if (stakeParam === 2) {
      startMegapotSession("friend");
    }
  }, [modeHint, stakeParam, startMegapotSession]);

  useEffect(() => {
    fetch("/api/bot/info")
      .then((r) => r.json())
      .then((data: { address?: string }) => setBotAddress(data.address?.toLowerCase() ?? null))
      .catch(() => setBotAddress(null));
    fetch("/api/megapot/claim")
      .then((r) => r.json())
      .then((d: { prizePoolUsdc?: string }) => {
        if (d.prizePoolUsdc) setPoolUsdc(d.prizePoolUsdc);
      })
      .catch(() => {});
  }, []);

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
    setLog(
      next.handLive
        ? `${STAGE_LABELS[next.stage] || "Hand"} · pot ${formatStack(next.pot)}`
        : next.player1 === "0x0000000000000000000000000000000000000000"
          ? "Waiting for opponent…"
          : "Ready for the next hand"
    );

    if (!next.handLive) {
      if (lastHoleKey.current) {
        clearPeekCache();
        clearBoardCache();
        lastHoleKey.current = "";
        lastBoardKey.current = "";
        holePeekRef.current = null;
        setMyCards([]);
        setBoardCards([]);
      }
    } else if (address && (address === next.player0 || address === next.player1)) {
      try {
        const handles = (await publicClient.readContract({
          address: RIVER_HOLDEM_ADDRESS,
          abi: riverHoldemAbi,
          functionName: "getHoleHandles",
          args: [tableId],
          account: address,
        })) as readonly [Hex, Hex];
        const holeKey = `${handles[0]}|${handles[1]}`.toLowerCase();
        if (
          walletClient &&
          handles[0] !== (`0x${"0".repeat(64)}` as Hex) &&
          holeKey !== lastHoleKey.current
        ) {
          const peeked = await peekMyCards(walletClient, [handles[0], handles[1]]);
          holePeekRef.current = peeked;
          lastHoleKey.current = holeKey;
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
        const boardKey = active.join("|").toLowerCase();
        if (active.length && boardKey !== lastBoardKey.current) {
          const revealed = await readRevealed(active as Hex[]);
          lastBoardKey.current = boardKey;
          setBoardCards(revealed.map((r) => decodeCard(r.value)));
        }
      } catch (e) {
        console.warn("board reveal failed", e);
      }
    } else if (lastBoardKey.current) {
      lastBoardKey.current = "";
      setBoardCards([]);
    }
  }, [address, publicClient, tableId, walletClient]);

  useEffect(() => {
    refresh();
    const ms = botThinking ? 700 : modeHint === "bot" ? 1400 : 5000;
    const id = setInterval(refresh, ms);
    return () => clearInterval(id);
  }, [refresh, modeHint, botThinking]);

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

  const isBotOpponent = Boolean(
    opponent?.addr && botAddress && opponent.addr.toLowerCase() === botAddress
  );
  const vsBot = modeHint === "bot" || isBotOpponent;

  const toCall = useMemo(() => {
    if (!table || !me) return 0n;
    return table.currentBet > me.bet ? table.currentBet - me.bet : 0n;
  }, [table, me]);

  const toActKey = table?.toAct?.toLowerCase() ?? "";
  const handLive = Boolean(table?.handLive);
  const stage = table?.stage ?? -1;

  useEffect(() => {
    if (!botAddress || toActKey !== botAddress.toLowerCase()) {
      setBotThinking(false);
      botActing.current = false;
      return;
    }

    if (!vsBot || !handLive || stage < 1 || stage > 4) return;
    if (botActing.current) return;

    let cancelled = false;
    botActing.current = true;
    setBotThinking(true);
    setLog(botLevel >= 3 ? "River Bot snaps back…" : "River Bot is acting…");

    // No fake delay — speed is limited by Base Sepolia confirming the bot tx
    void (async () => {
      try {
        const res = await fetch("/api/bot/act", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId: tableId.toString(),
            xp,
            difficulty: botLevel,
          }),
        });
        if (cancelled) return;
        const data = (await res.json()) as { action?: string; skipped?: boolean; error?: string };
        if (!res.ok) {
          setLog(data.error || "Bot missed that beat. Tap Refresh.");
        } else if (data.skipped) {
          setLog("Waiting on the table…");
        } else {
          sound.playChip();
          if (data.action === "raise") setLog(pickLine(BOT_LINES.raise));
          else if (data.action === "fold") {
            setLog(pickLine(BOT_LINES.fold));
            if (!awardedHand.current) {
              const gained = awardMegapotWin();
              awardedHand.current = true;
              recordHandResult(true, 1000, "River Bot", "Opponent folded");
              setBanner(`You won! Opponent folded. +${gained} ticket → claim in Rewards.`);
            } else {
              setBanner("You won! Opponent folded.");
            }
            sound.playWin();
          } else if (data.action === "check") setLog(pickLine(BOT_LINES.check));
          else setLog(pickLine(BOT_LINES.call));
        }
        await refresh();
      } catch {
        if (!cancelled) setLog("Bot hiccup. Tap Refresh.");
      } finally {
        if (!cancelled) {
          setBotThinking(false);
          botActing.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsBot, botAddress, toActKey, handLive, stage, tableId, refresh, xp, botLevel]);

  // Auto-deal next hand vs bot so the loop stays fun
  useEffect(() => {
    if (!vsBot || !table || dealBusy.current) return;
    if (table.handLive || (table.stage !== 6 && table.stage !== 0)) return;
    if (table.player1 === "0x0000000000000000000000000000000000000000") return;
    // Need at least ~4 BB each so the next hand can post blinds.
    if (table.stack0 < 10000000000000n || table.stack1 < 10000000000000n) return;

    dealBusy.current = true;
    setLog("Dealing the next hand…");
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/bot/deal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId: tableId.toString() }),
        });
        const data = (await res.json()) as { skipped?: boolean; error?: string };
        if (!res.ok) setLog(data.error || "Could not deal. Tap Deal next hand.");
        else if (!data.skipped) {
          sound.playCardSlide();
          setBanner(null);
          setLog("Cards are flying. Private holes locked.");
        }
        await refresh();
      } catch {
        setLog("Deal stalled. Tap Deal next hand.");
      } finally {
        dealBusy.current = false;
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [vsBot, table, tableId, refresh]);

  // Capture your stack when a hand starts — used for clear win/lose
  useEffect(() => {
    if (!table || !me) return;
    if (table.handLive && handStartStack.current === null) {
      handStartStack.current = me.stack;
      awardedHand.current = false;
    }
    if (!table.handLive) {
      handStartStack.current = null;
    }
  }, [table?.handLive, me?.stack, table, me]);

  // Stage flair
  useEffect(() => {
    if (!table) return;
    if (prevStage.current !== null && prevStage.current !== table.stage) {
      if (table.stage === 2) {
        sound.playCardSlide();
        setLog("Flop drops. Read the room.");
      } else if (table.stage === 3) {
        sound.playCardSlide();
        setLog("Turn card. One more street.");
      } else if (table.stage === 4) {
        sound.playCardSlide();
        setLog("River. Final bet.");
      } else if (table.stage === 5) {
        setLog("Showdown. Reveal time.");
      }
    }
    prevStage.current = table.stage;
  }, [table]);

  async function act(fn: "fold" | "checkCall") {
    sound.playClick();
    setActing(true);
    setLog(fn === "fold" ? "Folding…" : toCall > 0n ? "Calling…" : "Checking…");
    try {
      const hash = await writeFn({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: fn,
        args: [tableId],
      });
      await waitTx(hash);
      sound.playChip();
      if (fn === "fold" && !awardedHand.current) {
        awardedHand.current = true;
        const oppName = vsBot ? "River Bot" : "Opponent";
        recordHandResult(false, -500, oppName, "You folded");
        setBanner("You folded. You lose this hand. Deal again to try.");
        setLog("Hand over. You folded.");
      }
      await refresh();
    } finally {
      setActing(false);
    }
  }

  async function raise() {
    sound.playClick();
    setActing(true);
    setLog("Raising…");
    try {
      const total = BigInt(Math.floor(Number(raiseToEth) * 1e18));
      const hash = await writeFn({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "raiseTo",
        args: [tableId, total],
      });
      await waitTx(hash);
      sound.playChip();
      await refresh();
    } finally {
      setActing(false);
    }
  }

  async function fundTableShuffleFee(shortfallEth?: string) {
    if (!silent || !play.address || !publicClient || !RIVER_HOLDEM_ADDRESS) return false;
    try {
      setLog("Warming up the table…");
      const buyIn = table?.buyIn ?? parseEther("0.000015");
      let need =
        shortfallEth && Number(shortfallEth) > 0
          ? parseEther(shortfallEth)
          : 0n;
      if (need === 0n) {
        // Fallback: measure shortfall client-side (joinTable adds bot buy-in)
        let fee = parseEther("0.000104");
        try {
          const sim = await publicClient.simulateContract({
            address: RIVER_HOLDEM_ADDRESS,
            abi: riverHoldemAbi,
            functionName: "deckFee",
            args: [52],
          });
          fee = sim.result as bigint;
        } catch {
          // use fallback
        }
        const contractBal = await publicClient.getBalance({
          address: RIVER_HOLDEM_ADDRESS,
        });
        const projected = contractBal + buyIn;
        const target = fee + parseEther("0.000005");
        need = projected >= target ? 0n : target - projected;
      }
      if (need === 0n) return true;

      const bal = await publicClient.getBalance({ address: play.address });
      const gasKeep = parseEther("0.000008");
      if (bal <= need + gasKeep) {
        // Ask house drip for fee headroom, then retry once
        try {
          await play.ensureFunded();
        } catch {
          return false;
        }
      }
      const bal2 = await publicClient.getBalance({ address: play.address });
      if (bal2 <= need + gasKeep) return false;

      const hash = await play.writeContract({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "fundFees",
        value: need,
      });
      await waitTx(hash);
      return true;
    } catch {
      return false;
    }
  }

  async function seatBot() {
    setSeatingBot(true);
    setLog("Finding opponent…");
    setBanner(null);
    try {
      // Prefund Inco shuffle fee — joinTable starts the hand immediately
      await fundTableShuffleFee();

      let opponent = botAddress;
      if (!opponent) {
        try {
          const info = (await (await fetch("/api/bot/info")).json()) as {
            address?: string;
          };
          opponent = info.address?.toLowerCase() ?? null;
          if (opponent) setBotAddress(opponent);
        } catch {
          // continue
        }
      }

      // If bot is short on buy-in + gas, top up from play wallet
      if (silent && play.walletClient?.account && opponent) {
        try {
          const bal = await publicClient!.getBalance({ address: play.address! });
          const botBal = await publicClient!.getBalance({
            address: opponent as `0x${string}`,
          });
          const need = parseEther("0.000025"); // buy-in + gas for join+shuffle
          if (botBal < need && bal > need + parseEther("0.00002")) {
            setLog("Setting up opponent…");
            const topUp = need - botBal;
            const hash = await play.walletClient.sendTransaction({
              to: opponent as `0x${string}`,
              value: topUp,
              account: play.walletClient.account,
              chain: play.walletClient.chain,
            });
            await waitTx(hash);
          }
        } catch {
          // continue to join attempt
        }
      }

      const res = await fetch("/api/bot/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: tableId.toString() }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        shortfallEth?: string;
      };
      if (!res.ok) {
        if (data.code === "NEEDS_FEE_FUND") {
          const funded = await fundTableShuffleFee(data.shortfallEth);
          if (funded) {
            setLog("Opponent joining…");
            const retry = await fetch("/api/bot/join", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tableId: tableId.toString() }),
            });
            const retryData = (await retry.json()) as { error?: string };
            if (retry.ok) {
              sound.playChip();
              setBanner("Opponent sat down!");
              setLog("Cards dealing…");
              await refresh();
              return;
            }
            setLog(retryData.error || "Opponent could not sit yet.");
            setBanner(retryData.error || "Opponent could not sit yet. Tap again.");
            return;
          }
        }
        setLog(data.error || "Opponent could not sit yet.");
        setBanner(data.error || "Opponent could not sit yet. Tap again.");
      } else {
        sound.playChip();
        setBanner("Opponent sat down!");
        setLog("Cards dealing…");
        await refresh();
      }
    } catch {
      setLog("Could not reach opponent. Try again.");
    } finally {
      setSeatingBot(false);
    }
  }

  // Must stay above early returns (rules-of-hooks).
  useEffect(() => {
    if (modeHint !== "bot") return;
    if (!table) return;
    if (table.player1 !== "0x0000000000000000000000000000000000000000") return;
    if (seatingBot) return;
    const t = window.setTimeout(() => {
      void seatBot();
    }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeHint, table?.player1, seatingBot]);

  async function copyTableId() {
    try {
      await navigator.clipboard.writeText(tableId.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setLog(`Share this table #: ${tableId.toString()}`);
    }
  }

  async function startHand() {
    sound.playClick();
    setActing(true);
    setBanner(null);
    setLog("Dealing private cards…");
    try {
      // Bot path: house deals (funds shuffle fee + starts hand)
      if (vsBot) {
        await fundTableShuffleFee();
        const res = await fetch("/api/bot/deal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId: tableId.toString() }),
        });
        const data = (await res.json()) as { error?: string; skipped?: boolean };
        if (!res.ok) {
          setLog(data.error || "Could not deal. Tap Deal next hand.");
          setBanner(data.error || "Could not deal. Tap again.");
          return;
        }
        if (!data.skipped) sound.playCardSlide();
        awardedHand.current = false;
        setRevealOpen(false);
        setLog("Cards are flying. Private holes locked.");
        await refresh();
        return;
      }

      await fundTableShuffleFee();
      const hash = await writeFn({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "startNextHand",
        args: [tableId],
        value: 0n,
      });
      await waitTx(hash);
      awardedHand.current = false;
      setRevealOpen(false);
      sound.playCardSlide();
      setLog("Dealing private cards…");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not deal.";
      const friendly = /fund shuffle fee/i.test(msg)
        ? "Table needs a quick top-up. Tap Deal next hand again."
        : msg.length > 120
          ? "Could not deal. Tap Deal next hand again."
          : msg;
      setLog(friendly);
      setBanner(friendly);
    } finally {
      setActing(false);
    }
  }

  async function runShowdown() {
    if (!walletClient || !publicClient || !address || !table || showdownBusy.current) return;
    showdownBusy.current = true;
    try {
      setRevealOpen(true);
      setLog("Reveal time. Unlocking your private cards…");

      const myHandles = (await publicClient.readContract({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "getHoleHandles",
        args: [tableId],
        account: address,
      })) as readonly [Hex, Hex];

      const isP0 = address.toLowerCase() === table.player0.toLowerCase();
      const cached = getCachedPeeks([myHandles[0], myHandles[1]]);
      const myPeek =
        holePeekRef.current &&
        holePeekRef.current.length === 2 &&
        holePeekRef.current[0].handle.toLowerCase() === myHandles[0].toLowerCase()
          ? holePeekRef.current
          : cached ?? (await peekMyCards(walletClient, [myHandles[0], myHandles[1]]));
      holePeekRef.current = myPeek;
      const mySlots = isP0 ? [0, 1] : [2, 3];
      for (let i = 0; i < 2; i++) {
        const hash = await writeFn({
          address: RIVER_HOLDEM_ADDRESS,
          abi: riverHoldemAbi,
          functionName: "submitShowdownCard",
          args: [tableId, mySlots[i], myPeek[i].value, myPeek[i].sigs],
        });
        await waitTx(hash);
      }

      if (vsBot) {
        setLog("River Bot is showing its cards…");
        await fetch("/api/bot/showdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId: tableId.toString() }),
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
        const hash = await writeFn({
          address: RIVER_HOLDEM_ADDRESS,
          abi: riverHoldemAbi,
          functionName: "submitShowdownCard",
          args: [tableId, 4 + i, board[i].value, board[i].sigs],
        });
        await waitTx(hash);
      }

      setLog(vsBot ? "Almost there. Finalize to settle." : "Cards submitted. Finalize when ready.");
      await refresh();
    } finally {
      showdownBusy.current = false;
    }
  }

  async function finalize() {
    const before = handStartStack.current;
    const hash = await writeFn({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "finalizeShowdown",
      args: [tableId],
    });
    await waitTx(hash);
    await refresh();

    // Re-read stack after settle for a clear win/lose call
    let after = before;
    try {
      if (publicClient && address) {
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
        const seat0 = address.toLowerCase() === row[0].toLowerCase();
        after = seat0 ? row[3] : row[4];
      }
    } catch {
      // fall through
    }

    if (!awardedHand.current && before !== null && after !== null) {
      awardedHand.current = true;
      if (after > before) {
        const gained = awardMegapotWin({ showdown: true });
        recordHandResult(true, 1500, vsBot ? "River Bot" : "Friend", "Showdown win");
        sound.playWin();
        setBanner(`You won the showdown! +${gained} ticket → claim in Rewards.`);
        setLog("You won this hand.");
      } else if (after < before) {
        recordHandResult(false, -800, vsBot ? "River Bot" : "Friend", "Showdown loss");
        setBanner("You lost this hand. Better luck next deal.");
        setLog("You lost this hand.");
      } else {
        setBanner("Chop / no change. Deal again.");
        setLog("Stacks unchanged.");
      }
    } else if (!awardedHand.current) {
      setBanner("Hand settled.");
    }
    setRevealOpen(false);
  }

  if (!RIVER_HOLDEM_ADDRESS) {
    return (
      <div className="animate-fade-in space-y-4 rounded-[28px] border border-[#F5C518]/25 bg-[#161322] p-6">
        <h1 className="text-2xl font-black text-white">Table offline</h1>
        <Link href="/" className="inline-flex text-sm font-bold text-[#F5C518]">
          ← Back to lobby
        </Link>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="animate-fade-in rounded-[28px] border border-white/10 bg-[#161322] p-6">
        <p className="font-bold text-white">
          Sign in with Google to play at this table.
        </p>
        <Link href="/" className="mt-3 inline-flex text-sm font-bold text-[#F5C518]">
          ← Back to lobby
        </Link>
      </div>
    );
  }

  const bothSeated =
    table &&
    table.player0 !== "0x0000000000000000000000000000000000000000" &&
    table.player1 !== "0x0000000000000000000000000000000000000000";

  const waitingForOpponent =
    Boolean(table) &&
    table!.player1 === "0x0000000000000000000000000000000000000000";

  const opponentLabel = isBotOpponent
    ? "River Bot"
    : shortAddr(opponent?.addr || table?.player1);

  const STREET_STEPS = ["Preflop", "Flop", "Turn", "River", "Showdown"] as const;
  const streetIndex =
    table?.stage === 5 || table?.stage === 6
      ? 4
      : table?.stage && table.stage >= 1 && table.stage <= 4
        ? table.stage - 1
        : 0;

  return (
    <div
      className={cn(
        "animate-fade-in mx-auto flex w-full flex-col gap-3 pb-4 transition-[max-width] duration-300",
        wideView ? "max-w-6xl" : "max-w-lg sm:max-w-3xl"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7d8398]">
            {vsBot ? `Quick Play · Bot Lv.${botLevel}` : "Friend table"}
          </p>
          <h1 className="text-xl font-black text-white sm:text-2xl">Table #{tableId.toString()}</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWideView((v) => !v)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-bold text-[#F5C518] transition hover:bg-white/10"
              title={wideView ? "Normal view" : "Wide view"}
            >
              {wideView ? <ZoomOutIcon className="h-4 w-4" /> : <ZoomInIcon className="h-4 w-4" />}
              <span className="hidden sm:inline">{wideView ? "Normal" : "Wide"}</span>
            </button>
            <span className="rounded-full border border-[#F5C518]/30 bg-[#F5C518]/10 px-3 py-1 text-[11px] font-bold text-[#F5C518]">
              {table ? STAGE_LABELS[table.stage] : "…"}
            </span>
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-[#9AA0B4]"
            >
              Refresh
            </button>
          </div>
          <p className="text-[10px] font-bold text-[#9dceb4]">
            Tickets ready: {megapotCredits}
            {poolUsdc
              ? ` · pool $${Number(poolUsdc).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 rounded-2xl border border-white/8 bg-[#161322]/80 px-2 py-2 sm:px-3">
        {STREET_STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center",
              i === streetIndex ? "bg-[#F5C518]/15 text-[#F5C518]" : "text-[#7d8398]",
              i < streetIndex && "text-[#3ECF8E]"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-full max-w-[2.5rem] rounded-full",
                i < streetIndex
                  ? "bg-[#3ECF8E]"
                  : i === streetIndex
                    ? "bg-[#F5C518]"
                    : "bg-white/10"
              )}
            />
            <span className="text-[9px] font-black uppercase tracking-wide sm:text-[10px]">{label}</span>
          </div>
        ))}
      </div>

      {revealOpen && myCards.length === 2 ? (
        <div className="animate-fade-in rounded-2xl border border-[#7B5CFF]/40 bg-[#7B5CFF]/15 px-4 py-3 text-center">
          <p className="text-sm font-black text-[#B9A8FF]">Card reveal</p>
          <p className="mt-1 text-xs text-[#c8c4d8]">
            Your private cards open for showdown.
          </p>
          <div className="mt-2 flex justify-center gap-2">
            {myCards.map((c) => (
              <CardFace key={`reveal-${c.id}`} card={c} />
            ))}
          </div>
        </div>
      ) : null}

      {waitingForOpponent ? (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-[#161322] p-4">
          <p className="text-center text-sm font-black text-white">
            {modeHint === "bot" ? "Finding opponent…" : "Waiting for your friend"}
          </p>
          <p className="text-center text-xs leading-relaxed text-[#9AA0B4]">
            {modeHint === "bot"
              ? "Warming up private cards, then your match sits down. Tap retry if it stalls."
              : `Share table #${tableId.toString()}. Your friend joins from Challenge.`}
          </p>
          <div className={`grid gap-2 ${modeHint === "bot" ? "grid-cols-2" : "grid-cols-1"}`}>
            {modeHint === "bot" ? (
              <GradientButton
                className="min-h-11"
                disabled={seatingBot || isPending}
                onClick={seatBot}
                icon={<BoltIcon className="h-4 w-4" />}
              >
                {seatingBot ? "Seating…" : "Retry seat"}
              </GradientButton>
            ) : null}
            <GradientButton variant="secondary" className="min-h-11" onClick={copyTableId}>
              {copied ? "Copied!" : "Copy table #"}
            </GradientButton>
          </div>
        </div>
      ) : null}

      {banner ? (
        <div
          className={`animate-fade-in rounded-2xl border px-4 py-3 text-center text-sm font-black ${
            /won|ticket/i.test(banner)
              ? "border-[#3ECF8E]/45 bg-[#3ECF8E]/12 text-[#3ECF8E]"
              : /lost|folded/i.test(banner)
                ? "border-[#FA7185]/45 bg-[#FA7185]/12 text-[#FA7185]"
                : "border-[#F5C518]/40 bg-gradient-to-r from-[#F5C518]/20 to-[#E29A12]/10 text-[#F5C518]"
          }`}
        >
          {banner}
        </div>
      ) : null}
      {myTurn && !botThinking ? (
        <div className="animate-fade-in rounded-2xl border border-[#F5C518]/35 bg-[#F5C518]/12 px-4 py-3 text-center text-sm font-black text-[#F5C518]">
          Your turn. Fold, Check/Call, or Raise.
        </div>
      ) : null}
      {botThinking ? (
        <div className="animate-fade-in rounded-2xl border border-[#7B5CFF]/35 bg-[#7B5CFF]/12 px-4 py-3 text-center text-sm font-black text-[#B9A8FF]">
          River Bot is acting…
          <span className="mt-1 block text-[11px] font-semibold text-[#9AA0B4]">
            Confirming on-chain (usually a few seconds)
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          "relative overflow-hidden rounded-[32px] border border-[#1f6b4a]/55 bg-[radial-gradient(ellipse_at_center,#1a7a4f_0%,#0c3d2c_48%,#061910_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.5)]",
          wideView ? "min-h-[480px] px-5 pb-10 pt-7 sm:min-h-[560px] sm:px-16 md:px-24" : "px-4 pb-5 pt-4"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 20%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 70% 70%, #fff 0 1px, transparent 1.5px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative mb-3 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5">
            {isBotOpponent ? (
              <BotAvatar size={32} thinking={botThinking} />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7B5CFF] text-[10px] font-black text-white">
                VS
              </span>
            )}
            <div className="text-left">
              <p className="text-[11px] font-bold text-white">{opponentLabel}</p>
              <p className="font-mono text-[10px] text-[#9dceb4]">
                {opponent ? `Stack ${formatStack(opponent.stack)}` : "-"}
                {opponent?.bet && opponent.bet > 0n ? ` · bet ${formatStack(opponent.bet)}` : ""}
                {opponent?.folded ? " · folded" : ""}
                {botThinking ? " · acting" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 opacity-80">
            <CardBack compact />
            <CardBack compact />
          </div>
        </div>

        <div className="relative mb-4 flex flex-col items-center gap-3">
          <div className="rounded-full border border-[#F5C518]/35 bg-black/35 px-4 py-1.5 font-mono text-xs font-black text-[#F5C518]">
            Pot {table ? formatStack(table.pot) : "0"}
          </div>
          <div className="flex min-h-[80px] items-center justify-center gap-1.5">
            {boardCards.length
              ? boardCards.map((c) => <CardFace key={c.id + c.label} card={c} />)
              : table?.boardCount
                ? Array.from({ length: table.boardCount }).map((_, i) => <CardBack key={i} />)
                : (
                  <p className="text-center text-xs text-[#9dceb4]/70">
                    Board opens after preflop bets
                  </p>
                )}
          </div>
        </div>

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
            <PlayerAvatar className="rounded-full" size={28} showRing />
            <div>
              <p className="text-[11px] font-bold text-white">{displayName}</p>
              <p className="font-mono text-[10px] text-[#9dceb4]">
                {me ? `Stack ${formatStack(me.stack)}` : "-"}
                {me?.bet && me.bet > 0n ? ` · bet ${formatStack(me.bet)}` : ""}
                {myTurn ? " · your turn" : ""}
              </p>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9dceb4]/80">
            <LockIncoIcon className="h-3.5 w-3.5 text-[#F5C518]" />
            Hole cards stay private until showdown
          </p>
        </div>
      </div>

      <p className="px-1 text-center text-xs font-semibold text-[#9AA0B4]">{log}</p>

      {!waitingForOpponent ? (
        <div className="sticky bottom-[5.5rem] z-50 space-y-2 rounded-[24px] border border-white/10 bg-[#12101c]/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:bottom-24">
          {bothSeated && table && !table.handLive ? (
            <GradientButton
              className="relative z-10 w-full min-h-12"
              icon={<BoltIcon className="h-5 w-5" />}
              disabled={isPending || acting}
              onClick={startHand}
            >
              {acting ? "Dealing…" : "Deal next hand"}
            </GradientButton>
          ) : null}

          {/* Hide fold/check/raise between hands so Deal stays the only target */}
          {table?.handLive || table?.stage === 5 ? (
            <>
              {table.stage !== 5 ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <GradientButton
                      variant="secondary"
                      className="min-h-12"
                      disabled={!myTurn || isPending || acting}
                      onClick={() => act("fold")}
                    >
                      Fold
                    </GradientButton>
                    <GradientButton
                      className="min-h-12"
                      disabled={!myTurn || isPending || acting}
                      onClick={() => act("checkCall")}
                    >
                      {toCall > 0n ? "Call" : "Check"}
                    </GradientButton>
                    <GradientButton
                      variant="secondary"
                      className="min-h-12"
                      disabled={!myTurn || isPending || acting}
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
                      aria-label="Raise to amount"
                      placeholder="0.000015"
                    />
                    <span className="flex min-h-11 items-center px-2 text-xs font-bold text-[#9AA0B4]">
                      Raise to
                    </span>
                  </div>
                </>
              ) : null}

              {table.stage === 5 ? (
                <div className="grid grid-cols-2 gap-2">
                  <GradientButton disabled={isPending || acting} onClick={runShowdown} icon={<CardsIcon className="h-4 w-4" />}>
                    {vsBot ? "Showdown" : "Submit cards"}
                  </GradientButton>
                  <GradientButton disabled={isPending || acting} variant="secondary" onClick={finalize}>
                    Finalize
                  </GradientButton>
                </div>
              ) : null}

              {vsBot ? (
                <p className="text-center text-[10px] font-semibold text-[#7d8398]">
                  Your cards stay private until showdown. Bot moves happen automatically.
                </p>
              ) : null}
            </>
          ) : bothSeated ? (
            <p className="text-center text-[10px] font-semibold text-[#7d8398]">
              Hand settled. Tap Deal next hand when you are ready.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
