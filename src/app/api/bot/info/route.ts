import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { BOT_BUY_IN, getBotAccount, getBotPublicClient } from "@/lib/bot/wallet";
import { botHasBuyIn, botReclaimFunds } from "@/lib/bot/reclaim";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const account = getBotAccount();
  if (!account) {
    return NextResponse.json(
      { ready: false, funded: false, address: null, message: "Bot wallet not configured." },
      { status: 503 }
    );
  }

  const client = getBotPublicClient();
  let balance = await client.getBalance({ address: account.address });
  let reclaimed = "0";
  let stuckHuman: { tableId: string; toAct: string }[] = [];

  // Auto-wake: pull chips out of abandoned tables before declaring offline
  if (!botHasBuyIn(balance)) {
    try {
      const result = await botReclaimFunds({ maxTables: 16 });
      balance = result.balance ?? (await client.getBalance({ address: account.address }));
      reclaimed = formatEther(result.reclaimed);
      stuckHuman = result.stuckHuman ?? [];
    } catch {
      // ignore reclaim errors — still report balance
      balance = await client.getBalance({ address: account.address });
    }
  }

  const funded = botHasBuyIn(balance);
  const needEth = formatEther(BOT_BUY_IN + 8n * 10n ** 12n);

  return NextResponse.json({
    ready: funded,
    funded,
    address: account.address,
    name: "River Bot",
    balanceEth: formatEther(balance),
    reclaimedEth: reclaimed,
    needEth,
    stuckHuman,
    message: funded
      ? "Ready."
      : stuckHuman.length > 0
        ? "Finish your last hand to unlock the next match."
        : "Matchmaking is busy. Try again shortly.",
  });
}
