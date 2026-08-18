"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { PublicPlayerAvatar } from "@/components/PublicPlayerAvatar";
import { BotAvatar } from "@/components/BotAvatar";
import { useAuthGate } from "@/components/AuthGate";
import { useGame } from "@/context/GameContext";
import { useTableSeatPresence, type TableSeatProfile } from "@/hooks/useTableSeatPresence";
import { cn } from "@/lib/cn";
import { getCardBack, getTableFelt, cardPatternCss } from "@/lib/cosmetics";
import {
  RIVER_HOLDEM_ADDRESS,
  riverHoldemAbi,
  STAGE_LABELS,
} from "@/lib/contracts/riverHoldem";
import { decodeCard, peekMyCards, readRevealed, getCachedPeeks, clearPeekCache, clearBoardCache, type DecodedCard } from "@/lib/inco/client";
import { sound } from "@/lib/sound";
import { usePlaySession } from "@/hooks/usePlaySession";
import { HandResultOverlay } from "@/components/HandResultOverlay";
import { PlayerLevelBadge } from "@/components/PlayerLevelBadge";
import { PremiumChip, RailLeds } from "@/components/PremiumChip";
import { writeActiveTable, clearActiveTable } from "@/lib/activeTable";
import { PLAY_MIN } from "@/lib/wallet/playWallet";
import { funChipsFromStackDelta, foldLossChips } from "@/lib/progression";
import { pushRecentChallenge } from "@/lib/recentChallenges";

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

function friendlyShowdownError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("incomplete")) {
    return "Showdown bug fixed in a new contract — tap New game to play on the updated table.";
  }
  if (m.includes("bad attestation")) return "Card proof failed. Tap Reveal & settle again.";
  if (m.includes("not showdown")) return "Hand isn't at showdown anymore. Tap Refresh.";
  if (/insufficient|funds|gas|fee|balance/.test(m)) {
    return "Need a little more ETH for gas. Refresh, then settle again.";
  }
  if (m.includes("bot")) {
    return raw.length > 160 ? "River Bot couldn't show cards. Tap settle again." : raw;
  }
  return raw.length > 160 ? "Could not finish showdown. Tap Reveal & settle again." : raw;
}

function CardFace({ card, compact = false, shine = false, tilt = 0 }: { card: DecodedCard; compact?: boolean; shine?: boolean; tilt?: number }) {
  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-[14px] border-2 border-white/85 bg-gradient-to-b from-white via-[#f8fafc] to-[#dbe3f0] font-black shadow-[0_14px_32px_rgba(0,0,0,0.5)] ${
        compact ? "h-14 w-10 p-1 text-[11px]" : "h-[88px] w-[62px] p-1.5 text-sm"
      } ${card.isRed ? "text-[#dc2626]" : "text-[#0f172a]"} ${shine ? "ring-2 ring-[#F5C518] animate-bounce-soft" : ""}`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/80 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -right-4 -top-4 h-10 w-10 rounded-full bg-white/40 blur-md" />
      <span className="relative leading-none tracking-tight">
        {card.rank}
        <span className="ml-0.5 text-[10px]">{card.label.slice(-1)}</span>
      </span>
      <span className={`relative self-center ${compact ? "text-base" : "text-2xl"} opacity-90`}>
        {card.label.slice(-1)}
      </span>
      <span className={`relative self-end rotate-180 leading-none ${compact ? "text-[10px]" : "text-xs"}`}>
        {card.rank}
        <span className="ml-0.5">{card.label.slice(-1)}</span>
      </span>
    </div>
  );
}

function CardBack({
  compact = false,
  mark = "#F5C518",
  accent = "from-[#1e293b] to-[#020617]",
  pattern = "weave",
}: {
  compact?: boolean;
  mark?: string;
  accent?: string;
  pattern?: import("@/lib/cosmetics").CardPattern;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 shadow-[0_10px_24px_rgba(0,0,0,0.45)] bg-gradient-to-br ${accent} ${
        compact ? "h-14 w-10" : "h-[76px] w-[54px]"
      }`}
      style={{ borderColor: `${mark}66` }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: cardPatternCss(pattern, mark),
        }}
      />
      <div
        aria-hidden
        className="absolute inset-[5px] rounded-lg border"
        style={{ borderColor: `${mark}40` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`flex items-center justify-center rounded-full border-2 bg-black/35 shadow-inner ${
            compact ? "h-6 w-6" : "h-8 w-8"
          }`}
          style={{ borderColor: `${mark}aa`, color: mark }}
        >
          <SpadeIcon className={compact ? "h-3 w-3" : "h-4 w-4"} />
        </div>
      </div>
    </div>
  );
}

export default function OnchainTablePage() {
  const params = useParams();
  const router = useRouter();
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
    stats,
    recordHandResult,
    equippedCardBack,
    equippedTableFelt,
    consumeMegapotCredit,
    markTicketMinted,
  } = useGame();
  const play = usePlaySession();
  const cardStyle = getCardBack(equippedCardBack);
  const feltStyle = getTableFelt(equippedTableFelt);
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
  const [oppCards, setOppCards] = useState<DecodedCard[]>([]);
  const [boardCards, setBoardCards] = useState<DecodedCard[]>([]);
  const [log, setLog] = useState("Loading table…");
  const [raiseToEth, setRaiseToEth] = useState("0.000015");
  const [botAddress, setBotAddress] = useState<string | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [seatingBot, setSeatingBot] = useState(false);
  const [seatProfiles, setSeatProfiles] = useState<Record<string, TableSeatProfile>>({});

  useTableSeatPresence(
    String(params.id || ""),
    address ?? undefined,
    setSeatProfiles,
    Boolean(googleUser && address && modeHint !== "bot")
  );
  const [handFx, setHandFx] = useState<{
    win: boolean;
    title: string;
    subtitle?: string;
    ticketGained?: number;
    oppShow?: { rank: string; suit: string; red: boolean }[];
  } | null>(null);
  const [holdDeal, setHoldDeal] = useState(false);
  const handFxOpenRef = useRef(false);
  const [claimingTicket, setClaimingTicket] = useState(false);
  const [claimTicketError, setClaimTicketError] = useState<string | null>(null);

  function toOverlayCards(cards: DecodedCard[]) {
    return cards.map((c) => ({
      rank: c.rank,
      suit: c.label.slice(-1),
      red: c.isRed,
    }));
  }

  function celebrateHand(
    win: boolean,
    title: string,
    subtitle?: string,
    ticketGained = 0,
    shownOpp?: DecodedCard[]
  ) {
    setClaimTicketError(null);
    const opp = shownOpp && shownOpp.length === 2 ? toOverlayCards(shownOpp) : undefined;
    setHandFx({ win, title, subtitle, ticketGained: win ? ticketGained : 0, oppShow: opp });
    handFxOpenRef.current = true;
    if (win) sound.playCelebrate();
    else sound.playLose();
  }

  async function claimTicketFromOverlay() {
    if (!play.address || !handFx?.ticketGained) return;
    setClaimingTicket(true);
    setClaimTicketError(null);
    try {
      const res = await fetch("/api/megapot/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: play.address,
          googleUserId: googleUser?.id,
        }),
      });
      const data = (await res.json()) as { error?: string; txHash?: string };
      if (!res.ok) {
        const msg = data.error || "Claim failed.";
        setClaimTicketError(
          /refill|USDC|usdc|JACKPOT/i.test(msg)
            ? "Jackpot desk is refilling — your ticket credits stay saved. Try claim again in a moment."
            : msg
        );
        return;
      }
      consumeMegapotCredit();
      markTicketMinted();
      // One credit consumed per claim; keep overlay open if more credits remain from this hand
      setHandFx((prev) =>
        prev
          ? {
              ...prev,
              ticketGained: Math.max(0, (prev.ticketGained || 1) - 1),
              subtitle: data.txHash
                ? `Ticket minted · ${data.txHash.slice(0, 10)}…`
                : "Ticket minted to your seat.",
            }
          : null
      );
    } catch (err) {
      setClaimTicketError(err instanceof Error ? err.message : "Claim failed.");
    } finally {
      setClaimingTicket(false);
    }
  }
  const [copied, setCopied] = useState<"id" | "link" | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [poolUsdc, setPoolUsdc] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [peekError, setPeekError] = useState<string | null>(null);
  const [peekRetryBusy, setPeekRetryBusy] = useState(false);
  const [wideView, setWideView] = useState(false);
  const botActing = useRef(false);
  const showdownBusy = useRef(false);
  const dealBusy = useRef(false);
  const holdDealRef = useRef(false);
  const holdDealTimer = useRef<number | null>(null);
  const prevStage = useRef<number | null>(null);
  const lastHoleKey = useRef<string>("");
  const lastBoardKey = useRef<string>("");
  const holePeekRef = useRef<Awaited<ReturnType<typeof peekMyCards>> | null>(null);
  const awardedHand = useRef(false);
  const handStartStack = useRef<bigint | null>(null);
  const botLevel = xp >= 4000 ? 3 : xp >= 1200 ? 2 : 1;

  function scoreFromStacks(before: bigint | null, after: bigint | null): number {
    if (before === null || after === null) return 1200;
    const delta = after > before ? after - before : before - after;
    return funChipsFromStackDelta(delta);
  }

  function pauseAutoDeal(ms = 4800) {
    holdDealRef.current = true;
    setHoldDeal(true);
    if (holdDealTimer.current) window.clearTimeout(holdDealTimer.current);
    holdDealTimer.current = window.setTimeout(() => {
      holdDealRef.current = false;
      setHoldDeal(false);
    }, ms);
  }

  function clearSettlementHold() {
    if (holdDealTimer.current) window.clearTimeout(holdDealTimer.current);
    holdDealTimer.current = null;
    holdDealRef.current = false;
    setHoldDeal(false);
    setOppCards([]);
  }

  async function revealBotHoles(): Promise<DecodedCard[]> {
    if (!vsBot) return [];
    try {
      const res = await fetch("/api/bot/peek-holes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: tableId.toString() }),
      });
      const data = (await res.json()) as { values?: Array<number | string>; error?: string };
      if (!res.ok || !data.values || data.values.length < 2) return [];
      const cards = data.values.slice(0, 2).map((v) => decodeCard(BigInt(v)));
      setOppCards(cards);
      sound.playCardSlide();
      setLog("River Bot shows its cards.");
      return cards;
    } catch {
      return [];
    }
  }

  async function retryDecryptHoles() {
    if (!publicClient || !address || peekRetryBusy) return;
    const peekWallet = walletClient ?? play.walletClient;
    if (!peekWallet) {
      setPeekError("Play seat missing. Refresh and sign in with Google again.");
      setBanner("Play seat missing. Refresh and sign in with Google again.");
      return;
    }
    setPeekRetryBusy(true);
    setLog("Retrying Inco decrypt…");
    try {
      const handles = (await publicClient.readContract({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "getHoleHandles",
        args: [tableId],
        account: address,
      })) as readonly [Hex, Hex];
      if (handles[0] === (`0x${"0".repeat(64)}` as Hex)) {
        setPeekError("No hole cards dealt yet.");
        return;
      }
      clearPeekCache();
      const peeked = await peekMyCards(peekWallet, [handles[0], handles[1]], { force: true });
      holePeekRef.current = peeked;
      lastHoleKey.current = `${handles[0]}|${handles[1]}`.toLowerCase();
      setMyCards(peeked.map((p) => decodeCard(p.value)));
      setPeekError(null);
      setBanner(null);
      setLog("Holes decrypted — only you can see these.");
      sound.playCardSlide();
    } catch (e) {
      console.warn("retry peek failed", e);
      setPeekError("Decrypt still failed. Tap Retry decrypt once more.");
      setBanner("Decrypt still failed. Tap Retry decrypt once more.");
      setLog("Inco decrypt failed again.");
    } finally {
      setPeekRetryBusy(false);
    }
  }

  useEffect(() => {
    if (!tableId || tableId <= 0n) return;
    writeActiveTable({
      id: tableId.toString(),
      mode: modeHint === "friend" ? "friend" : "bot",
      stake: stakeParam || (modeHint === "friend" ? 2 : 1),
    });
  }, [tableId, modeHint, stakeParam]);


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
        // Keep last board + holes on-screen during bot reveal pause
        if (!holdDealRef.current) {
          setMyCards([]);
          setBoardCards([]);
          setOppCards([]);
        }
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
        const freshHand =
          handles[0] !== (`0x${"0".repeat(64)}` as Hex) && holeKey !== lastHoleKey.current;
        if (freshHand) {
          // New deal only — wipe prior opponent reveal
          if (holdDealTimer.current) window.clearTimeout(holdDealTimer.current);
          holdDealTimer.current = null;
          holdDealRef.current = false;
          setHoldDeal(false);
          setOppCards([]);
          setPeekError(null);
          if (walletClient) {
            const peeked = await peekMyCards(walletClient, [handles[0], handles[1]]);
            holePeekRef.current = peeked;
            lastHoleKey.current = holeKey;
            setMyCards(peeked.map((p) => decodeCard(p.value)));
            setPeekError(null);
          }
        }
      } catch (e) {
        console.warn("peek failed", e);
        setPeekError("Could not decrypt your holes with Inco. Tap Retry decrypt.");
        setBanner("Could not decrypt your holes with Inco. Tap Retry decrypt.");
        setLog("Inco decrypt failed — retry to show your cards.");
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
      if (!holdDealRef.current) setBoardCards([]);
    }
  }, [address, publicClient, tableId, walletClient]);

  useEffect(() => {
    refresh();
    const waitingFriend =
      modeHint === "friend" &&
      table?.player1 === "0x0000000000000000000000000000000000000000";
    const ms = botThinking ? 700 : modeHint === "bot" ? 1200 : waitingFriend ? 1500 : 2800;
    const id = setInterval(refresh, ms);
    return () => clearInterval(id);
  }, [refresh, modeHint, botThinking, table?.player1]);

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
  const botActGen = useRef(0);
  const autoShowdownKey = useRef<string>("");
  const prevHandLive = useRef(false);
  const [botRetryTick, setBotRetryTick] = useState(0);

  // River Bot auto-act — never leave botActing stuck after cancel/remount
  useEffect(() => {
    if (!botAddress || toActKey !== botAddress.toLowerCase()) {
      setBotThinking(false);
      botActing.current = false;
      return;
    }

    if (!vsBot || !handLive || stage < 1 || stage > 4) {
      setBotThinking(false);
      botActing.current = false;
      return;
    }
    if (botActing.current) return;

    const gen = ++botActGen.current;
    botActing.current = true;
    setBotThinking(true);
    setLog(botLevel >= 3 ? "River Bot snaps back…" : "River Bot is acting…");

    void (async () => {
      let failed = false;
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
        if (gen !== botActGen.current) return;
        const data = (await res.json()) as { action?: string; skipped?: boolean; error?: string };
        if (!res.ok) {
          failed = true;
          setLog(data.error || "Bot missed that beat — retrying…");
          setBanner(data.error || "Bot missed that beat — retrying…");
        } else if (data.skipped) {
          setLog("Waiting on the table…");
          failed = true;
        } else {
          sound.playChip();
          if (data.action === "raise") setLog(pickLine(BOT_LINES.raise));
          else if (data.action === "fold") {
            setLog(pickLine(BOT_LINES.fold));
            pauseAutoDeal(7000);
            const shown = await revealBotHoles();
            await new Promise((r) => window.setTimeout(r, 900));
            if (!awardedHand.current) {
              const gained = awardMegapotWin();
              awardedHand.current = true;
              const chips = scoreFromStacks(handStartStack.current, me?.stack ?? null);
              recordHandResult(true, chips, "River Bot", "Opponent folded");
              setBanner(`River Bot folds — you take the pot. +${gained} ticket.`);
              celebrateHand(true, "Opponent folds", `+${chips.toLocaleString()} chips`, gained, shown);
              handStartStack.current = null;
            } else {
              setBanner("River Bot folds — pot is yours.");
              celebrateHand(true, "Opponent folds", "Deal again when ready", 0, shown);
            }
          } else if (data.action === "check") setLog(pickLine(BOT_LINES.check));
          else setLog(pickLine(BOT_LINES.call));
        }
        if (gen === botActGen.current) await refresh();
      } catch {
        failed = true;
        if (gen === botActGen.current) {
          setLog("Bot hiccup. Retrying…");
          setBanner("Bot hiccup — retrying in a moment.");
        }
      } finally {
        if (gen === botActGen.current) {
          setBotThinking(false);
          botActing.current = false;
          if (failed) {
            window.setTimeout(() => {
              setBotRetryTick((n) => n + 1);
            }, 1600);
          }
        }
      }
    })();

    // Watchdog: unlock + bump retry so the effect re-fires act
    const watchdog = window.setTimeout(() => {
      if (botActGen.current === gen && botActing.current) {
        botActing.current = false;
        setBotThinking(false);
        setLog("Bot stalled — retrying…");
        void refresh();
        setBotRetryTick((n) => n + 1);
      }
    }, 18000);

    return () => {
      window.clearTimeout(watchdog);
      if (botActGen.current === gen) {
        botActGen.current += 1;
        botActing.current = false;
        setBotThinking(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsBot, botAddress, toActKey, handLive, stage, tableId, botRetryTick]);

  // Vs bot: auto settle at showdown so Check/Call/Raise hands finish.
  // Must re-run when `acting` clears — river Call often sets stage=5 while acting is still true.
  useEffect(() => {
    if (!vsBot || !table?.handLive || table.stage !== 5) return;
    if (acting || showdownBusy.current) return;
    const key = `${tableId.toString()}:${table.stage}:${table.pot.toString()}`;
    if (autoShowdownKey.current === key) return;
    autoShowdownKey.current = key;
    setLog("Showdown — settling the pot…");
    const t = window.setTimeout(() => {
      void runShowdown();
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsBot, table?.stage, table?.handLive, table?.pot, tableId, acting]);

  // Keep raise-to above the live bet so Raise doesn't silently revert
  useEffect(() => {
    if (!table?.handLive || table.stage < 1 || table.stage > 4) return;
    const minRaise = table.buyIn > 0n ? table.buyIn / 5n : 3n * 10n ** 12n;
    const floor = (table.currentBet > 0n ? table.currentBet : 0n) + (minRaise > 0n ? minRaise : 10n ** 12n);
    try {
      const current = parseEther(raiseToEth || "0");
      if (current <= table.currentBet) {
        const eth = Number(floor) / 1e18;
        setRaiseToEth(eth.toFixed(6).replace(/\.?0+$/, "") || "0.000015");
      }
    } catch {
      // ignore bad input while typing
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.currentBet, table?.handLive, table?.stage, table?.buyIn]);

  // Auto-deal next hand vs bot — never while win/lose overlay is open
  useEffect(() => {
    if (!vsBot || !table || dealBusy.current || holdDeal || holdDealRef.current) return;
    if (handFxOpenRef.current || handFx) return;
    if (table.handLive || (table.stage !== 6 && table.stage !== 0)) return;
    if (table.player1 === "0x0000000000000000000000000000000000000000") return;
    // Need at least ~4 BB each so the next hand can post blinds.
    if (table.stack0 < 10000000000000n || table.stack1 < 10000000000000n) return;

    let cancelled = false;
    dealBusy.current = true;
    setLog("Dealing the next hand…");
    const timer = window.setTimeout(async () => {
      if (cancelled || handFxOpenRef.current) {
        dealBusy.current = false;
        return;
      }
      try {
        await fundTableShuffleFee(undefined, 0n);
        if (cancelled || handFxOpenRef.current) {
          dealBusy.current = false;
          return;
        }
        const res = await fetch("/api/bot/deal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId: tableId.toString() }),
        });
        if (cancelled) return;
        const text = await res.text();
        let data: { skipped?: boolean; error?: string; code?: string; shortfallEth?: string } = {};
        try {
          data = text.trim() ? (JSON.parse(text) as typeof data) : {};
        } catch {
          data = { error: "Could not deal. Tap Deal next hand." };
        }
        if (!res.ok && data.code === "NEEDS_FEE_FUND") {
          await fundTableShuffleFee(data.shortfallEth, 0n);
          if (!cancelled && !handFxOpenRef.current) {
            const retry = await fetch("/api/bot/deal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tableId: tableId.toString() }),
            });
            const retryText = await retry.text();
            if (retry.ok) {
              sound.playCardSlide();
              setBanner(null);
              setOppCards([]);
              setLog("Cards are flying. Private holes locked.");
              await refresh();
              return;
            }
          }
        }
        if (!res.ok) {
          // Don't stomp the win/lose message if overlay somehow still open
          if (!handFxOpenRef.current) {
            setLog(data.error || "Could not deal. Tap Deal next hand.");
            setBanner(data.error || "Could not deal. Tap Deal next hand.");
          }
        } else if (!data.skipped) {
          sound.playCardSlide();
          setBanner(null);
          setOppCards([]);
          setLog("Cards are flying. Private holes locked.");
        }
        if (!cancelled) await refresh();
      } catch {
        if (!cancelled && !handFxOpenRef.current) setLog("Deal stalled. Tap Deal next hand.");
      } finally {
        if (!cancelled) dealBusy.current = false;
      }
    }, 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      dealBusy.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsBot, table, tableId, refresh, holdDeal, handFx]);

  // Rising edge of handLive = new hand → always reset scoring refs (fixes auto-deal after folds)
  useEffect(() => {
    if (!table || !me) return;
    const live = Boolean(table.handLive);
    if (live && !prevHandLive.current) {
      handStartStack.current = me.stack;
      awardedHand.current = false;
    }
    prevHandLive.current = live;
  }, [table?.handLive, me?.stack, table, me]);

  // Friend (or bot) fold-win when opponent folds and hand settles
  useEffect(() => {
    if (!table || !me || !opponent) return;
    if (awardedHand.current) return;
    if (table.stage !== 6 || table.handLive) return;
    if (!opponent.folded || me.folded) return;

    awardedHand.current = true;
    const chips = scoreFromStacks(handStartStack.current, me.stack);
    const oppName = vsBot ? "River Bot" : "Friend";
    const gained = awardMegapotWin();
    recordHandResult(true, chips, oppName, "Opponent folded");
    setBanner(`${oppName} folds — you take the pot. +${gained} ticket.`);
    setLog("Hand over. Opponent folded.");
    celebrateHand(true, "Opponent folds", `+${chips.toLocaleString()} chips`, gained);
    pauseAutoDeal();
    if (vsBot) void revealBotHoles();
    handStartStack.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.stage, table?.handLive, opponent?.folded, me?.folded, me?.stack]);

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
    setBanner(null);
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
        const loss = foldLossChips();
        recordHandResult(false, -loss, oppName, "You folded");
        setBanner(
          vsBot
            ? `You folded — pot goes to River Bot (−${loss} chips).`
            : `You folded — pot goes to your opponent (−${loss} chips).`,
        );
        setLog("Hand over. You folded.");
        let shown: DecodedCard[] = [];
        if (vsBot) {
          pauseAutoDeal(7000);
          shown = await revealBotHoles();
          await new Promise((r) => window.setTimeout(r, 900));
        }
        celebrateHand(false, "You folded", `−${loss} chips`, 0, shown);
      }
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed.";
      const friendly =
        /not your turn|toAct/i.test(msg)
          ? "Not your turn yet — wait for River Bot."
          : /user rejected|denied/i.test(msg)
            ? "Action cancelled."
            : msg.length > 120
              ? "Could not Check/Call. Tap again."
              : msg;
      setBanner(friendly);
      setLog(friendly);
    } finally {
      setActing(false);
    }
  }

  async function raise() {
    sound.playClick();
    setActing(true);
    setBanner(null);
    setLog("Raising…");
    try {
      if (!table) throw new Error("Table still loading.");
      let total: bigint;
      try {
        total = parseEther(raiseToEth || "0");
      } catch {
        throw new Error("Enter a valid raise amount.");
      }
      const minRaise = table.buyIn > 0n ? table.buyIn / 5n : 3n * 10n ** 12n;
      const floor = table.currentBet + (minRaise > 0n ? minRaise : 10n ** 12n);
      if (total <= table.currentBet) {
        total = floor;
        const eth = Number(floor) / 1e18;
        setRaiseToEth(eth.toFixed(6).replace(/\.?0+$/, "") || "0.000015");
      }
      const hash = await writeFn({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "raiseTo",
        args: [tableId, total],
      });
      await waitTx(hash);
      sound.playChip();
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Raise failed.";
      const friendly =
        /\braise\b/i.test(msg)
          ? "Raise must be higher than the current bet. Try Min / 2× / Pot."
          : /not your turn|toAct/i.test(msg)
            ? "Not your turn yet — wait for River Bot."
            : /user rejected|denied/i.test(msg)
              ? "Raise cancelled."
              : msg.length > 120
                ? "Could not raise. Tap Min, then Raise again."
                : msg;
      setBanner(friendly);
      setLog(friendly);
    } finally {
      setActing(false);
    }
  }

  async function fundTableShuffleFee(
    shortfallEth?: string,
    /** Buy-in only counts for joinTable. Deal next hand must pass 0n. */
    incomingBuyIn: bigint = 0n
  ) {
    if (!silent || !play.address || !publicClient || !RIVER_HOLDEM_ADDRESS) return false;
    try {
      setLog("Warming up the table…");
      let need =
        shortfallEth && Number(shortfallEth) > 0
          ? parseEther(shortfallEth)
          : 0n;
      if (need === 0n) {
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
        const projected = contractBal + incomingBuyIn;
        const target = fee + parseEther("0.000005");
        need = projected >= target ? 0n : target - projected;
      }
      if (need === 0n) return true;

      const gasKeep = parseEther("0.00001");
      let bal = await publicClient.getBalance({ address: play.address });
      if (bal <= need + gasKeep) {
        try {
          // Top play wallet so it can fundFees itself
          await play.ensureFunded(need + gasKeep > PLAY_MIN ? need + gasKeep : PLAY_MIN);
        } catch {
          // still try with whatever we have
        }
      }
      bal = await publicClient.getBalance({ address: play.address });
      if (bal <= need + gasKeep) return false;

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
    setLog("Seating River Bot…");
    setBanner(null);
    try {
      // Skip wake on first attempt when lobby already warmed the house
      const skipWake = search.get("seated") === "1";
      if (!skipWake) {
        await fetch("/api/bot/wake", { method: "POST" }).catch(() => null);
      }

      let lastError = "Could not seat opponent yet.";
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
          setLog(`Seating… (${attempt + 1}/4)`);
          await new Promise((r) => window.setTimeout(r, 280 * attempt));
          await fetch("/api/bot/wake", { method: "POST" }).catch(() => null);
        }

        await fundTableShuffleFee(undefined, table?.buyIn ?? parseEther("0.000015"));

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

        if (silent && play.walletClient?.account && opponent) {
          try {
            const bal = await publicClient!.getBalance({ address: play.address! });
            const botBal = await publicClient!.getBalance({
              address: opponent as `0x${string}`,
            });
            const need = parseEther("0.000025");
            if (botBal < need && bal > need + parseEther("0.00002")) {
              setLog("Warming opponent seat…");
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
            // continue
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

        if (res.ok) {
          sound.playMatch();
          setBanner("Match found — cards dealing!");
          setLog("Cards dealing…");
          await refresh();
          return;
        }

        if (data.code === "NEEDS_FEE_FUND") {
          const funded = await fundTableShuffleFee(data.shortfallEth);
          if (funded) {
            const retry = await fetch("/api/bot/join", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tableId: tableId.toString() }),
            });
            if (retry.ok) {
              sound.playMatch();
              setBanner("Match found — cards dealing!");
              setLog("Cards dealing…");
              await refresh();
              return;
            }
            const retryData = (await retry.json()) as { error?: string };
            lastError = retryData.error || lastError;
            continue;
          }
        }

        lastError = data.error || lastError;
      }

      setLog(lastError);
      setBanner(`${lastError} Tap Match now.`);
    } catch {
      setLog("Could not reach opponent. Try again.");
    } finally {
      setSeatingBot(false);
    }
  }

  // Instant auto-match for vs bot — skip if lobby already seated the bot
  useEffect(() => {
    if (modeHint !== "bot") return;
    if (!table) return;
    if (table.player1 !== "0x0000000000000000000000000000000000000000") return;
    if (seatingBot) return;
    if (search.get("seated") === "1") {
      // Lobby already joined — short poll only; seatBot if still empty after 1.2s
      const t = window.setTimeout(() => {
        if (table.player1 === "0x0000000000000000000000000000000000000000") {
          void seatBot();
        }
      }, 1200);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      void seatBot();
    }, 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeHint, table?.player1, seatingBot]);

  useEffect(() => {
    if (modeHint === "friend") {
      pushRecentChallenge(tableId.toString(), "host");
    }
  }, [modeHint, tableId]);

  async function copyTableId() {
    try {
      await navigator.clipboard.writeText(tableId.toString());
      setCopied("id");
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setLog(`Share this table #: ${tableId.toString()}`);
    }
  }

  async function shareInvite() {
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/?join=${tableId.toString()}`
        : `/?join=${tableId.toString()}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "pi River Challenge",
          text: `Join my heads-up table #${tableId.toString()} on pi River`,
          url: link,
        });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied("link");
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      try {
        await navigator.clipboard.writeText(link);
        setCopied("link");
        window.setTimeout(() => setCopied(null), 1800);
      } catch {
        setLog(`Invite link: ${link}`);
      }
    }
  }

  async function startHand() {
    sound.playClick();
    clearSettlementHold();
    setActing(true);
    setBanner(null);
    setLog("Dealing private cards…");
    try {
      // Real Hold’em: can't post blinds with an empty stack
      const minStack = 10n * 10n ** 12n;
      if (me && me.stack < minStack) {
        setBanner("You're out of chips at this table. Tap New game for a fresh seat.");
        setLog("Stack empty — start a new Quick Play.");
        return;
      }
      if (opponent && opponent.stack < minStack) {
        setBanner("Opponent is out of chips. Tap New game for a fresh table.");
        setLog("Opponent stack empty — start a new match.");
        return;
      }
      if (vsBot) {
        // Deal does NOT add buy-in — fund the true shortfall (0 incoming)
        await fundTableShuffleFee(undefined, 0n);

        const tryDeal = async () => {
          const res = await fetch("/api/bot/deal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableId: tableId.toString() }),
          });
          const data = (await res.json()) as {
            error?: string;
            skipped?: boolean;
            code?: string;
            shortfallEth?: string;
          };
          return { res, data };
        };

        let { res, data } = await tryDeal();

        if (!res.ok && data.code === "NEEDS_FEE_FUND") {
          setLog("Topping up table fees…");
          const funded = await fundTableShuffleFee(data.shortfallEth, 0n);
          if (funded) {
            ({ res, data } = await tryDeal());
          }
        }

        if (!res.ok) {
          // Last resort: fund fees from your seat, then start the hand yourself
          setLog("Finishing table top-up…");
          await fundTableShuffleFee(data.shortfallEth, 0n);
          try {
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
            setHandFx(null);
            sound.playCardSlide();
            setBanner(null);
            setLog("Cards are flying. Private holes locked.");
            await refresh();
            return;
          } catch {
            ({ res, data } = await tryDeal());
          }
        }

        if (!res.ok) {
          setLog(data.error || "Could not deal. Tap Deal next hand.");
          setBanner(data.error || "Could not deal. Tap again.");
          return;
        }
        if (!data.skipped) sound.playCardSlide();
        awardedHand.current = false;
        setRevealOpen(false);
        setHandFx(null);
        setLog("Cards are flying. Private holes locked.");
        await refresh();
        return;
      }

      await fundTableShuffleFee(undefined, 0n);
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
      setHandFx(null);
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
    if (!publicClient || !address || !table) {
      setBanner("Seat still loading. Tap Refresh, then try again.");
      setLog("Waiting for your seat…");
      return;
    }
    if (showdownBusy.current) return;
    showdownBusy.current = true;
    setActing(true);
    setBanner(null);
    try {
      setRevealOpen(true);
      setLog("Showdown: proving private cards…");

      const peekWallet = walletClient ?? play.walletClient;
      if (!peekWallet) {
        setBanner("Play seat wallet missing. Refresh and sign in with Google again.");
        setLog("Could not open private cards.");
        return;
      }

      if (silent) {
        try {
          setLog("Checking play seat gas…");
          // Do not scan historical tables during showdown. That recovery path
          // can keep the UI on "Checking play seat gas" for a long time.
          await play.ensureFunded(undefined, { reclaim: false });
        } catch (err) {
          throw new Error(
            err instanceof Error ? err.message : "Need a little more ETH for showdown gas."
          );
        }
      }

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
          : cached ?? (await peekMyCards(peekWallet, [myHandles[0], myHandles[1]]));
      holePeekRef.current = myPeek;
      setMyCards(myPeek.map((p) => decodeCard(p.value)));
      sound.playCardSlide();

      const mySlots = isP0 ? [0, 1] : [2, 3];

      async function submitMyHoles() {
        for (let i = 0; i < 2; i++) {
          setLog(`Submitting your card ${i + 1}/2…`);
          const hash = await writeFn({
            address: RIVER_HOLDEM_ADDRESS,
            abi: riverHoldemAbi,
            functionName: "submitShowdownCard",
            args: [tableId, mySlots[i], myPeek[i].value, myPeek[i].sigs],
          });
          await waitTx(hash);
        }
        // Board slots come from this client: its attestedReveal works, while the
        // bot's server-side attestedReveal is rate-limited from Vercel's egress.
        setLog("Submitting board cards…");
        const [outs, count] = (await publicClient!.readContract({
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
      }

      async function submitBotSide(): Promise<{
        values?: Array<number | string>;
      }> {
        if (!vsBot) {
          // Board is handled by submitMyHoles; friend path needs nothing more.
          return {};
        }

        setLog("River Bot is showing cards…");
        let botData: {
          error?: string;
          reason?: string;
          skipped?: boolean;
          values?: Array<number | string>;
        } | null = null;
        let botOk = false;
        for (let attempt = 0; attempt < 2 && !botOk; attempt++) {
          if (attempt > 0) {
            setLog("Retrying River Bot showdown…");
            await new Promise((r) => window.setTimeout(r, 400));
          }
          const botRes = await fetch("/api/bot/showdown", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableId: tableId.toString() }),
          });
          const text = await botRes.text();
          try {
            botData = text.trim() ? (JSON.parse(text) as typeof botData) : null;
          } catch {
            botData = { error: `Bot showdown bad response (${botRes.status})` };
          }
          botOk = botRes.ok && !botData?.skipped;
        }
        if (!botOk || !botData) {
          throw new Error(botData?.error || botData?.reason || "Bot could not show cards.");
        }
        if (botData.values && botData.values.length >= 2) {
          setOppCards(botData.values.slice(0, 2).map((v) => decodeCard(BigInt(v))));
          sound.playCardSlide();
        }
        return botData;
      }

      // Keep the Inco calls sequential. Running the browser's attested decrypt,
      // board reveal, and Vercel's bot reveal together can rate-limit the same
      // covalidator request and leave the UI stuck on Settling. Reveal the bot
      // first so its cards are painted as soon as the server returns, then
      // submit this player's proof and the public board.
      const botSide = vsBot ? await submitBotSide() : {};
      await submitMyHoles();
      const shownBotCards =
        botSide.values && botSide.values.length >= 2
          ? botSide.values.slice(0, 2).map((v) => decodeCard(BigInt(v)))
          : [];
      if (vsBot && shownBotCards.length < 2) {
        pauseAutoDeal(8000);
        await revealBotHoles();
      }
      pauseAutoDeal(8000);

      await refresh();

      if (vsBot) {
        setLog("Settling the pot…");
        await finalizeShowdownSettle(shownBotCards);
        setRevealOpen(false);
        return;
      }

      setLog("Cards in. Tap Finalize to pay the winner.");
      setBanner("Almost done — tap Finalize to settle the pot.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Showdown failed.";
      const friendly = friendlyShowdownError(msg);
      setLog(friendly);
      setBanner(friendly);
      autoShowdownKey.current = "";
    } finally {
      showdownBusy.current = false;
      setActing(false);
    }
  }

  async function finalizeShowdownSettle(shownOppOverride: DecodedCard[] = []) {
    const before = handStartStack.current;
    const hash = await writeFn({
      address: RIVER_HOLDEM_ADDRESS,
      abi: riverHoldemAbi,
      functionName: "finalizeShowdown",
      args: [tableId],
    });
    await waitTx(hash);

    // The bot cards were already revealed before finalization. Do not call the
    // slow peek endpoint again here, or Win/Lose waits on a redundant request.
    const shownOpp = shownOppOverride;
    await refresh();

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
      const chips = scoreFromStacks(before, after);
      if (after > before) {
        const gained = awardMegapotWin({ showdown: true });
        recordHandResult(true, chips, vsBot ? "River Bot" : "Friend", "Showdown win");
        setBanner(`You won the showdown. +${gained} ticket.`);
        setLog("You won this hand.");
        celebrateHand(true, "Showdown win", `+${chips.toLocaleString()} chips`, gained, shownOpp);
      } else if (after < before) {
        recordHandResult(false, -chips, vsBot ? "River Bot" : "Friend", "Showdown loss");
        setBanner("You lost this hand.");
        setLog("You lost this hand.");
        celebrateHand(false, "Showdown loss", `−${chips.toLocaleString()} chips this pot`, 0, shownOpp);
      } else {
        // Chop still counts as a hand for win-rate volume (0 delta, streak unchanged).
        recordHandResult(false, 0, vsBot ? "River Bot" : "Friend", "Showdown chop");
        setBanner("Chop / no change. Deal again.");
        setLog("Stacks unchanged.");
      }
      handStartStack.current = null;
    } else if (!awardedHand.current) {
      setBanner("Hand settled. Tap Deal next hand.");
    }
  }

  async function finalize() {
    setActing(true);
    setBanner(null);
    setLog("Paying the winner…");
    try {
      await finalizeShowdownSettle();
      setRevealOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not finalize.";
      const friendly =
        /submit|card|showdown/i.test(msg)
          ? "Tap Showdown first so all cards are submitted, then Finalize."
          : msg.length > 140
            ? "Could not settle pot. Tap Finalize again."
            : msg;
      setBanner(friendly);
      setLog(friendly);
    } finally {
      setActing(false);
    }
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
    : opponent?.addr
      ? seatProfiles[opponent.addr.toLowerCase()]?.name || shortAddr(opponent.addr)
      : shortAddr(table?.player1);

  const opponentSeat = opponent?.addr
    ? seatProfiles[opponent.addr.toLowerCase()]
    : undefined;

  const STREET_STEPS = ["Preflop", "Flop", "Turn", "River", "Showdown"] as const;
  // Never paint Settled (fold) as Showdown — pros notice instantly.
  const streetIndex = (() => {
    if (!table) return 0;
    if (table.stage === 5) return 4; // live showdown only (always 5 board cards)
    if (table.stage === 6) {
      // Hand over: highlight last street that was dealt
      if (table.boardCount >= 5) return 3;
      if (table.boardCount === 4) return 2;
      if (table.boardCount === 3) return 1;
      return 0;
    }
    if (table.stage >= 1 && table.stage <= 4) return table.stage - 1;
    return 0;
  })();
  const handSettled = table?.stage === 6 && !table.handLive;
  const showdownLive = table?.stage === 5;

  return (
    <div
      className={cn(
        "animate-fade-in mx-auto flex w-full flex-col gap-3 pb-4 transition-[max-width] duration-300",
        wideView ? "max-w-6xl" : "max-w-lg sm:max-w-3xl"
      )}
    >
      <HandResultOverlay
        open={Boolean(handFx)}
        win={handFx?.win ?? false}
        title={handFx?.title ?? ""}
        subtitle={handFx?.subtitle}
        oppCards={handFx?.oppShow}
        ticketGained={handFx?.ticketGained ?? 0}
        claiming={claimingTicket}
        claimError={claimTicketError}
        onClaimTicket={
          handFx?.win && (handFx.ticketGained ?? 0) > 0 && play.address
            ? () => void claimTicketFromOverlay()
            : undefined
        }
        onContinue={() => {
          handFxOpenRef.current = false;
          setHandFx(null);
          setClaimTicketError(null);
        }}
        onHome={() => {
          handFxOpenRef.current = false;
          setHandFx(null);
          clearActiveTable();
          router.push("/");
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7d8398]">
            {vsBot ? `Quick Play · Bot Lv.${botLevel}` : "Friend table"}
          </p>
          <h1 className="text-xl font-black text-white sm:text-2xl">Table #{tableId.toString()}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#86efac]/35 bg-[#86efac]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#86efac]">
              <LockIncoIcon className="h-3.5 w-3.5" />
              Inco · encrypted holes
            </span>
            <PlayerLevelBadge xp={xp} wins={stats.gamesWon} compact />
            <Link
              href="/"
              onClick={() => clearActiveTable()}
              className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4] hover:border-[#F5C518]/30 hover:text-[#F5C518]"
            >
              New game
            </Link>
          </div>
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
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-bold",
                handSettled
                  ? "border-white/15 bg-white/5 text-[#9AA0B4]"
                  : showdownLive
                    ? "border-[#F5C518]/40 bg-[#F5C518]/15 text-[#F5C518]"
                    : "border-[#F5C518]/30 bg-[#F5C518]/10 text-[#F5C518]",
              )}
            >
              {table
                ? handSettled
                  ? `Hand over · ${
                      table.boardCount >= 5
                        ? "River"
                        : table.boardCount === 4
                          ? "Turn"
                          : table.boardCount === 3
                            ? "Flop"
                            : "Preflop"
                    }`
                  : STAGE_LABELS[table.stage]
                : "…"}
            </span>
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-[#9AA0B4]"
            >
              Refresh
            </button>
          </div>
          <p className="max-w-[15rem] text-right text-[10px] font-bold leading-snug text-[#9dceb4]">
            {megapotCredits > 0 ? (
              <>
                <span className="text-[#F5C518]">
                  {megapotCredits} Megapot ticket{megapotCredits === 1 ? "" : "s"} ready
                </span>
                {poolUsdc
                  ? ` · pool $${Number(poolUsdc).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : ""}
                {" · "}
                <Link href="/rewards" className="underline underline-offset-2 hover:text-[#F5C518]">
                  Claim
                </Link>
              </>
            ) : (
              <>
                Win → Megapot tickets
                {poolUsdc
                  ? ` · $${Number(poolUsdc).toLocaleString(undefined, { maximumFractionDigits: 0 })} pool`
                  : ""}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Compact street rail */}
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-sm">
        {STREET_STEPS.map((label, i) => {
          const isShowdownStep = i === 4;
          const active = isShowdownStep ? Boolean(showdownLive) : i === streetIndex;
          const passed = isShowdownStep ? false : i < streetIndex;
          return (
            <div
              key={label}
              className={cn(
                "flex-1 rounded-full px-1 py-1.5 text-center text-[9px] font-black uppercase tracking-wide transition sm:text-[10px]",
                active
                  ? "bg-gradient-to-b from-[#F5C518] to-[#E29A12] text-[#1A1400] shadow-[0_6px_16px_rgba(245,197,24,0.35)]"
                  : passed
                    ? "text-[#3ECF8E]"
                    : "text-[#7d8398]",
              )}
            >
              {label}
            </div>
          );
        })}
      </div>
      {handSettled ? (
        <p className="text-center text-[11px] font-semibold text-[#9AA0B4]">
          Hand settled. Deal when ready.
        </p>
      ) : null}

      {waitingForOpponent ? (
        <div
          className={cn(
            "space-y-3 rounded-[28px] border p-5",
            modeHint === "bot"
              ? "animate-match-pulse border-[#F5C518]/35 bg-gradient-to-b from-[#2a2210] to-[#161322]"
              : "border-[#F5C518]/25 bg-gradient-to-b from-[#1a2418] to-[#161322]"
          )}
        >
          <p className="text-center text-sm font-black text-white">
            {modeHint === "bot"
              ? seatingBot
                ? "Seating River Bot…"
                : "Almost ready"
              : "Challenge open"}
          </p>
          <p className="text-center text-xs leading-relaxed text-[#9AA0B4]">
            {modeHint === "bot"
              ? "No lobby wait — River Bot sits as soon as the chain confirms."
              : `Table #${tableId.toString()} is live. Send the invite link — friend taps Join.`}
          </p>
          {modeHint === "friend" ? (
            <p className="rounded-2xl border border-[#F5C518]/20 bg-black/30 px-3 py-2 text-center font-mono text-lg font-black tabular-nums text-[#F5C518]">
              #{tableId.toString()}
            </p>
          ) : null}
          <div className={`grid gap-2 ${modeHint === "bot" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
            {modeHint === "bot" ? (
              <GradientButton
                className="min-h-11"
                disabled={seatingBot || isPending}
                onClick={seatBot}
                icon={<BoltIcon className="h-4 w-4" />}
              >
                {seatingBot ? "Seating…" : "Seat bot now"}
              </GradientButton>
            ) : (
              <GradientButton className="min-h-11" onClick={shareInvite} icon={<BoltIcon className="h-4 w-4" />}>
                {copied === "link" ? "Link copied!" : "Share invite link"}
              </GradientButton>
            )}
            <GradientButton variant="secondary" className="min-h-11" onClick={copyTableId}>
              {copied === "id" ? "Copied!" : "Copy table #"}
            </GradientButton>
          </div>
        </div>
      ) : null}

      {banner ? (
        <div
          className={cn(
            "animate-fade-in rounded-2xl border px-4 py-2.5 text-center text-sm font-black",
            /won|ticket/i.test(banner)
              ? "border-[#3ECF8E]/45 bg-[#3ECF8E]/12 text-[#3ECF8E]"
              : /lost|folded/i.test(banner)
                ? "border-[#FA7185]/45 bg-[#FA7185]/12 text-[#FA7185]"
                : "border-[#F5C518]/40 bg-gradient-to-r from-[#F5C518]/20 to-[#E29A12]/10 text-[#F5C518]"
          )}
        >
          {banner}
        </div>
      ) : null}

      {/* Premium gold-rail table — actions live on the felt */}
      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden rounded-[40px] p-[9px] shadow-[0_28px_80px_rgba(0,0,0,0.55)]",
          wideView ? "max-w-3xl" : "max-w-lg"
        )}
        style={{
          background:
            "linear-gradient(145deg, #ffe9a3 0%, #e0b43a 22%, #a67c1a 55%, #6b4e0e 78%, #f0d878 100%)",
        }}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-[32px] border border-black/20",
            wideView ? "min-h-[540px] px-6 pb-6 pt-5 sm:px-14" : "min-h-[520px] px-3 pb-5 pt-4 sm:px-5"
          )}
          style={{
            background: feltStyle.felt,
            boxShadow:
              "inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -50px 90px rgba(0,0,0,0.4), inset 0 0 80px rgba(0,0,0,0.25)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 20%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 70% 70%, #fff 0 1px, transparent 1.5px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[18%] rounded-[40%] border border-white/10 opacity-40"
          />
          <RailLeds />

          {/* Opponent */}
          <div className="relative mb-2 flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-lg backdrop-blur-sm",
                botThinking
                  ? "border-emerald-400/50 bg-emerald-500/20 animate-pulse-soft"
                  : "border-white/15 bg-black/40"
              )}
            >
              {isBotOpponent ? (
                <BotAvatar size={34} thinking={botThinking} />
              ) : (
                <PublicPlayerAvatar
                  size={30}
                  displayName={opponentLabel}
                  avatarUrl={opponentSeat?.avatarUrl}
                  avatarId={opponentSeat?.avatarId || "felt-core"}
                  usePresetAvatar={
                    Boolean(opponentSeat?.usePresetAvatar) || !opponentSeat?.avatarUrl
                  }
                  equippedFrame={opponentSeat?.equippedFrame || "none"}
                />
              )}
              <div className="text-left">
                <p className="text-[11px] font-black uppercase tracking-wide text-white">{opponentLabel}</p>
                <p className="font-mono text-[10px] text-[#c8ecd8]">
                  {opponent ? formatStack(opponent.stack) : "-"}
                  {opponent?.bet && opponent.bet > 0n ? ` · bet ${formatStack(opponent.bet)}` : ""}
                  {opponent?.folded ? " · fold" : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 opacity-90">
              {oppCards.length === 2 ? (
                oppCards.map((c, i) => (
                  <CardFace
                    key={`opp-${c.id}-${i}`}
                    card={c}
                    compact
                    shine
                    tilt={i === 0 ? -6 : 6}
                  />
                ))
              ) : (
                <>
                  <CardBack compact mark={cardStyle.mark} accent={cardStyle.accent} pattern={cardStyle.pattern} />
                  <CardBack compact mark={cardStyle.mark} accent={cardStyle.accent} pattern={cardStyle.pattern} />
                </>
              )}
            </div>
            {oppCards.length === 2 ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#F5C518]/90">
                Bot shows
              </p>
            ) : null}
          </div>

          {/* Board + pot */}
          <div className="relative mb-3 flex flex-col items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-[#F5C518]/45 bg-gradient-to-b from-[#3a2d0a]/95 to-black/55 py-1.5 pl-2 pr-5 shadow-[0_10px_28px_rgba(0,0,0,0.4)]">
              <span className="-ml-1 flex items-end">
                <PremiumChip size={28} tone="gold" className="-mr-2" />
                <PremiumChip size={26} tone="red" className="-mr-2 translate-y-0.5" />
                <PremiumChip size={24} tone="green" />
              </span>
              <span className="font-mono text-xs font-black text-[#F5C518]">
                Pot {table ? formatStack(table.pot) : "0"}
              </span>
            </div>
            <div className="flex min-h-[92px] items-center justify-center gap-1.5 sm:gap-2">
              {boardCards.length
                ? boardCards.map((c, i) => (
                    <CardFace
                      key={c.id + c.label}
                      card={c}
                      tilt={boardCards.length > 1 ? (i - (boardCards.length - 1) / 2) * 3 : 0}
                    />
                  ))
                : table?.boardCount
                  ? Array.from({ length: table.boardCount }).map((_, i) => (
                      <CardBack key={i} mark={cardStyle.mark} accent={cardStyle.accent} pattern={cardStyle.pattern} />
                    ))
                  : (
                    <p className="max-w-[14rem] text-center text-xs font-semibold leading-snug text-white/50">
                      {myTurn
                        ? "Hole cards only · act to open the flop"
                        : table?.stage === 1
                          ? "Preflop betting…"
                          : "Board dealing…"}
                    </p>
                  )}
            </div>
          </div>

          {/* Hero hole cards */}
          <div className="relative mb-3 flex flex-col items-center gap-2">
            <div className="flex items-end gap-1">
              {myCards.length === 2 ? (
                myCards.map((c, i) => (
                  <CardFace
                    key={c.id}
                    card={c}
                    shine={revealOpen || table?.stage === 5}
                    tilt={i === 0 ? -8 : 8}
                  />
                ))
              ) : (
                <>
                  <span className="-rotate-6">
                    <CardBack mark={cardStyle.mark} accent={cardStyle.accent} pattern={cardStyle.pattern} />
                  </span>
                  <span className="rotate-6">
                    <CardBack mark={cardStyle.mark} accent={cardStyle.accent} pattern={cardStyle.pattern} />
                  </span>
                </>
              )}
            </div>
            {table?.handLive ? (
              <p className="max-w-[16rem] text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#9dceb4]/95">
                {myCards.length === 2
                  ? table.stage === 5
                    ? "Showdown · cards revealed with Inco"
                    : "Only you can decrypt these holes"
                  : peekError
                    ? "Inco decrypt needs a retry"
                    : "Sealed with Inco Lightning"}
              </p>
            ) : null}
            {table?.handLive && myCards.length < 2 && peekError ? (
              <button
                type="button"
                disabled={peekRetryBusy || acting}
                onClick={() => void retryDecryptHoles()}
                className="rounded-full border border-[#F5C518]/50 bg-[#F5C518]/15 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#F5C518] disabled:opacity-50"
              >
                {peekRetryBusy ? "Decrypting…" : "Retry decrypt"}
              </button>
            ) : null}
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-lg",
                myTurn && !botThinking
                  ? "border-[#F5C518]/60 bg-[#F5C518]/20 shadow-[0_0_24px_rgba(245,197,24,0.35)]"
                  : "border-white/15 bg-black/40"
              )}
            >
              <PlayerAvatar className="rounded-full" size={30} />
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-white">{displayName}</p>
                <p className="font-mono text-[10px] text-[#c8ecd8]">
                  {me ? formatStack(me.stack) : "-"}
                  {me?.bet && me.bet > 0n ? ` · bet ${formatStack(me.bet)}` : ""}
                  {myTurn ? " · YOUR TURN" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* On-felt action pad — Fold / Check / Raise like premium poker apps */}
          {!waitingForOpponent ? (
            <div className="relative mt-auto space-y-2 rounded-[26px] border border-white/15 bg-black/45 p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
              {bothSeated && table && !table.handLive ? (
                <button
                  type="button"
                  disabled={isPending || acting}
                  onClick={startHand}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-gradient-to-b from-[#F5C518] to-[#E29A12] text-sm font-black text-[#1A1400] shadow-[0_10px_28px_rgba(245,197,24,0.4)] disabled:opacity-50"
                >
                  <BoltIcon className="h-5 w-5" />
                  {acting
                    ? "Dealing…"
                    : holdDeal || oppCards.length === 2
                      ? "Saw cards — deal next"
                      : "Deal next hand"}
                </button>
              ) : null}

              {table?.handLive && table.stage !== 5 ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={!myTurn || isPending || acting}
                      onClick={() => act("fold")}
                      className="flex min-h-[52px] flex-col items-center justify-center rounded-[18px] border border-[#7f1d1d]/50 bg-gradient-to-b from-[#fb7185] to-[#be123c] text-[13px] font-black uppercase tracking-wide text-white shadow-[0_8px_20px_rgba(190,18,60,0.35)] disabled:opacity-40"
                    >
                      Fold
                      <span className="text-[9px] font-bold normal-case tracking-normal opacity-85">
                        Lose this pot
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={!myTurn || isPending || acting}
                      onClick={() => act("checkCall")}
                      className="flex min-h-[52px] flex-col items-center justify-center rounded-[18px] border border-[#14532d]/40 bg-gradient-to-b from-[#4ade80] to-[#15803d] text-[13px] font-black uppercase tracking-wide text-white shadow-[0_8px_20px_rgba(21,128,61,0.4)] disabled:opacity-40"
                    >
                      {toCall > 0n ? "Call" : "Check"}
                      {toCall > 0n ? (
                        <span className="text-[9px] font-bold normal-case tracking-normal opacity-85">
                          {formatStack(toCall)}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      disabled={!myTurn || isPending || acting}
                      onClick={raise}
                      className="flex min-h-[52px] flex-col items-center justify-center rounded-[18px] border border-[#854d0e]/40 bg-gradient-to-b from-[#F5C518] to-[#c27803] text-[13px] font-black uppercase tracking-wide text-[#1A1400] shadow-[0_8px_20px_rgba(245,197,24,0.35)] disabled:opacity-40"
                    >
                      Raise
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "Min", mult: 1 },
                      { label: "2×", mult: 2 },
                      { label: "Pot", mult: 0 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={!myTurn || isPending || acting}
                        onClick={() => {
                          if (!table) return;
                          const minRaise = table.buyIn > 0n ? table.buyIn / 5n : 3n * 10n ** 12n;
                          const floor =
                            table.currentBet + (minRaise > 0n ? minRaise : 10n ** 12n);
                          const pot = table.pot;
                          let raw: bigint;
                          if (preset.mult === 0) {
                            raw = pot > floor ? pot : floor * 2n;
                          } else if (preset.mult === 1) {
                            raw = floor; // real min raise (must beat currentBet)
                          } else {
                            raw = floor * 2n;
                          }
                          if (raw <= table.currentBet) raw = floor;
                          const eth = Number(raw) / 1e18;
                          setRaiseToEth(eth.toFixed(6).replace(/\.?0+$/, "") || "0.000015");
                        }}
                        className="min-h-9 rounded-xl border border-white/10 bg-white/10 text-[11px] font-black text-white/90 disabled:opacity-40"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <input
                    value={raiseToEth}
                    onChange={(e) => setRaiseToEth(e.target.value)}
                    className="min-h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-center font-mono text-xs font-bold text-white outline-none focus:border-[#F5C518]/50"
                    aria-label="Raise to amount"
                    placeholder="Raise to"
                  />
                </>
              ) : null}

              {table?.stage === 5 ? (
                <div className="space-y-2">
                  <p className="px-1 text-center text-[11px] font-semibold leading-snug text-white/70">
                    Showdown = prove cards and pay the pot. Your stack shows 0 because chips are in the pot
                    ({table ? formatStack(table.pot) : "0"}).
                  </p>
                  {vsBot ? (
                    <button
                      type="button"
                      disabled={isPending || acting}
                      onClick={runShowdown}
                      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-gradient-to-b from-[#F5C518] to-[#E29A12] text-base font-black text-[#1A1400] shadow-[0_10px_28px_rgba(245,197,24,0.4)] disabled:opacity-50"
                    >
                      <CardsIcon className="h-5 w-5" />
                      {acting ? "Settling…" : "Reveal & settle pot"}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isPending || acting}
                        onClick={runShowdown}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-gradient-to-b from-[#F5C518] to-[#E29A12] text-sm font-black text-[#1A1400] disabled:opacity-50"
                      >
                        <CardsIcon className="h-4 w-4" />
                        {acting ? "Working…" : "Submit cards"}
                      </button>
                      <button
                        type="button"
                        disabled={isPending || acting}
                        onClick={finalize}
                        className="min-h-12 rounded-[18px] border border-white/20 bg-white/10 text-sm font-black text-white disabled:opacity-50"
                      >
                        {acting ? "Paying…" : "Finalize"}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              <p className="text-center text-[10px] font-semibold text-white/55">{log}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
