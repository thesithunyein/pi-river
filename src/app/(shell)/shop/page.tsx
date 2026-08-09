"use client";

import { useState } from "react";
import {
  CheckIcon,
  DiamondIcon,
  LockIncoIcon,
  ShopBagIcon,
  SpadeIcon,
  TableIcon,
} from "@/components/icons";
import { useGame } from "@/context/GameContext";
import {
  CARD_BACKS,
  TABLE_FELTS,
  cardPatternCss,
  type CardPattern,
} from "@/lib/cosmetics";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PremiumChip } from "@/components/PremiumChip";
import { PremiumPageShell } from "@/components/ui/PremiumPageShell";

function Glyph({ kind, className }: { kind: string; className?: string }) {
  if (kind === "lock") return <LockIncoIcon className={className} />;
  if (kind === "diamond") return <DiamondIcon className={className} />;
  return <SpadeIcon className={className} />;
}

function CardBackArt({
  mark,
  accent,
  pattern,
  glyph,
}: {
  mark: string;
  accent: string;
  pattern: CardPattern;
  glyph: string;
}) {
  return (
    <div
      className={`relative mx-auto aspect-[5/7] w-28 overflow-hidden rounded-[18px] border border-white/25 bg-gradient-to-br ${accent} shadow-[0_14px_36px_rgba(0,0,0,0.45)]`}
    >
      <div
        className="absolute inset-0 opacity-55"
        style={{ backgroundImage: cardPatternCss(pattern, mark) }}
      />
      <div
        className="absolute inset-[7px] rounded-[12px] border"
        style={{ borderColor: `${mark}55` }}
      />
      <div
        className="absolute inset-[11px] rounded-[10px] border border-dashed opacity-40"
        style={{ borderColor: mark }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
          style={{ borderColor: mark, color: mark, background: "rgba(0,0,0,0.45)" }}
        >
          <Glyph kind={glyph} className="h-6 w-6" />
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-x-3 top-3 h-8 rounded-full opacity-30 blur-md"
        style={{ background: `linear-gradient(90deg, transparent, ${mark}, transparent)` }}
      />
    </div>
  );
}

function FeltArt({
  tone,
  chip,
  felt,
  rail,
}: {
  tone: string;
  chip: string;
  felt?: string;
  rail?: string;
}) {
  return (
    <div
      className={`relative h-20 w-32 overflow-hidden rounded-[20px] border shadow-[0_12px_28px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] ${
        felt ? "border-white/15" : `border-white/15 bg-gradient-to-br ${tone}`
      }`}
      style={felt ? { background: felt } : undefined}
    >
      <div
        className="absolute inset-[5px] rounded-[14px] border"
        style={{ borderColor: `${rail ?? chip}55` }}
      />
      <div className="absolute inset-[10px] rounded-full border border-white/15" />
      <div
        className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
        style={{ borderColor: chip, background: `${chip}44` }}
      />
      <div
        className="absolute bottom-1.5 left-2 right-2 h-1 rounded-full opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${rail ?? chip}, transparent)` }}
      />
      <TableIcon className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-white/45" />
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
    onchainChips,
  } = useGame();
  const [notice, setNotice] = useState<string | null>(null);

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2200);
  };

  return (
    <PremiumPageShell tone="gold">
      <SectionHeader
        eyebrow="Boutique"
        title="Style the table"
        description="Buys spend chips; your seat burns rCHIP on-chain (not the house)."
      />

      {notice ? (
        <div className="rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/10 px-4 py-3 text-sm font-bold text-white">
          {notice}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-[32px] border border-[#F5C518]/25 bg-gradient-to-br from-[#3a2a08] via-[#1a1520] to-[#0d0b14] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#F5C518]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-0 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
            <span className="flex h-12 w-12 items-center justify-center">
              <PremiumChip size={48} tone="gold" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9AA0B4]">Your chips</p>
              <p className="font-mono text-2xl font-black tabular-nums text-white">{chips.toLocaleString()}</p>
              <p className="mt-1 text-[10px] font-semibold text-[#9AA0B4]">
                {onchainChips != null
                  ? `On-chain rCHIP: ${onchainChips.toLocaleString()}`
                  : "On-chain rCHIP syncs after Google play"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5C518]/12 text-[#F5C518]">
              <DiamondIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9AA0B4]">XP</p>
              <p className="font-mono text-2xl font-black tabular-nums text-white">{xp.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <GlassCard accent="gold" className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#F5C518]/25 bg-[#F5C518]/12 text-[#F5C518]">
            <ShopBagIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5C518]">Deck</p>
            <h2 className="text-xl font-black text-white">Card backs</h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CARD_BACKS.map((item) => {
            const owned = ownedCardBacks.includes(item.id);
            const equipped = equippedCardBack === item.id;

            return (
              <div
                key={item.id}
                className="soft-card-hover group rounded-[28px] border border-white/10 bg-gradient-to-b from-[#1c1a24] to-[#100e16] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.35)]"
              >
                <div className={`rounded-[22px] bg-gradient-to-br ${item.accent} p-4`}>
                  <CardBackArt
                    mark={item.mark}
                    accent={item.accent}
                    pattern={item.pattern}
                    glyph={item.glyph}
                  />
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
                          announce(`${item.name} equipped — opens at your next table.`);
                        } else {
                          const ok = buyCardBack(item.id, item.price);
                          announce(
                            ok
                              ? `${item.name} bought & equipped.`
                              : `Need ${item.price.toLocaleString()} chips.`
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

      <GlassCard accent="green" className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-[#86efac]">
            <TableIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#86efac]">Room</p>
            <h2 className="text-xl font-black text-white">Table felts</h2>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {TABLE_FELTS.map((item) => {
            const owned = ownedTableFelts.includes(item.id);
            const equipped = equippedTableFelt === item.id;

            return (
              <div
                key={item.id}
                className="soft-card-hover flex items-center justify-between gap-4 rounded-[26px] border border-white/10 bg-gradient-to-r from-[#1c1a24] to-[#100e16] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center gap-4">
                  <FeltArt tone={item.tone} chip={item.chip} felt={item.felt} rail={item.rail} />
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
                        announce(`${item.name} equipped — opens at your next table.`);
                      } else {
                        const ok = buyTableFelt(item.id, item.price);
                        announce(
                          ok
                            ? `${item.name} bought & equipped.`
                            : `Need ${item.price.toLocaleString()} chips.`
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
    </PremiumPageShell>
  );
}
