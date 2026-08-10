"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseEther, decodeEventLog } from "viem";
import {
  useAccount,
  useWriteContract,
  usePublicClient,
  useSwitchChain,
} from "wagmi";
import {
  BoltIcon,
  CardsIcon,
  InfoIcon,
  UserIcon,
} from "@/components/icons";
import { GradientButton } from "@/components/ui/GradientButton";
import { SoftExpand } from "@/components/ui/SoftExpand";
import { RIVER_HOLDEM_ADDRESS, riverHoldemAbi } from "@/lib/contracts/riverHoldem";
import { cn } from "@/lib/cn";
import { forceBaseSepolia, baseSepolia } from "@/lib/wallet/forceBaseSepolia";
import { usePlaySession } from "@/hooks/usePlaySession";
import { useAuthGate } from "@/components/AuthGate";
import { useGame } from "@/context/GameContext";
import { activeTableHref, clearActiveTable, readActiveTable, type ActiveTable } from "@/lib/activeTable";
import { PlayerLevelBadge } from "@/components/PlayerLevelBadge";
import { PremiumChip } from "@/components/PremiumChip";
import { PremiumPageShell } from "@/components/ui/PremiumPageShell";
import Link from "next/link";
import {
  challengeInviteUrl,
  pushRecentChallenge,
  readRecentChallenges,
} from "@/lib/recentChallenges";
import {
  FriendsChallengePanel,
  pushChallengeToFriend,
} from "@/components/FriendsChallengePanel";
import type { Friend } from "@/lib/friends";

const BUY_IN = parseEther("0.000015");
const ZERO = "0x0000000000000000000000000000000000000000";

type PlayMode = "bot" | "friend";

function friendlyError(raw: string) {
  const msg = raw || "";
  if (/user rejected|denied|cancelled/i.test(msg)) {
    return "Cancelled. Tap Play when you are ready.";
  }
  if (/could not set up your seat|house cannot drip|house wallet|drip|faucet is refilling|faucet is low/i.test(msg)) {
    return "Getting your seat ready… tap Play again in a moment.";
  }
  if (/insufficient funds|exceeds balance|gas/i.test(msg)) {
    return "Topping up your seat… tap Play again.";
  }
  if (/already|full|taken|seat/i.test(msg)) {
    return "That table is full or already started. Ask for a fresh Challenge #.";
  }
  if (/bot|opponent|join|ready|fund|matchmaking/i.test(msg)) {
    return "Seating… tap Play again.";
  }
  if (msg.length > 120) return "Something went wrong. Tap Play to retry.";
  return msg;
}

export default function LobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, chainId, address: mmAddress } = useAccount();
  const { googleUser } = useAuthGate();
  const { startMegapotSession, megapotCredits, xp, stats, profile } = useGame();
  const play = usePlaySession();
  const wagmiPublic = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const [mode, setMode] = useState<PlayMode>("bot");
  const [liveTable, setLiveTable] = useState<ActiveTable | null>(null);
  const [challengeTarget, setChallengeTarget] = useState<Friend | null>(null);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    setLiveTable(readActiveTable());
  }, []);
  const [joinId, setJoinId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [botReady, setBotReady] = useState<boolean | null>(null);
  const [stuckHuman, setStuckHuman] = useState<{ tableId: string; toAct: string }[]>([]);
  const [recentChallenges, setRecentChallenges] = useState<
    { tableId: string; createdAt: number; role: "host" | "guest" }[]
  >([]);
  const lastWakeAt = useRef(0);

  useEffect(() => {
    const invite = searchParams.get("join") || searchParams.get("challenge");
    if (invite && /^\d+$/.test(invite)) {
      setMode("friend");
      setJoinId(invite);
      setStatus(`Invite loaded — table #${invite}. Tap Join when ready.`);
    }
  }, [searchParams]);

  const { writeContractAsync, isPending } = useWriteContract();

  const silent = play.silent;
  const publicClient = silent ? play.publicClient : wagmiPublic;
  const contractReady = Boolean(RIVER_HOLDEM_ADDRESS);
  const onBaseSepolia = silent || chainId === baseSepolia.id;
  const waiting = isPending || busy;

  const myStuckTables = useMemo(() => {
    const seats = [play.address, mmAddress].filter(Boolean).map((a) => a!.toLowerCase());
    return stuckHuman.filter((t) => seats.includes(t.toAct.toLowerCase()));
  }, [stuckHuman, play.address, mmAddress]);

  async function ensureBaseSepolia() {
    if (silent || onBaseSepolia) return true;
    setStatus("Getting your wallet ready…");
    const ok = await forceBaseSepolia(switchChainAsync);
    if (!ok) {
      setStatus("Switch your wallet network, then tap Play.");
      return false;
    }
    return true;
  }

  async function refreshBot() {
    try {
      const res = await fetch("/api/bot/info");
      const data = (await res.json()) as {
        ready?: boolean;
        stuckHuman?: { tableId: string; toAct: string }[];
      };
      setBotReady(Boolean(data.ready));
      setStuckHuman(data.stuckHuman ?? []);
    } catch {
      setBotReady(false);
      setStuckHuman([]);
    }
  }

  useEffect(() => {
    setRecentChallenges(readRecentChallenges());
    const sync = () => setRecentChallenges(readRecentChallenges());
    window.addEventListener("pi-river-challenges", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("pi-river-challenges", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    refreshBot().then(() => {
      lastWakeAt.current = Date.now();
      fetch("/api/bot/wake", { method: "POST" })
        .then(() => {
          lastWakeAt.current = Date.now();
          return refreshBot();
        })
        .catch(() => {});
    });
  }, []);

  async function autoPrepare() {
    setStatus("Getting your table ready…");
    const wokeRecently = Date.now() - lastWakeAt.current < 25_000 && botReady === true;
    if (!wokeRecently) {
      try {
        await fetch("/api/bot/wake", { method: "POST" });
        lastWakeAt.current = Date.now();
      } catch {
        // ignore
      }
    }

    const infoRes = await fetch("/api/bot/info");
    const info = (await infoRes.json()) as {
      ready?: boolean;
      stuckHuman?: { tableId: string; toAct: string }[];
    };
    setBotReady(Boolean(info.ready));
    setStuckHuman(info.stuckHuman ?? []);

    const seats = [play.address, mmAddress].filter(Boolean) as `0x${string}`[];
    const latestStuck = (info.stuckHuman ?? []).filter((t) =>
      seats.some((s) => s.toLowerCase() === t.toAct.toLowerCase())
    );

    for (const t of latestStuck) {
      setStatus("Closing your last hand…");
      const toAct = t.toAct.toLowerCase();
      try {
        if (play.address && toAct === play.address.toLowerCase() && silent) {
          const hash = await play.writeContract({
            address: RIVER_HOLDEM_ADDRESS,
            abi: riverHoldemAbi,
            functionName: "fold",
            args: [BigInt(t.tableId)],
          });
          await play.waitForTx(hash);
        } else if (mmAddress && toAct === mmAddress.toLowerCase() && isConnected) {
          await forceBaseSepolia(switchChainAsync);
          const hash = await writeContractAsync({
            address: RIVER_HOLDEM_ADDRESS,
            abi: riverHoldemAbi,
            functionName: "fold",
            args: [BigInt(t.tableId)],
            chainId: baseSepolia.id,
          });
          await publicClient!.waitForTransactionReceipt({ hash });
        }
      } catch {
        // continue
      }
    }

    try {
      await fetch("/api/bot/wake", { method: "POST" });
    } catch {
      // ignore
    }
    await refreshBot();
  }

  async function afterFriendTableCreated(tableId: string, stake: number, targetOverride?: Friend | null) {
    pushRecentChallenge(tableId, "host");
    const target = targetOverride !== undefined ? targetOverride : challengeTarget;
    if (target && googleUser?.id) {
      setStatus(`Pushing Challenge to ${target.n}…`);
      try {
        await pushChallengeToFriend({
          friendCode: target.c,
          tableId,
          fromName: profile.displayName || "Player",
          fromUserId: googleUser.id,
        });
        setStatus(`Pushed to ${target.n}. Opening table…`);
      } catch {
        setStatus("Invite link ready — friend may need the link if offline.");
      }
    }
    try {
      await navigator.clipboard.writeText(challengeInviteUrl(tableId));
    } catch {
      // ignore
    }
    router.push(`/table/${tableId}?mode=friend&stake=${stake}`);
  }

  async function createAndMaybeInviteBot(friendOverride?: Friend | null) {
    const asFriend =
      friendOverride &&
      typeof friendOverride === "object" &&
      "c" in friendOverride &&
      typeof (friendOverride as Friend).c === "string"
        ? (friendOverride as Friend)
        : friendOverride === null
          ? null
          : undefined;
    if (asFriend) setChallengeTarget(asFriend);
    const pushTarget = asFriend !== undefined ? asFriend : challengeTarget;
    if (!contractReady) {
      setStatus("Game is warming up. Try again in a moment.");
      return;
    }

    // Google silent seat — never require MetaMask on mobile
    if (googleUser) {
      if (!play.ready) {
        setStatus("Setting up your seat…");
        return;
      }
      if (!silent) {
        setStatus("Could not create your play seat. Refresh once, then tap Play.");
        return;
      }
    } else if (!isConnected) {
      setStatus("Sign in with Google to play — no MetaMask needed.");
      return;
    }

    if (!silent && !(await ensureBaseSepolia())) return;

    setBusy(true);
    try {
      await autoPrepare();
      const stake = startMegapotSession(mode);

      if (silent) {
        setStatus("Setting up your seat…");
        try {
          await play.ensureFunded();
        } catch (err) {
          setStatus(friendlyError(err instanceof Error ? err.message : "setup failed"));
          return;
        }
        setStatus(mode === "bot" ? "Opening table…" : "Opening your Challenge…");
        const hash = await play.writeContract({
          address: RIVER_HOLDEM_ADDRESS,
          abi: riverHoldemAbi,
          functionName: "createTable",
          value: BUY_IN,
        });
        const receipt = await play.waitForTx(hash);
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
          setStatus("Table opened. Tap Play again if you do not see it.");
          return;
        }
        if (mode === "bot") {
          setStatus("Seating River Bot…");
          try {
            // Prefund Inco shuffle fee so bot join → deal does not revert
            const feeNeed = parseEther("0.00009");
            const playBal = await play.publicClient.getBalance({ address: play.address! });
            if (playBal > feeNeed + parseEther("0.000008")) {
              const feeHash = await play.writeContract({
                address: RIVER_HOLDEM_ADDRESS,
                abi: riverHoldemAbi,
                functionName: "fundFees",
                value: feeNeed,
              });
              await play.waitForTx(feeHash);
            }
          } catch {
            // join route / table Retry seat will fund if needed
          }
          setStatus("Seating River Bot…");
          let seated = false;
          let lastJoinErr = "";
          for (let i = 0; i < 5 && !seated; i++) {
            if (i > 0) {
              setStatus(`Seating River Bot… (${i + 1}/5)`);
              await fetch("/api/bot/wake", { method: "POST" }).catch(() => null);
              await new Promise((r) => setTimeout(r, 400 * i));
            }
            const joinRes = await fetch("/api/bot/join", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tableId: tableId.toString() }),
            });
            if (joinRes.ok) {
              seated = true;
              break;
            }
            try {
              const body = (await joinRes.json()) as { error?: string; reason?: string };
              lastJoinErr = body.error || body.reason || `HTTP ${joinRes.status}`;
            } catch {
              lastJoinErr = `HTTP ${joinRes.status}`;
            }
          }
          if (!seated) {
            setStatus(
              lastJoinErr
                ? `River Bot seat failed (${lastJoinErr}). Tap Play again — house faucet may need ETH.`
                : "River Bot seat failed. Tap Play again — house faucet may need ETH."
            );
            // Still open the table so Retry seat can finish (buy-in already locked)
            router.push(`/table/${tableId.toString()}?mode=bot&stake=${stake}`);
            return;
          }
          router.push(
            `/table/${tableId.toString()}?mode=bot&stake=${stake}&seated=1`
          );
          return;
        }
        await afterFriendTableCreated(tableId.toString(), stake, pushTarget);
        return;
      }

      if (mmAddress && publicClient) {
        const bal = await publicClient.getBalance({ address: mmAddress });
        if (bal < BUY_IN + parseEther("0.000008")) {
          setStatus("Sign in with Google for free instant play.");
          return;
        }
      }
      setStatus(mode === "bot" ? "Opening table…" : "Opening your Challenge…");
      const hash = await writeContractAsync({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "createTable",
        value: BUY_IN,
        chainId: baseSepolia.id,
      });
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
        setStatus("Table opened. Tap Play again if you do not see it.");
        return;
      }
      if (mode === "bot") {
        setStatus("Seating River Bot…");
        let seated = false;
        let lastJoinErr = "";
        for (let i = 0; i < 5; i++) {
          if (i > 0) {
            setStatus(`Seating River Bot… (${i + 1}/5)`);
            if (Date.now() - lastWakeAt.current > 8_000) {
              await fetch("/api/bot/wake", { method: "POST" }).catch(() => null);
              lastWakeAt.current = Date.now();
            }
            await new Promise((r) => setTimeout(r, 400 * i));
          }
          const joinRes = await fetch("/api/bot/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableId: tableId.toString() }),
          });
          if (joinRes.ok) {
            seated = true;
            break;
          }
          try {
            const body = (await joinRes.json()) as { error?: string; reason?: string };
            lastJoinErr = body.error || body.reason || `HTTP ${joinRes.status}`;
          } catch {
            lastJoinErr = `HTTP ${joinRes.status}`;
          }
        }
        if (!seated) {
          setStatus(
            lastJoinErr
              ? `River Bot seat failed (${lastJoinErr}). Use Retry seat on the table.`
              : "River Bot seat failed. Use Retry seat on the table."
          );
        }
        router.push(
          `/table/${tableId.toString()}?mode=bot&stake=${stake}${seated ? "&seated=1" : ""}`
        );
        return;
      }
      await afterFriendTableCreated(tableId.toString(), stake, pushTarget);
    } catch (err) {
      setStatus(friendlyError(err instanceof Error ? err.message : "Could not start"));
    } finally {
      setBusy(false);
    }
  }

  async function joinTable() {
    if (googleUser) {
      if (!play.ready) {
        setStatus("Setting up your seat…");
        return;
      }
      if (!silent) {
        setStatus("Could not create your play seat. Refresh once, then join.");
        return;
      }
    } else if (!isConnected) {
      setStatus("Sign in with Google to join — no MetaMask needed.");
      return;
    }
    if (!contractReady) {
      setStatus("Game is warming up. Try again in a moment.");
      return;
    }
    const id = BigInt(joinId || "0");
    if (id <= 0n) {
      setStatus("Enter your friend table number.");
      return;
    }
    setBusy(true);
    try {
      startMegapotSession("friend");
      const client = silent ? play.publicClient : publicClient;
      if (client) {
        setStatus("Checking table…");
        try {
          const row = (await client.readContract({
            address: RIVER_HOLDEM_ADDRESS,
            abi: riverHoldemAbi,
            functionName: "tables",
            args: [id],
          })) as readonly [`0x${string}`, `0x${string}`, ...unknown[]];
          if (!row[0] || row[0].toLowerCase() === ZERO.toLowerCase()) {
            setStatus("No open Challenge with that #. Ask your friend to create one.");
            return;
          }
          if (row[1] && row[1].toLowerCase() !== ZERO.toLowerCase()) {
            setStatus("That table is already full. Ask for a new Challenge #.");
            return;
          }
        } catch {
          // join will still try
        }
      }
      if (silent) {
        setStatus("Setting up your seat…");
        await play.ensureFunded();
        setStatus("Joining Challenge…");
        const hash = await play.writeContract({
          address: RIVER_HOLDEM_ADDRESS,
          abi: riverHoldemAbi,
          functionName: "joinTable",
          args: [id],
          value: BUY_IN,
        });
        await play.waitForTx(hash);
        pushRecentChallenge(id.toString(), "guest");
        router.push(`/table/${id.toString()}?mode=friend&stake=2`);
        return;
      }
      if (!(await ensureBaseSepolia())) return;
      setStatus("Joining Challenge…");
      const hash = await writeContractAsync({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "joinTable",
        args: [id],
        value: BUY_IN,
        chainId: baseSepolia.id,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      pushRecentChallenge(id.toString(), "guest");
      router.push(`/table/${id.toString()}?mode=friend&stake=2`);
    } catch (err) {
      setStatus(friendlyError(err instanceof Error ? err.message : "Could not join"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PremiumPageShell tone="green" className="space-y-5">
      <section className="relative overflow-hidden rounded-[34px] border border-[#F5C518]/30 bg-[radial-gradient(ellipse_at_center,#248a58_0%,#145c3c_32%,#0d3a28_62%,#061510_100%)] px-5 pb-7 pt-8 shadow-[0_30px_90px_rgba(0,0,0,0.55),0_0_0_1px_rgba(245,197,24,0.12)] sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/45 to-transparent"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0 1px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 0 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#9dceb4]">
              Private cards · real jackpot tickets
            </p>
            <h1 className="font-display text-4xl font-black leading-[1.05] text-white sm:text-5xl">
              Sit down.
              <br />
              <span className="text-[#F5C518]">Have fun.</span>
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2">
              <p className="max-w-sm text-sm leading-relaxed text-[#b7d7c6]">
                Inco keeps holes sealed. Wins mint Megapot tickets.
              </p>
              <button
                type="button"
                aria-label="How seats work"
                aria-expanded={showTips}
                onClick={() => setShowTips((v) => !v)}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition",
                  showTips
                    ? "border-[#F5C518]/50 bg-[#F5C518]/15 text-[#F5C518]"
                    : "border-white/15 bg-black/30 text-[#9dceb4] hover:border-white/25"
                )}
              >
                <InfoIcon className="h-4 w-4" />
              </button>
            </div>
            {showTips ? (
              <p className="mt-2 max-w-md animate-fade-in text-[12px] leading-relaxed text-[#9dceb4]">
                Hole cards decrypt with Inco Lightning. Wins earn Megapot tickets you can mint on Base Sepolia.
                {megapotCredits > 0 ? (
                  <>
                    {" "}
                    <Link href="/rewards" className="font-bold text-[#F5C518] underline-offset-2 hover:underline">
                      {megapotCredits} ticket{megapotCredits === 1 ? "" : "s"} ready
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            ) : megapotCredits > 0 ? (
              <Link
                href="/rewards"
                className="mt-2 text-[11px] font-black text-[#F5C518] underline-offset-2 hover:underline"
              >
                {megapotCredits} jackpot ticket{megapotCredits === 1 ? "" : "s"} · claim in Rewards
              </Link>
            ) : null}

          {liveTable ? (
            <div className="mt-5 w-full space-y-2 rounded-[22px] border border-[#F5C518]/35 bg-black/30 p-3 text-left shadow-[0_0_0_1px_rgba(245,197,24,0.08)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5C518]">Live table</p>
              <p className="text-sm font-black text-white">
                Table #{liveTable.id} · {liveTable.mode === "friend" ? "Friend" : "vs Bot"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <GradientButton
                  className="min-h-11"
                  onClick={() => router.push(activeTableHref(liveTable))}
                >
                  Resume hand
                </GradientButton>
                <GradientButton
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => {
                    clearActiveTable();
                    setLiveTable(null);
                  }}
                >
                  New match
                </GradientButton>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid w-full grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("bot")}
              className={cn(
                "relative overflow-hidden rounded-[24px] border p-4 text-left transition",
                mode === "bot"
                  ? "border-[#F5C518]/55 bg-gradient-to-br from-[#3a2d0a] via-[#1a1520] to-[#0f0d18] shadow-[0_16px_40px_rgba(245,197,24,0.25)]"
                  : "border-white/10 bg-black/25 hover:border-white/20"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <PremiumChip size={40} tone="gold" />
                <BoltIcon className={cn("h-5 w-5", mode === "bot" ? "text-[#F5C518]" : "text-[#9dceb4]")} />
              </div>
              <p className={cn("text-base font-black", mode === "bot" ? "text-white" : "text-[#b7d7c6]")}>
                Quick Play
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9dceb4]">
                vs Bot · instant
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("friend")}
              className={cn(
                "relative overflow-hidden rounded-[24px] border p-4 text-left transition",
                mode === "friend"
                  ? "border-emerald-400/50 bg-gradient-to-br from-[#0f2a1c] via-[#122018] to-[#0f0d18] shadow-[0_16px_40px_rgba(52,211,153,0.2)]"
                  : "border-white/10 bg-black/25 hover:border-white/20"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <PremiumChip size={40} tone="green" />
                <UserIcon className={cn("h-5 w-5", mode === "friend" ? "text-[#86efac]" : "text-[#9dceb4]")} />
              </div>
              <p className={cn("text-base font-black", mode === "friend" ? "text-white" : "text-[#b7d7c6]")}>
                Challenge
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9dceb4]">
                vs Friend · push
              </p>
            </button>
          </div>

          <div className="mt-5 flex w-full flex-col gap-3">
            <GradientButton
              className="w-full min-h-14 text-base"
              icon={mode === "bot" ? <BoltIcon className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
              onClick={() => void createAndMaybeInviteBot()}
              disabled={
                waiting ||
                (Boolean(googleUser) && !play.ready) ||
                (!silent && !googleUser && !isConnected)
              }
            >
              {waiting
                ? "Starting…"
                : googleUser && !play.ready
                  ? "Preparing seat…"
                  : mode === "bot"
                    ? "Quick Play"
                    : "Create Challenge"}
            </GradientButton>

            {waiting && status ? (
              <p className="animate-pulse-soft text-[12px] font-semibold text-[#F5C518]">{status}</p>
            ) : null}

            {mode === "friend" ? (
              <div className="w-full space-y-3 text-left">
                <div className="flex gap-2">
                  <input
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Challenge table #"
                    inputMode="numeric"
                    className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 text-center text-base font-bold text-white outline-none placeholder:text-white/35 focus:border-[#F5C518]/50"
                  />
                  <GradientButton
                    variant="secondary"
                    className="min-h-12 min-w-[6.5rem] border-white/15 bg-black/30"
                    icon={<CardsIcon className="h-5 w-5" />}
                    onClick={joinTable}
                    disabled={waiting}
                  >
                    Join
                  </GradientButton>
                </div>

                <SoftExpand
                  title="Friends & codes"
                  hint="Add friends, send challenges"
                  defaultOpen={Boolean(challengeTarget)}
                >
                  <FriendsChallengePanel
                    selectedCode={challengeTarget?.c ?? null}
                    onSelectFriend={setChallengeTarget}
                    onRequestChallenge={(f) => {
                      setChallengeTarget(f);
                      setStatus(`Opening Challenge for ${f.n}…`);
                      void createAndMaybeInviteBot(f);
                    }}
                  />
                </SoftExpand>

                {recentChallenges.length > 0 ? (
                  <SoftExpand
                    title="Recent"
                    hint="Reopen or copy invite"
                    badge={recentChallenges.length}
                  >
                    <div className="space-y-1.5">
                      {recentChallenges.slice(0, 4).map((c) => (
                        <div
                          key={`${c.tableId}-${c.createdAt}`}
                          className="flex items-center gap-2"
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 truncate text-left text-sm font-bold text-white hover:text-[#F5C518]"
                            onClick={() => {
                              setJoinId(c.tableId);
                              setStatus(
                                c.role === "host"
                                  ? `Your table #${c.tableId} — share or Resume if live.`
                                  : `Invite #${c.tableId} loaded — tap Join.`
                              );
                            }}
                          >
                            #{c.tableId} · {c.role === "host" ? "Hosted" : "Joined"}
                          </button>
                          <button
                            type="button"
                            className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-[#F5C518]"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(challengeInviteUrl(c.tableId));
                                setStatus("Invite link copied.");
                              } catch {
                                setStatus(challengeInviteUrl(c.tableId));
                              }
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </SoftExpand>
                ) : null}
              </div>
            ) : null}
          </div>

          {botReady === false && mode === "bot" && !waiting ? (
            <p className="mt-2 text-[11px] font-semibold text-[#F5C518]/90">
              Warming house bot… tap Quick Play in a moment if needed.
            </p>
          ) : null}

          {!waiting && status ? (
            <p className="mt-3 text-sm font-semibold text-[#F5C518]">{status}</p>
          ) : null}

          <Link
            href="/profile"
            className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-left transition hover:border-[#F5C518]/30"
          >
            <PlayerLevelBadge xp={xp} wins={stats.gamesWon} compact />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9dceb4]">
              Profile
            </span>
          </Link>

          {!waiting && myStuckTables.length > 0 && botReady === false ? (
            <button
              type="button"
              className="mt-3 text-xs font-bold text-[#F5C518] underline-offset-2 hover:underline"
              onClick={() => createAndMaybeInviteBot()}
            >
              Finish last hand and play
            </button>
          ) : null}
        </div>
      </section>
    </PremiumPageShell>
  );
}
