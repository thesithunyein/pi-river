"use client";

import { useState } from "react";
import { CardsIcon, CheckIcon, CoinIcon, DiamondIcon, ShirtIcon } from "@/components/icons";
import { useGame } from "@/context/GameContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";

const cardBacks = [
  { id: "classic", name: "Midnight Classic", price: 0, accent: "from-slate-700 to-slate-900" },
  { id: "neon", name: "Pulse Orbit", price: 10000, accent: "from-cyan-500 to-blue-700" },
  { id: "royal", name: "Royal Current", price: 25000, accent: "from-violet-500 to-purple-700" },
  { id: "gold", name: "Gold Rush", price: 50000, accent: "from-amber-400 to-orange-500" },
  { id: "flow", name: "River Bloom", price: 100000, accent: "from-teal-500 to-cyan-700" },
  { id: "inco", name: "Lightning Lockup", price: 200000, accent: "from-indigo-500 to-fuchsia-600" },
];

const tableFelts = [
  { id: "green", name: "Forest Felt", price: 0, tone: "bg-[rgb(32,89,62)]" },
  { id: "blue", name: "Deep Current", price: 15000, tone: "bg-[#16396F]" },
  { id: "purple", name: "Night Velvet", price: 30000, tone: "bg-[#31205B]" },
  { id: "red", name: "Redline Room", price: 50000, tone: "bg-[#5A1F2E]" },
];

export default function ShopPage() {
  const {
    chips,
    xp,
    equippedCardBack,
    equippedTableFelt,
    ownedCardBacks,
    ownedTableFelts,
    buyCardBack,
    buyTableFelt,
    equipCardBack,
    equipTableFelt,
  } = useGame();
  const [notice, setNotice] = useState<string | null>(null);

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 1800);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Shop"
        title="Clothings and accessories"
        description="Unlock premium card backs and felt sets with local chip balances. Cosmetics persist in game state and style the table route."
      />

      {notice ? (
        <div className="rounded-2xl border border-river-violet/25 bg-river-violet/12 px-4 py-3 text-sm font-bold text-river-white">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard accent="gold" className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-river-gold/10 text-river-gold">
              <CoinIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-river-grey">Chip Balance</p>
              <p className="font-mono text-2xl font-bold tabular-nums text-river-white">{chips.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard accent="purple" className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-river-violet/10 text-river-violet">
              <DiamondIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-river-grey">Progress</p>
              <p className="font-mono text-2xl font-bold tabular-nums text-river-white">{xp.toLocaleString()} XP</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="space-y-5">
        <SectionHeader
          eyebrow="Clothings"
          title="Card backs"
          description="Each back changes the hidden card treatment on the table."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cardBacks.map((item) => {
            const owned = ownedCardBacks.includes(item.id);
            const equipped = equippedCardBack === item.id;

            return (
              <div
                key={item.id}
                className="rounded-[26px] border border-river-line/15 bg-river-bg1/55 p-4 shadow-mi-panel"
              >
                <div className={`rounded-[22px] bg-gradient-to-br ${item.accent} p-4`}>
                  <div className="mx-auto flex aspect-[5/7] w-28 items-center justify-center rounded-[22px] border border-white/20 bg-black/10">
                    <CardsIcon className="h-9 w-9 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-river-white">{item.name}</p>
                    <p className="font-mono text-xs tabular-nums text-river-grey">
                      {item.price === 0 ? "Included" : `${item.price.toLocaleString()} chips`}
                    </p>
                  </div>
                  {equipped ? (
                    <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-river-violet/25 bg-river-violet/10 px-3 text-xs font-bold text-river-white">
                      <CheckIcon className="h-4 w-4" />
                      Active
                    </span>
                  ) : (
                    <GradientButton
                      variant={owned ? "secondary" : "primary"}
                      className="px-4 py-2 text-xs"
                      onClick={() => {
                        if (owned) {
                          equipCardBack(item.id);
                          announce(`${item.name} equipped.`);
                        } else {
                          announce(
                            buyCardBack(item.id, item.price)
                              ? `${item.name} unlocked.`
                              : "Not enough chips for this card back."
                          );
                        }
                      }}
                    >
                      {owned ? "Equip" : "Unlock"}
                    </GradientButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="space-y-5">
        <SectionHeader
          eyebrow="Accessories"
          title="Table felts"
          description="Felt themes set the mood for the `/table` experience."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {tableFelts.map((item) => {
            const owned = ownedTableFelts.includes(item.id);
            const equipped = equippedTableFelt === item.id;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-[26px] border border-river-line/15 bg-river-bg1/55 p-4 shadow-mi-panel"
              >
                <div className="flex items-center gap-4">
                  <div className={`h-16 w-24 rounded-[20px] border border-white/10 ${item.tone}`} />
                  <div>
                    <p className="text-sm font-bold text-river-white">{item.name}</p>
                    <p className="font-mono text-xs tabular-nums text-river-grey">
                      {item.price === 0 ? "Included" : `${item.price.toLocaleString()} chips`}
                    </p>
                  </div>
                </div>
                {equipped ? (
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-river-violet/25 bg-river-violet/10 px-3 text-xs font-bold text-river-white">
                    <CheckIcon className="h-4 w-4" />
                    Active
                  </span>
                ) : (
                  <GradientButton
                    variant={owned ? "secondary" : "primary"}
                    className="px-4 py-2 text-xs"
                    onClick={() => {
                      if (owned) {
                        equipTableFelt(item.id);
                        announce(`${item.name} equipped.`);
                      } else {
                        announce(
                          buyTableFelt(item.id, item.price)
                            ? `${item.name} unlocked.`
                            : "Not enough chips for this felt."
                        );
                      }
                    }}
                    icon={<ShirtIcon className="h-4 w-4" />}
                  >
                    {owned ? "Equip" : "Unlock"}
                  </GradientButton>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
