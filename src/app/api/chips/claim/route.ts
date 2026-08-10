import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBotAccount, getBotPublicClient } from "@/lib/bot/wallet";
import { CHIP_PACKS, chipPackById, chipPackForWei, type ChipPackDef } from "@/lib/stickers";
import {
  ECONOMY_VERSION,
  mergeProgressAgainstExisting,
  payloadToRow,
  rowToPayload,
  type ProgressPayload,
} from "@/lib/progressSync";
import { CLOUD_META_KEY, fromCompactCloud, toCompactCloud } from "@/lib/cloudProgress";
import type { Hex } from "viem";

export const runtime = "nodejs";
export const maxDuration = 60;

function isTxHash(raw: unknown): raw is Hex {
  return typeof raw === "string" && /^0x[a-fA-F0-9]{64}$/.test(raw);
}

function isMissingTable(message: string) {
  return /relation|does not exist|schema cache/i.test(message);
}

function readClaimedTxs(payload: ProgressPayload | null): string[] {
  const fromProfile = (payload?.profile as { claimedChipTxs?: unknown } | undefined)?.claimedChipTxs;
  if (Array.isArray(fromProfile)) return fromProfile.map(String).filter(Boolean).slice(0, 40);
  return [];
}

function withClaimedTx(payload: ProgressPayload, txHash: string): ProgressPayload {
  const prev = readClaimedTxs(payload);
  const next = [txHash.toLowerCase(), ...prev.filter((h) => h !== txHash.toLowerCase())].slice(0, 40);
  return {
    ...payload,
    profile: {
      ...payload.profile,
      claimedChipTxs: next,
    } as ProgressPayload["profile"] & { claimedChipTxs: string[] },
  };
}

/** Credit pack chips onto player_progress + auth meta. Returns new balance. */
async function creditChipsToProgress(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  chipsGranted: number,
  txHash: string,
  userMeta: Record<string, unknown> | undefined
): Promise<{ newBalance: number; lifetimeChipsBought: number; alreadyApplied: boolean }> {
  let existing: ProgressPayload | null = null;
  const existingRes = await supabase
    .from("player_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!existingRes.error && existingRes.data) {
    existing = rowToPayload(existingRes.data as Record<string, unknown>);
  } else {
    existing = fromCompactCloud(userMeta?.[CLOUD_META_KEY]) ?? null;
  }

  if (readClaimedTxs(existing).includes(txHash.toLowerCase())) {
    return {
      newBalance: Math.max(0, Math.floor(Number(existing?.chips) || 0)),
      lifetimeChipsBought: Math.max(0, Math.floor(Number(existing?.lifetimeChipsBought) || 0)),
      alreadyApplied: true,
    };
  }

  const base: ProgressPayload =
    existing ||
    ({
      chips: 0,
      xp: 0,
      vipTier: "Bronze",
      equippedCardBack: "classic",
      equippedTableFelt: "green",
      ownedCardBacks: ["classic"],
      ownedTableFelts: ["green"],
      lastDailyBonusTime: null,
      rewardTrackDay: 1,
      stats: {
        handsPlayed: 0,
        gamesWon: 0,
        biggestWin: 0,
        currentStreak: 0,
        totalEarnings: 0,
      },
      matchHistory: [],
      soundEnabled: true,
      musicEnabled: true,
      profile: { displayName: "Player" },
      megapotCredits: 0,
      ticketsMinted: 0,
      missionProgress: {},
      missionsClaimed: [],
      ownedFrames: ["none"],
      ownedStickerPacks: [],
      achievementsClaimed: [],
      lifetimeChipsBought: 0,
      economyVersion: ECONOMY_VERSION,
    } satisfies ProgressPayload);

  const lifetimeChipsBought =
    Math.max(0, Math.floor(Number(base.lifetimeChipsBought) || 0)) + chipsGranted;
  const newBalance = Math.max(0, Math.floor(Number(base.chips) || 0)) + chipsGranted;

  let next: ProgressPayload = {
    ...base,
    chips: newBalance,
    lifetimeChipsBought,
    economyVersion: ECONOMY_VERSION,
  };
  next = withClaimedTx(next, txHash);

  const payload = mergeProgressAgainstExisting(next, existing);
  payload.chips = Math.max(payload.chips, newBalance);
  payload.lifetimeChipsBought = Math.max(
    Math.floor(Number(payload.lifetimeChipsBought) || 0),
    lifetimeChipsBought
  );
  Object.assign(payload, withClaimedTx(payload, txHash));

  const compact = toCompactCloud(payload);
  const meta = { ...(userMeta || {}), [CLOUD_META_KEY]: compact };
  await supabase.auth.updateUser({ data: meta });

  const row = payloadToRow(userId, payload);
  let upsert = await supabase.from("player_progress").upsert(row, { onConflict: "user_id" });
  if (
    upsert.error &&
    /owned_frames|owned_stickers|column .* does not exist|schema cache/i.test(upsert.error.message)
  ) {
    const rowSafe = { ...(row as Record<string, unknown>) };
    delete rowSafe.owned_frames;
    delete rowSafe.owned_stickers;
    upsert = await supabase.from("player_progress").upsert(rowSafe, { onConflict: "user_id" });
  }

  return {
    newBalance: payload.chips,
    lifetimeChipsBought: Math.floor(Number(payload.lifetimeChipsBought) || lifetimeChipsBought),
    alreadyApplied: false,
  };
}

function resolvePack(packId: string | undefined, paidWei: bigint): ChipPackDef | null {
  const byId = chipPackById(String(packId || ""));
  if (byId && paidWei >= byId.ethWei) return byId;
  const byWei = chipPackForWei(paidWei);
  return byWei || byId || null;
}

/**
 * MetaMask smart accounts / EIP-7702 often send value=0 to a DelegationManager
 * and an *internal* call moves ETH to treasury. Resolve paid wei to treasury.
 */
async function paidWeiToTreasury(
  txHash: Hex,
  treasury: `0x${string}`,
  directTo: string | null | undefined,
  directValue: bigint,
  inputData?: Hex | string | null
): Promise<{ paidWei: bigint; fromAddress: string | null }> {
  const t = treasury.toLowerCase();
  if (directTo && directTo.toLowerCase() === t && directValue > 0n) {
    return { paidWei: directValue, fromAddress: null };
  }

  // Fast path: decode MetaMask / 7702 calldata (treasury address + amount appear inline)
  const fromCalldata = paidWeiFromCalldata(inputData, t);
  if (fromCalldata > 0n) {
    return { paidWei: fromCalldata, fromAddress: null };
  }

  // Blockscout (Base Sepolia) — internal-tx index for AA / 7702
  try {
    const url = `https://base-sepolia.blockscout.com/api?module=account&action=txlistinternal&txhash=${txHash}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as {
        status?: string;
        result?: Array<{ to?: string; value?: string; from?: string; isError?: string }>;
      };
      if (data.status === "1" && Array.isArray(data.result)) {
        let paid = 0n;
        let from: string | null = null;
        for (const row of data.result) {
          if (row.isError === "1") continue;
          if ((row.to || "").toLowerCase() !== t) continue;
          const v = BigInt(row.value || "0");
          if (v <= 0n) continue;
          paid += v;
          from = (row.from || "").toLowerCase() || from;
        }
        if (paid > 0n) return { paidWei: paid, fromAddress: from };
      }
    }
  } catch {
    // fall through
  }

  // Blockscout v2 shapes
  try {
    const url = `https://base-sepolia.blockscout.com/api/v2/transactions/${txHash}/internal-transactions`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as {
        items?: Array<{
          success?: boolean;
          value?: string;
          to?: { hash?: string } | string;
          from?: { hash?: string } | string;
        }>;
      };
      let paid = 0n;
      let from: string | null = null;
      for (const row of data.items || []) {
        if (row.success === false) continue;
        const to = typeof row.to === "string" ? row.to : row.to?.hash || "";
        if (to.toLowerCase() !== t) continue;
        const v = BigInt(row.value || "0");
        if (v <= 0n) continue;
        paid += v;
        const f = typeof row.from === "string" ? row.from : row.from?.hash || "";
        from = f.toLowerCase() || from;
      }
      if (paid > 0n) return { paidWei: paid, fromAddress: from };
    }
  } catch {
    // fall through
  }

  return { paidWei: 0n, fromAddress: null };
}

/** Pull ETH amount(s) to treasury embedded in smart-account / delegation calldata. */
function paidWeiFromCalldata(inputData: Hex | string | null | undefined, treasuryNo0x: string): bigint {
  if (!inputData || typeof inputData !== "string" || inputData.length < 100) return 0n;
  const input = inputData.toLowerCase().replace(/^0x/, "");
  const needle = treasuryNo0x.replace(/^0x/, "").toLowerCase();
  if (needle.length !== 40) return 0n;

  const knownPackWeis = new Set(CHIP_PACKS.map((p) => p.ethWei.toString()));
  let best = 0n;
  let idx = 0;
  while (idx < input.length) {
    const i = input.indexOf(needle, idx);
    if (i < 0) break;
    // Value often sits in the next 32-byte word after the address bytes
    const after = input.slice(i + 40, i + 40 + 64);
    if (/^[0-9a-f]{64}$/.test(after)) {
      try {
        const v = BigInt(`0x${after}`);
        if (v > 0n && v < 10n ** 18n) {
          if (knownPackWeis.has(v.toString()) || v >= CHIP_PACKS[0].ethWei) {
            if (v > best) best = v;
          }
        }
      } catch {
        // ignore
      }
    }
    idx = i + 1;
  }
  return best;
}

/**
 * Verify a Base Sepolia ETH payment to the house treasury and grant fun chips once.
 * Credits player_progress on the server so UI sync can't wipe the deposit.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  let body: { packId?: string; txHash?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isTxHash(body.txHash)) {
    return NextResponse.json({ ok: false, error: "Valid txHash required" }, { status: 400 });
  }

  const house = getBotAccount();
  if (!house) {
    return NextResponse.json({ ok: false, error: "Treasury not configured" }, { status: 503 });
  }

  const userMeta = user.user_metadata as Record<string, unknown> | undefined;
  const txHash = body.txHash;

  // Already have a payment receipt?
  const existing = await supabase
    .from("chip_payments")
    .select("chips_granted, pack_id, user_id")
    .eq("tx_hash", txHash.toLowerCase())
    .maybeSingle();
  if (!existing.error && existing.data) {
    if (existing.data.user_id && existing.data.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "This payment was already used" }, { status: 409 });
    }
    const granted = Number(existing.data.chips_granted) || 0;
    const pack =
      chipPackById(String(existing.data.pack_id || body.packId || "")) ||
      CHIP_PACKS.find((p) => p.chips === granted) ||
      chipPackById("starter");
    const credited = await creditChipsToProgress(
      supabase,
      user.id,
      granted || pack?.chips || 0,
      txHash,
      userMeta
    );
    return NextResponse.json({
      ok: true,
      alreadyClaimed: credited.alreadyApplied,
      chipsGranted: granted || pack?.chips || 0,
      packId: existing.data.pack_id || pack?.id,
      newBalance: credited.newBalance,
      lifetimeChipsBought: credited.lifetimeChipsBought,
    });
  }

  const client = getBotPublicClient();
  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 90_000,
    });
  } catch {
    // One retry getTransaction in case wait timed out but tx exists
    try {
      receipt = await client.getTransactionReceipt({ hash: txHash });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Transaction not found yet — wait a few seconds and reclaim with the tx hash",
        },
        { status: 404 }
      );
    }
  }

  if (receipt.status !== "success") {
    return NextResponse.json({ ok: false, error: "Transaction failed on-chain" }, { status: 400 });
  }

  const tx = await client.getTransaction({ hash: txHash });
  const paid = await paidWeiToTreasury(
    txHash,
    house.address,
    tx.to,
    tx.value,
    tx.input
  );
  if (paid.paidWei <= 0n) {
    return NextResponse.json(
      {
        ok: false,
        error: `No ETH reached treasury ${house.address} in this tx (MetaMask smart-account internal transfers are supported — wait a few seconds and reclaim)`,
      },
      { status: 400 }
    );
  }

  const pack = resolvePack(body.packId, paid.paidWei);
  if (!pack) {
    return NextResponse.json(
      {
        ok: false,
        error: `Payment too small — send at least ${CHIP_PACKS[0].ethLabel} ETH to treasury`,
      },
      { status: 400 }
    );
  }

  const row = {
    tx_hash: txHash.toLowerCase(),
    user_id: user.id,
    pack_id: pack.id,
    chips_granted: pack.chips,
    eth_wei: paid.paidWei.toString(),
    from_address: (paid.fromAddress || tx.from || "").toLowerCase() || null,
  };

  let receiptOk = false;
  let needsMigration = false;
  const { error: insertError } = await supabase.from("chip_payments").insert(row);
  if (insertError) {
    if (/duplicate|unique/i.test(insertError.message)) {
      const credited = await creditChipsToProgress(
        supabase,
        user.id,
        pack.chips,
        txHash,
        userMeta
      );
      return NextResponse.json({
        ok: true,
        alreadyClaimed: credited.alreadyApplied,
        chipsGranted: pack.chips,
        packId: pack.id,
        newBalance: credited.newBalance,
        lifetimeChipsBought: credited.lifetimeChipsBought,
      });
    }
    if (isMissingTable(insertError.message)) {
      needsMigration = true;
    } else {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }
  } else {
    receiptOk = true;
  }

  let credited: { newBalance: number; lifetimeChipsBought: number; alreadyApplied: boolean };
  try {
    credited = await creditChipsToProgress(supabase, user.id, pack.chips, txHash, userMeta);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not credit chips";
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        chipsGranted: pack.chips,
        paymentVerified: true,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    chipsGranted: pack.chips,
    packId: pack.id,
    txHash,
    newBalance: credited.newBalance,
    lifetimeChipsBought: credited.lifetimeChipsBought,
    alreadyClaimed: credited.alreadyApplied,
    receiptOk,
    needsMigration,
  });
}
