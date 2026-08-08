import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { botReclaimFunds, botHasBuyIn } from "@/lib/bot/reclaim";
import { ensureShuffleFees, shuffleFeeShortfall } from "@/lib/bot/fees";
import { BOT_BUY_IN, getBotAccount, getBotPublicClient } from "@/lib/bot/wallet";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Pull stuck bot chips back and prefund shuffle fees so Quick Play can run. */
export async function POST() {
  try {
    const account = getBotAccount();
    if (!account) {
      return NextResponse.json({ error: "Bot not configured." }, { status: 503 });
    }
    const result = await botReclaimFunds({ maxTables: 20 });
    const client = getBotPublicClient();
    let balance = result.balance ?? (await client.getBalance({ address: account.address }));

    let feeFunded = false;
    let feeShortfall = "0";
    try {
      // Prefund as if a bot buy-in is about to land
      const shortfall = await shuffleFeeShortfall(BOT_BUY_IN);
      feeShortfall = formatEther(shortfall);
      if (shortfall > 0n && balance > shortfall + BOT_BUY_IN) {
        const funded = await ensureShuffleFees(BOT_BUY_IN);
        feeFunded = funded.funded;
        balance = await client.getBalance({ address: account.address });
      }
    } catch {
      // join path will surface fee errors
    }

    return NextResponse.json({
      ok: true,
      ready: botHasBuyIn(balance),
      balanceEth: formatEther(balance),
      reclaimedEth: formatEther(result.reclaimed),
      feeFunded,
      feeShortfallEth: feeShortfall,
      actions: result.actions,
      stuckHuman: result.stuckHuman ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Wake failed." },
      { status: 500 }
    );
  }
}
