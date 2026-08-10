import { NextResponse } from "next/server";
import { getBotAccount } from "@/lib/bot/wallet";
import { CHIP_PACKS } from "@/lib/stickers";

/** Public chip pack catalog + treasury address for Base Sepolia payments. */
export async function GET() {
  const house = getBotAccount();
  return NextResponse.json({
    ok: true,
    chainId: 84532,
    chainName: "Base Sepolia",
    treasury: house?.address ?? null,
    packs: CHIP_PACKS.map((p) => ({
      id: p.id,
      name: p.name,
      blurb: p.blurb,
      ethLabel: p.ethLabel,
      ethWei: p.ethWei.toString(),
      chips: p.chips,
      badge: p.badge ?? null,
    })),
  });
}
