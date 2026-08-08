"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Hex, WalletClient } from "viem";
import { useAuthGate } from "@/components/AuthGate";
import {
  ensurePlayWalletFunded,
  getPlayAddress,
  getPlayPublicClient,
  getPlayWalletClient,
  playWriteContract,
} from "@/lib/wallet/playWallet";

/**
 * Prefer Google-bound silent play wallet for on-chain acts.
 * Falls back to null when no Google session (external wallet path).
 */
export function usePlaySession() {
  const { googleUser } = useAuthGate();
  const googleUserId = googleUser?.id ?? null;
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!googleUserId) {
      setAddress(null);
      setReady(true);
      return;
    }
    try {
      setAddress(getPlayAddress(googleUserId));
    } catch {
      setAddress(null);
    }
    setReady(true);
  }, [googleUserId]);

  const walletClient = useMemo((): WalletClient | null => {
    if (!googleUserId) return null;
    try {
      return getPlayWalletClient(googleUserId);
    } catch {
      return null;
    }
  }, [googleUserId]);

  const publicClient = useMemo(() => getPlayPublicClient(), []);

  const ensureFunded = useCallback(async () => {
    if (!googleUserId) throw new Error("Sign in with Google to play.");
    return ensurePlayWalletFunded(googleUserId);
  }, [googleUserId]);

  const writeContract = useCallback(
    async (params: {
      address: `0x${string}`;
      abi: readonly unknown[] | unknown[];
      functionName: string;
      args?: readonly unknown[];
      value?: bigint;
    }) => {
      if (!googleUserId) throw new Error("Sign in with Google to play.");
      return playWriteContract(googleUserId, params as never);
    },
    [googleUserId]
  );

  const waitForTx = useCallback(
    async (hash: Hex) => {
      return publicClient.waitForTransactionReceipt({ hash });
    },
    [publicClient]
  );

  return {
    googleUserId,
    silent: Boolean(googleUserId && address),
    ready,
    address,
    walletClient,
    publicClient,
    ensureFunded,
    writeContract,
    waitForTx,
  };
}
