"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  UserIcon,
} from "@/components/icons";
import { GradientButton } from "@/components/ui/GradientButton";
import { RIVER_HOLDEM_ADDRESS, riverHoldemAbi } from "@/lib/contracts/riverHoldem";
import { cn } from "@/lib/cn";
import { forceBaseSepolia, baseSepolia } from "@/lib/wallet/forceBaseSepolia";
import { usePlaySession } from "@/hooks/usePlaySession";
import { useAuthGate } from "@/components/AuthGate";
import { useGame } from "@/context/GameContext";

const BUY_IN = parseEther("0.000015");

type PlayMode = "bot" | "friend";

function friendlyError(raw: string) {
  const msg = raw || "";
  if (/user rejected|denied|cancelled/i.test(msg)) {
    return "Cancelled. Tap Play when you are ready.";
  }
  if (/could not set up your seat|house cannot drip|house wallet|drip/i.test(msg)) {
    return "Getting your seat ready… tap Play again in a moment.";
  }
  if (/insufficient funds|exceeds balance|gas/i.test(msg)) {
    return "Topping up your seat… tap Play again.";
  }
  if (/bot|opponent|join|ready|fund|matchmaking/i.test(msg)) {
    return "Finding your match. Tap Play again.";
  }
  if (msg.length > 120) return "Something went wrong. Tap Play to retry.";
  return msg;
}

export default function LobbyPage() {
  const router = useRouter();
  const { isConnected, chainId, address: mmAddress } = useAccount();
  const { googleUser } = useAuthGate();
  const { startMegapotSession, megapotCredits } = useGame();
  const play = usePlaySession();
  const wagmiPublic = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const [mode, setMode] = useState<PlayMode>("bot");
  const [joinId, setJoinId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [botReady, setBotReady] = useState<boolean | null>(null);
  const [stuckHuman, setStuckHuman] = useState<{ tableId: string; toAct: string }[]>([]);

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
    refreshBot().then(() => {
      fetch("/api/bot/wake", { method: "POST" })
        .then(() => refreshBot())
        .catch(() => {});
    });
  }, []);

  async function autoPrepare() {
    setStatus("Getting your table ready…");
    try {
      await fetch("/api/bot/wake", { method: "POST" });
    } catch {
      // ignore
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

  async function createAndMaybeInviteBot() {
    if (!contractReady) {
      setStatus("Game is warming up. Try again in a moment.");
      return;
    }
    if (!silent && !isConnected) {
      setStatus("Sign in with Google to play.");
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
        setStatus(mode === "bot" ? "Finding a match…" : "Opening your table…");
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
          setStatus("Warming up the table…");
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
          setStatus("Opponent joining…");
          const joinRes = await fetch("/api/bot/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableId: tableId.toString() }),
          });
          if (!joinRes.ok) {
            // Still open the table — auto-seat / Sit opponent can finish join
            setStatus("Table ready. Seating opponent…");
          }
          router.push(`/table/${tableId.toString()}?mode=bot&stake=${stake}`);
          return;
        }
        router.push(`/table/${tableId.toString()}?mode=friend&stake=${stake}`);
        return;
      }

      if (mmAddress && publicClient) {
        const bal = await publicClient.getBalance({ address: mmAddress });
        if (bal < BUY_IN + parseEther("0.000008")) {
          setStatus("Sign in with Google for free instant play.");
          return;
        }
      }
      setStatus(mode === "bot" ? "Finding a match…" : "Opening your table…");
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
        setStatus("Opponent joining…");
        await fetch("/api/bot/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId: tableId.toString() }),
        });
        router.push(`/table/${tableId.toString()}?mode=bot&stake=${stake}`);
        return;
      }
      router.push(`/table/${tableId.toString()}?mode=friend&stake=${stake}`);
    } catch (err) {
      setStatus(friendlyError(err instanceof Error ? err.message : "Could not start"));
    } finally {
      setBusy(false);
    }
  }

  async function joinTable() {
    if (!silent && !isConnected) {
      setStatus("Sign in with Google to join.");
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
      if (silent) {
        setStatus("Setting up your seat…");
        await play.ensureFunded();
        setStatus("Joining table…");
        const hash = await play.writeContract({
          address: RIVER_HOLDEM_ADDRESS,
          abi: riverHoldemAbi,
          functionName: "joinTable",
          args: [id],
          value: BUY_IN,
        });
        await play.waitForTx(hash);
        router.push(`/table/${id.toString()}?mode=friend&stake=2`);
        return;
      }
      if (!(await ensureBaseSepolia())) return;
      setStatus("Joining table…");
      const hash = await writeContractAsync({
        address: RIVER_HOLDEM_ADDRESS,
        abi: riverHoldemAbi,
        functionName: "joinTable",
        args: [id],
        value: BUY_IN,
        chainId: baseSepolia.id,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      router.push(`/table/${id.toString()}?mode=friend&stake=2`);
    } catch (err) {
      setStatus(friendlyError(err instanceof Error ? err.message : "Could not join"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
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
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#9dceb4]">
            Private heads up poker
          </p>
          <h1 className="font-display text-4xl font-black leading-[1.05] text-white sm:text-5xl">
            Sit down.
            <br />
            <span className="text-[#F5C518]">Have fun.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#b7d7c6]">
            Tap Play. Your cards stay private. Wins earn jackpot tickets.
            {megapotCredits > 0
              ? ` You have ${megapotCredits} ticket${megapotCredits === 1 ? "" : "s"} ready in Rewards.`
              : ""}
          </p>

          <div className="mt-5 grid w-full grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-black/25 p-1.5">
            <button
              type="button"
              onClick={() => setMode("bot")}
              className={cn(
                "rounded-[16px] px-3 py-3 text-sm font-black transition",
                mode === "bot"
                  ? "bg-gradient-to-b from-[#F5C518] to-[#E29A12] text-[#1A1400] shadow-[0_8px_24px_rgba(245,197,24,0.3)]"
                  : "text-[#b7d7c6] hover:bg-white/5"
              )}
            >
              Quick Play
              <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider opacity-80">
                vs Bot
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("friend")}
              className={cn(
                "rounded-[16px] px-3 py-3 text-sm font-black transition",
                mode === "friend"
                  ? "bg-gradient-to-b from-[#F5C518] to-[#E29A12] text-[#1A1400] shadow-[0_8px_24px_rgba(245,197,24,0.3)]"
                  : "text-[#b7d7c6] hover:bg-white/5"
              )}
            >
              Challenge
              <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider opacity-80">
                vs Friend
              </span>
            </button>
          </div>

          <div className="mt-5 flex w-full flex-col gap-3">
            <GradientButton
              className="w-full min-h-14 text-base"
              icon={mode === "bot" ? <BoltIcon className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
              onClick={createAndMaybeInviteBot}
              disabled={waiting || (!silent && !googleUser && !isConnected)}
            >
              {waiting
                ? "Starting…"
                : mode === "bot"
                  ? "Play now"
                  : "Create friend table"}
            </GradientButton>

            {waiting && status ? (
              <p className="animate-pulse-soft text-[12px] font-semibold text-[#F5C518]">{status}</p>
            ) : (
              <p className="text-[11px] font-semibold leading-relaxed text-[#9dceb4]/90">
                {mode === "bot"
                  ? "One tap. Private cards. Instant match."
                  : "Create a table, then share the number with a friend."}
              </p>
            )}

            {mode === "friend" ? (
              <div className="flex gap-2">
                <input
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Friend table number"
                  inputMode="numeric"
                  className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 text-center text-base font-bold text-white outline-none placeholder:text-white/35 focus:border-[#F5C518]/50"
                />
                <GradientButton
                  variant="secondary"
                  className="min-h-14 min-w-[7.5rem] border-white/15 bg-black/30"
                  icon={<CardsIcon className="h-5 w-5" />}
                  onClick={joinTable}
                  disabled={waiting}
                >
                  Join
                </GradientButton>
              </div>
            ) : null}
          </div>

          {!waiting && status ? (
            <p className="mt-3 text-sm font-semibold text-[#F5C518]">{status}</p>
          ) : null}

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
    </div>
  );
}
