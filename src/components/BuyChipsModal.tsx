"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSendTransaction, useAccount, useSwitchChain, useBalance } from "wagmi";
import { type Hex, formatEther, createPublicClient, http } from "viem";
import { useAuthGate } from "@/components/AuthGate";
import { usePlaySession } from "@/hooks/usePlaySession";
import { useGame } from "@/context/GameContext";
import { GradientButton } from "@/components/ui/GradientButton";
import { PremiumChip } from "@/components/PremiumChip";
import { forceBaseSepolia, baseSepolia } from "@/lib/wallet/forceBaseSepolia";
import { sound } from "@/lib/sound";
import { CHIP_PACKS, type ChipPackDef } from "@/lib/stickers";
import { cn } from "@/lib/cn";

type PackRow = {
  id: string;
  name: string;
  blurb: string;
  ethLabel: string;
  ethWei: string;
  chips: number;
  badge: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

type Phase =
  | "idle"
  | "checking"
  | "funding"
  | "await_wallet"
  | "confirming"
  | "claiming"
  | "success"
  | "error";

const GAS_BUFFER_WEI = 30_000_000_000_000n; // 0.00003 ETH
const PENDING_KEY = "pi_river_pending_chip_claim_v1";
const BASESCAN_TX = "https://sepolia.basescan.org/tx/";

function packWei(pack: PackRow | ChipPackDef): bigint {
  if ("ethWei" in pack && typeof pack.ethWei === "bigint") return pack.ethWei;
  return BigInt(String((pack as PackRow).ethWei));
}

function readPending(): { txHash: Hex; packId: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { txHash?: string; packId?: string };
    if (
      typeof parsed.txHash === "string" &&
      /^0x[a-fA-F0-9]{64}$/.test(parsed.txHash) &&
      typeof parsed.packId === "string"
    ) {
      return { txHash: parsed.txHash as Hex, packId: parsed.packId };
    }
  } catch {
    // ignore
  }
  return null;
}

function writePending(txHash: Hex, packId: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ txHash, packId }));
  } catch {
    // ignore
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

function sepoliaClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org"
    ),
  });
}

function shortEth(wei: bigint): string {
  const s = formatEther(wei);
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  if (n === 0) return "0";
  if (n < 0.000001) return n.toExponential(2);
  return n.toFixed(6).replace(/\.?0+$/, "");
}

export function BuyChipsModal({ open, onClose }: Props) {
  const { googleUser, linkWallet } = useAuthGate();
  const play = usePlaySession();
  const { creditPurchasedChips } = useGame();
  const { isConnected, chainId, address: mmAddress } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync, isPending: mmPending } = useSendTransaction();
  const mmBal = useBalance({
    address: mmAddress,
    chainId: baseSepolia.id,
    query: { enabled: Boolean(mmAddress) && open },
  });

  const [treasury, setTreasury] = useState<`0x${string}` | null>(null);
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [selected, setSelected] = useState<string>("boost");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<"play" | "wallet">("play");
  const [mounted, setMounted] = useState(false);
  const [playEth, setPlayEth] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [grantedChips, setGrantedChips] = useState(0);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [reclaimHash, setReclaimHash] = useState("");
  const [showReclaim, setShowReclaim] = useState(false);
  const claimingRef = useRef(false);

  const busy = phase !== "idle" && phase !== "success" && phase !== "error";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Refresh play-wallet ETH when modal opens / address changes
  useEffect(() => {
    if (!open || !play.address) {
      setPlayEth(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const bal = await sepoliaClient().getBalance({ address: play.address! });
        if (!cancelled) setPlayEth(bal);
      } catch {
        if (!cancelled) setPlayEth(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, play.address, phase]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStatusLine(null);
    setPhase("idle");
    setTxHash(null);
    setGrantedChips(0);
    setNewBalance(null);
    setShowReclaim(false);
    setReclaimHash("");
    setPayMode("play");

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);

    void (async () => {
      try {
        const res = await fetch("/api/chips/packs", { cache: "no-store" });
        const data = (await res.json()) as {
          ok?: boolean;
          treasury?: string | null;
          packs?: PackRow[];
        };
        if (data.treasury && /^0x[a-fA-F0-9]{40}$/.test(data.treasury)) {
          setTreasury(data.treasury as `0x${string}`);
        } else {
          setTreasury(null);
        }
        if (Array.isArray(data.packs) && data.packs.length) setPacks(data.packs);
        else {
          setPacks(
            CHIP_PACKS.map((p) => ({
              id: p.id,
              name: p.name,
              blurb: p.blurb,
              ethLabel: p.ethLabel,
              ethWei: p.ethWei.toString(),
              chips: p.chips,
              badge: p.badge ?? null,
            }))
          );
        }
      } catch {
        setPacks(
          CHIP_PACKS.map((p) => ({
            id: p.id,
            name: p.name,
            blurb: p.blurb,
            ethLabel: p.ethLabel,
            ethWei: p.ethWei.toString(),
            chips: p.chips,
            badge: p.badge ?? null,
          }))
        );
      }
    })();

    // Only auto-resume a pending claim if user already paid this session
    const pending = readPending();
    if (pending && googleUser) {
      setShowReclaim(true);
      setReclaimHash(pending.txHash);
      setStatusLine("Unfinished payment found — finishing claim…");
      setPhase("claiming");
      setTxHash(pending.txHash);
      void claimTx(pending.txHash, pending.packId);
    }

    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, googleUser?.id]);

  async function claimTx(hash: Hex, packId: string, attempt = 0): Promise<boolean> {
    if (claimingRef.current && attempt === 0) return false;
    claimingRef.current = true;
    writePending(hash, packId);
    setTxHash(hash);
    setPhase("claiming");
    setError(null);
    setStatusLine("Verifying payment on Base Sepolia…");
    try {
      const res = await fetch("/api/chips/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packId, txHash: hash }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        chipsGranted?: number;
        error?: string;
        alreadyClaimed?: boolean;
        newBalance?: number;
        lifetimeChipsBought?: number;
        paymentVerified?: boolean;
      };

      if (!res.ok && res.status === 404 && attempt < 5) {
        claimingRef.current = false;
        setStatusLine(`Waiting for network… ${attempt + 1}/5`);
        await new Promise((r) => setTimeout(r, 1800 * (attempt + 1)));
        return claimTx(hash, packId, attempt + 1);
      }

      const granted = Math.max(0, Math.floor(Number(data.chipsGranted) || 0));
      if (!data.ok || !granted) {
        if (data.paymentVerified && granted) {
          const bal = await creditPurchasedChips(granted, {
            lifetimeChipsBought: data.lifetimeChipsBought,
          });
          clearPending();
          setGrantedChips(granted);
          setNewBalance(bal);
          setPhase("success");
          setStatusLine(null);
          sound.playWin();
          return true;
        }
        setPhase("error");
        setShowReclaim(true);
        setReclaimHash(hash);
        setError(
          data.error ||
            "Payment not verified yet. Wait 10s, then reclaim with the tx hash."
        );
        return false;
      }

      const bal = await creditPurchasedChips(data.alreadyClaimed ? 0 : granted, {
        newBalance: data.newBalance,
        lifetimeChipsBought: data.lifetimeChipsBought,
      });
      if (data.alreadyClaimed && typeof data.newBalance !== "number") {
        await creditPurchasedChips(granted, {
          lifetimeChipsBought: data.lifetimeChipsBought,
        });
      }

      clearPending();
      setGrantedChips(granted);
      setNewBalance(bal);
      setPhase("success");
      setStatusLine(null);
      sound.playWin();
      return true;
    } catch {
      setPhase("error");
      setShowReclaim(true);
      setReclaimHash(hash);
      setError("Network error while claiming. Paste the tx hash to finish.");
      return false;
    } finally {
      claimingRef.current = false;
    }
  }

  async function waitAndClaim(hash: Hex, packId: string) {
    writePending(hash, packId);
    setTxHash(hash);
    setPhase("confirming");
    setStatusLine("Waiting for Base Sepolia confirmation…");
    try {
      await sepoliaClient().waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 120_000,
      });
    } catch {
      setStatusLine("Confirmation slow — still verifying…");
    }
    await claimTx(hash, packId);
  }

  async function buyWithPlayWallet(pack: PackRow | ChipPackDef) {
    if (!googleUser) {
      setPhase("error");
      setError("Sign in with Google first.");
      return;
    }
    if (!treasury) {
      setPhase("error");
      setError("Treasury offline — try again shortly.");
      return;
    }
    if (!play.walletClient || !play.address) {
      setPhase("error");
      setError("Play wallet not ready.");
      return;
    }

    const value = packWei(pack);
    const need = value + GAS_BUFFER_WEI;
    setError(null);
    setTxHash(null);
    setGrantedChips(0);
    setNewBalance(null);

    try {
      setPhase("checking");
      setStatusLine("Checking play wallet ETH…");
      let bal = await sepoliaClient().getBalance({ address: play.address });
      setPlayEth(bal);

      if (bal < need) {
        setPhase("funding");
        setStatusLine(
          `Not enough ETH (${shortEth(bal)} / need ~${shortEth(need)}). Requesting testnet drip…`
        );
        try {
          await play.ensureFunded(need);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Drip failed";
          setPhase("error");
          setError(
            /insufficient|fund|warming|drip/i.test(msg)
              ? `Not enough Base Sepolia ETH in play wallet. Need ~${shortEth(need)} ETH. Wait for drip or switch to MetaMask.`
              : msg
          );
          return;
        }
        bal = await sepoliaClient().getBalance({ address: play.address });
        setPlayEth(bal);
        if (bal < need) {
          setPhase("error");
          setError(
            `Still short on ETH (${shortEth(bal)}). Need ~${shortEth(need)}. Try MetaMask or wait for drip.`
          );
          return;
        }
      }

      setPhase("await_wallet");
      setStatusLine(`Sending ${pack.ethLabel} ETH to treasury…`);
      const hash = await play.walletClient.sendTransaction({
        account: play.walletClient.account!,
        chain: baseSepolia,
        to: treasury,
        value,
      });
      setTxHash(hash);
      await waitAndClaim(hash, pack.id);
      // refresh eth after spend
      try {
        setPlayEth(await sepoliaClient().getBalance({ address: play.address }));
      } catch {
        // ignore
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      setPhase("error");
      setError(
        /insufficient funds|insufficient|fund/i.test(msg)
          ? `Not enough Base Sepolia ETH (need ~${shortEth(need)}).`
          : msg.length > 160
            ? "Payment failed. Check Base Sepolia ETH."
            : msg
      );
    }
  }

  async function buyWithMetaMask(pack: PackRow) {
    if (!googleUser) {
      setPhase("error");
      setError("Sign in with Google first.");
      return;
    }
    if (!treasury) {
      setPhase("error");
      setError("Treasury offline.");
      return;
    }
    if (!isConnected || !mmAddress) {
      linkWallet();
      setPhase("error");
      setError("Connect MetaMask, then tap Buy again.");
      return;
    }

    const value = BigInt(pack.ethWei);
    const need = value + GAS_BUFFER_WEI;
    const have = mmBal.data?.value ?? 0n;

    setError(null);
    setTxHash(null);
    setGrantedChips(0);
    setNewBalance(null);
    setPhase("checking");
    setStatusLine("Checking MetaMask Base Sepolia balance…");

    if (have < need) {
      setPhase("error");
      setError(
        `MetaMask has ${shortEth(have)} ETH on Base Sepolia — need ~${shortEth(need)} for this pack + gas.`
      );
      return;
    }

    if (chainId !== baseSepolia.id) {
      setStatusLine("Switching MetaMask to Base Sepolia…");
      await forceBaseSepolia(switchChainAsync);
    }

    try {
      setPhase("await_wallet");
      setStatusLine("Confirm in MetaMask…");
      const hash = await sendTransactionAsync({
        to: treasury,
        value,
        chainId: baseSepolia.id,
      });
      setTxHash(hash);
      await waitAndClaim(hash, pack.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Rejected";
      setPhase("error");
      setError(/user rejected|denied/i.test(msg) ? "Payment cancelled in MetaMask." : msg);
    }
  }

  async function onReclaim() {
    const raw = reclaimHash.trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(raw)) {
      setPhase("error");
      setError("Paste a full 0x… hash (66 chars) from Basescan / MetaMask.");
      return;
    }
    const pending = readPending();
    const packHint =
      pending && pending.txHash.toLowerCase() === raw.toLowerCase()
        ? pending.packId
        : selected || "boost";
    setStatusLine("Reclaiming paid transaction…");
    await claimTx(raw as Hex, packHint);
  }

  if (!open || !mounted) return null;

  const active = packs.find((p) => p.id === selected) || packs[0];
  const needWei = active ? packWei(active) + GAS_BUFFER_WEI : 0n;
  const ethHave =
    payMode === "play"
      ? playEth
      : mmBal.data?.value ?? null;
  const canAfford =
    ethHave !== null ? ethHave >= needWei : payMode === "wallet" ? null : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#05040a]/85 p-3 backdrop-blur-md sm:p-4"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal
        aria-label="Buy chips"
        className="relative flex max-h-[min(90dvh,680px)] w-full max-w-[400px] flex-col overflow-hidden rounded-[28px] border border-[#F5C518]/35 bg-gradient-to-b from-[#1c1810] via-[#141018] to-[#0a090f] shadow-[0_32px_100px_rgba(0,0,0,0.75)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-white/8 px-4 pb-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-lg font-black text-white transition hover:border-[#F5C518]/50 hover:bg-[#F5C518]/15 disabled:opacity-40"
          >
            ×
          </button>
          <div className="mx-auto flex max-w-[280px] flex-col items-center text-center pr-6">
            <PremiumChip size={36} tone="gold" />
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#F5C518]">
              Base Sepolia · real ETH pay
            </p>
            <h2 className="font-display text-[22px] font-black leading-none text-white sm:text-[26px]">
              Buy chips
            </h2>
            <p className="mt-1.5 text-[12px] leading-snug text-[#9AA0B4]">
              Fun chips only after a confirmed payment
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
          {phase === "success" ? (
            <div className="flex flex-col items-center gap-3 rounded-[22px] border border-[#86efac]/35 bg-[#86efac]/10 px-4 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#86efac]/20 text-3xl font-black text-[#86efac]">
                ✓
              </div>
              <p className="font-display text-xl font-black text-white">Payment verified</p>
              <p className="text-sm font-bold text-[#86efac]">
                +{grantedChips.toLocaleString()} chips
              </p>
              {newBalance !== null ? (
                <p className="font-mono text-xs text-[#9AA0B4]">
                  New balance {newBalance.toLocaleString()} chips
                </p>
              ) : null}
              {txHash ? (
                <a
                  href={`${BASESCAN_TX}${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 break-all rounded-xl border border-white/15 bg-black/40 px-3 py-2 font-mono text-[10px] text-[#F5C518] underline-offset-2 hover:underline"
                >
                  View tx {txHash.slice(0, 10)}…{txHash.slice(-8)}
                </a>
              ) : null}
              <GradientButton className="mt-2 w-full min-h-11 text-sm" onClick={onClose}>
                Done
              </GradientButton>
            </div>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-black/35 p-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPayMode("play")}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-xs font-black transition disabled:opacity-50",
                    payMode === "play"
                      ? "bg-gradient-to-b from-[#FFE08A] to-[#F5C518] text-[#1A1400]"
                      : "text-[#9AA0B4] hover:text-white"
                  )}
                >
                  Play wallet
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPayMode("wallet")}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-xs font-black transition disabled:opacity-50",
                    payMode === "wallet"
                      ? "bg-gradient-to-b from-[#FFE08A] to-[#F5C518] text-[#1A1400]"
                      : "text-[#9AA0B4] hover:text-white"
                  )}
                >
                  MetaMask
                </button>
              </div>

              <div className="mb-3 rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#9AA0B4]">
                  {payMode === "play" ? "Play wallet ETH" : "MetaMask ETH"} · Base Sepolia
                </p>
                <p className="mt-1 font-mono text-sm font-black text-white">
                  {ethHave === null ? "…" : `${shortEth(ethHave)} ETH`}
                  {active ? (
                    <span className="ml-2 text-[11px] font-bold text-[#9AA0B4]">
                      need ~{shortEth(needWei)}
                    </span>
                  ) : null}
                </p>
                {canAfford === false ? (
                  <p className="mt-1 text-[11px] font-bold text-red-300">
                    Not enough ETH for this pack + gas
                    {payMode === "play" ? " — buy will try a free drip first" : ""}
                  </p>
                ) : canAfford === true ? (
                  <p className="mt-1 text-[11px] font-bold text-[#86efac]">Enough ETH to pay</p>
                ) : null}
                {treasury ? (
                  <p className="mt-1 truncate font-mono text-[10px] text-[#6b7084]">
                    Pays to {treasury}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                {packs.map((pack) => {
                  const on = selected === pack.id;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setSelected(pack.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition disabled:opacity-60",
                        on
                          ? "border-[#F5C518]/60 bg-[#F5C518]/12"
                          : "border-white/10 bg-black/30 hover:border-white/20"
                      )}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#F5C518]/25 bg-black/40">
                        <PremiumChip size={24} tone="gold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-white">{pack.name}</p>
                          {pack.badge ? (
                            <span className="rounded-full bg-[#F5C518]/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#F5C518]">
                              {pack.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#9AA0B4] line-clamp-2">
                          {pack.blurb}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm font-black tabular-nums text-white">
                          {pack.chips.toLocaleString()}
                        </p>
                        <p className="font-mono text-[11px] font-bold text-[#F5C518]">
                          {pack.ethLabel} ETH
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {busy || statusLine ? (
                <div className="mt-3 rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/10 px-3 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#F5C518]">
                    {phase === "checking"
                      ? "Checking balance"
                      : phase === "funding"
                        ? "Funding play wallet"
                        : phase === "await_wallet"
                          ? "Awaiting signature"
                          : phase === "confirming"
                            ? "Confirming tx"
                            : phase === "claiming"
                              ? "Crediting chips"
                              : "Working"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-white">
                    {statusLine || "Please wait…"}
                  </p>
                  {txHash ? (
                    <a
                      href={`${BASESCAN_TX}${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block font-mono text-[10px] text-[#F5C518] underline"
                    >
                      Open tx on Basescan
                    </a>
                  ) : null}
                </div>
              ) : null}

              {error || phase === "error" ? (
                <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-center text-xs font-bold text-red-200">
                  {error || "Something went wrong"}
                </p>
              ) : null}

              <div className="mt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowReclaim((v) => !v)}
                  className="w-full text-center text-[11px] font-bold text-[#9AA0B4] underline-offset-2 hover:text-[#F5C518] hover:underline disabled:opacity-40"
                >
                  {showReclaim ? "Hide reclaim" : "Already paid? Reclaim with tx hash"}
                </button>
                {showReclaim ? (
                  <div className="mt-2 space-y-2 rounded-2xl border border-white/10 bg-black/35 p-2.5">
                    <p className="text-[10px] font-bold text-[#9AA0B4]">
                      Only works for a real treasury payment you already sent.
                    </p>
                    <input
                      value={reclaimHash}
                      onChange={(e) => setReclaimHash(e.target.value.trim())}
                      placeholder="0x… paste Basescan tx hash"
                      disabled={busy}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-[11px] text-white outline-none focus:border-[#F5C518]/50 disabled:opacity-50"
                    />
                    <GradientButton
                      className="w-full min-h-10 text-xs"
                      disabled={busy || reclaimHash.length < 66}
                      onClick={() => void onReclaim()}
                    >
                      Reclaim paid tx
                    </GradientButton>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {phase !== "success" ? (
          <div className="shrink-0 border-t border-white/8 bg-black/40 px-3 py-3 sm:px-4 sm:py-4">
            <GradientButton
              className="w-full min-h-12 text-sm"
              disabled={busy || mmPending || !active || !treasury || !googleUser}
              onClick={() => {
                sound.playClick();
                if (!active) return;
                if (payMode === "play") void buyWithPlayWallet(active);
                else void buyWithMetaMask(active);
              }}
            >
              {!googleUser
                ? "Sign in to buy"
                : busy || mmPending
                  ? phase === "await_wallet"
                    ? payMode === "wallet"
                      ? "Confirm in MetaMask…"
                      : "Sending…"
                    : "Working…"
                  : !treasury
                    ? "Treasury offline"
                    : canAfford === false && payMode === "wallet"
                      ? "Not enough ETH"
                      : `Pay ${active?.ethLabel ?? ""} ETH → ${active?.chips.toLocaleString() ?? ""} chips`}
            </GradientButton>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="mt-2 w-full py-2 text-center text-xs font-bold text-[#9AA0B4] transition hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>
            <p className="mt-0.5 text-center text-[10px] text-[#6b7084]">
              No chips without a verified tx · Esc closes when idle
            </p>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
