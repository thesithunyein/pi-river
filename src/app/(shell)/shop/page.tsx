"use client";

import { useState } from "react";
import {
  CheckIcon,
  CoinIcon,
  DiamondIcon,
  ShopBagIcon,
  SpadeIcon,
  TableIcon,
} from "@/components/icons";
import { useGame } from "@/context/GameContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";

const cardBacks = [
  {
    id: "classic",
    name: "Midnight Classic",
    price: 0,
    accent: "from-[#1e293b] to-[#020617]",
    mark: "#94a3b8",
  },
  {
    id: "neon",
    name: "Pulse Orbit",
    price: 10000,
    accent: "from-[#0891b2] to-[#1d4ed8]",
    mark: "#67e8f9",
  },
  {
    id: "royal",
    name: "Royal Current",
    price: 25000,
    accent: "from-[#7c3aed] to-[#4c1d95]",
    mark: "#c4b5fd",
  },
  {
    id: "gold",
    name: "Gold Rush",
    price: 50000,
    accent: "from-[#f59e0b] to-[#b45309]",
    mark: "#fde68a",
  },
  {
    id: "flow",
    name: "River Bloom",
    price: 100000,
    accent: "from-[#14b8a6] to-[#0f766e]",
    mark: "#99f6e4",
  },
  {
    id: "inco",
    name: "Lightning Lockup",
    price: 200000,
    accent: "from-[#6366f1] to-[#db2777]",
    mark: "#fbcfe8",
  },
];

const tableFelts = [
  { id: "green", name: "Forest Felt", price: 0, tone: "from-[#14532d] to-[#052e16]", chip: "#86efac" },
  { id: "blue", name: "Deep Current", price: 15000, tone: "from-[#1e3a8a] to-[#0f172a]", chip: "#93c5fd" },
  { id: "purple", name: "Night Velvet", price: 30000, tone: "from-[#581c87] to-[#1e1b4b]", chip: "#d8b4fe" },
  { id: "red", name: "Redline Room", price: 50000, tone: "from-[#7f1d1d] to-[#450a0a]", chip: "#fda4af" },
];

function CardBackArt({ mark }: { mark: string }) {
  return (
    <div className="relative mx-auto aspect-[5/7] w-28 overflow-hidden rounded-[18px] border border-white/25 bg-black/25 shadow-lg">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 9px)",
        }}
      />
      <div className="absolute inset-[7px] rounded-[12px] border border-white/18" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
          style={{ borderColor: mark, color: mark, background: "rgba(0,0,0,0.4)" }}
        >
          <SpadeIcon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function FeltArt({ tone, chip }: { tone: string; chip: string }) {
  return (
    <div className={`relative h-16 w-24 overflow-hidden rounded-[18px] border border-white/15 bg-gradient-to-br ${tone}`}>
      <div className="absolute inset-2 rounded-full border border-white/10" />
      <div
        className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{ borderColor: chip, background: `${chip}33` }}
      />
      <TableIcon className="absolute bottom-1 right-1 h-4 w-4 text-white/50" />
    </div>
  );
}

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
        eyebrow="Locker"
        title="Style your table"
        description="Spend chips on card backs and felt. Cosmetics only."
      />

      {notice ? (
        <div className="rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/10 px-4 py-3 text-sm font-bold text-white">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <GlassCard accent="gold" className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5C518]/15 text-[#F5C518]">
              <CoinIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9AA0B4]">Chips</p>
              <p className="font-mono text-2xl font-black tabular-nums text-white">{chips.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard accent="purple" className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7B5CFF]/15 text-[#B9A8FF]">
              <DiamondIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9AA0B4]">XP</p>
              <p className="font-mono text-2xl font-black tabular-nums text-white">{xp.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-[#F5C518]">
            <ShopBagIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5C518]">Deck</p>
            <h2 className="text-xl font-black text-white">Card backs</h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cardBacks.map((item) => {
            const owned = ownedCardBacks.includes(item.id);
            const equipped = equippedCardBack === item.id;

            return (
              <div
                key={item.id}
                className="rounded-[26px] border border-white/8 bg-[#12101c] p-4"
              >
                <div className={`rounded-[22px] bg-gradient-to-br ${item.accent} p-4`}>
                  <CardBackArt mark={item.mark} />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-[#9AA0B4]">
                      {item.price === 0 ? "Free" : `${item.price.toLocaleString()} chips`}
                    </p>
                  </div>
                  {equipped ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#F5C518]/30 bg-[#F5C518]/10 px-2.5 py-1 text-[11px] font-bold text-[#F5C518]">
                      <CheckIcon className="h-3.5 w-3.5" />
                      Active
                    </span>
                  ) : (
                    <GradientButton
                      variant={owned ? "secondary" : "primary"}
                      className="min-h-9 px-3 py-2 text-xs"
                      onClick={() => {
                        if (owned) {
                          equipCardBack(item.id);
                          announce(`${item.name} equipped.`);
                        } else {
                          announce(
                            buyCardBack(item.id, item.price)
                              ? `${item.name} unlocked.`
                              : "Not enough chips."
                          );
                        }
                      }}
                    >
                      {owned ? "Equip" : "Buy"}
                    </GradientButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-[#86efac]">
            <TableIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5C518]">Room</p>
            <h2 className="text-xl font-black text-white">Table felts</h2>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {tableFelts.map((item) => {
            const owned = ownedTableFelts.includes(item.id);
            const equipped = equippedTableFelt === item.id;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-[24px] border border-white/8 bg-[#12101c] p-4"
              >
                <div className="flex items-center gap-4">
                  <FeltArt tone={item.tone} chip={item.chip} />
                  <div>
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-[#9AA0B4]">
                      {item.price === 0 ? "Free" : `${item.price.toLocaleString()} chips`}
                    </p>
                  </div>
                </div>
                {equipped ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#F5C518]/30 bg-[#F5C518]/10 px-2.5 py-1 text-[11px] font-bold text-[#F5C518]">
                    <CheckIcon className="h-3.5 w-3.5" />
                    Active
                  </span>
                ) : (
                  <GradientButton
                    variant={owned ? "secondary" : "primary"}
                    className="min-h-9 px-3 py-2 text-xs"
                    onClick={() => {
                      if (owned) {
                        equipTableFelt(item.id);
                        announce(`${item.name} equipped.`);
                      } else {
                        announce(
                          buyTableFelt(item.id, item.price)
                            ? `${item.name} unlocked.`
                            : "Not enough chips."
                        );
                      }
                    }}
                  >
                    {owned ? "Equip" : "Buy"}
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
