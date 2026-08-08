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
import { CARD_BACKS, TABLE_FELTS } from "@/lib/cosmetics";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";

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
    window.setTimeout(() => setNotice(null), 2200);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Style up"
        title="Shop"
        description="Buy with fun chips. Cosmetics save to your Google account on this device and show at the table."
      />

      {notice ? (
        <div className="rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/10 px-4 py-3 text-sm font-bold text-white">
          {notice}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-[28px] border border-[#F5C518]/20 bg-gradient-to-br from-[#2a2210] via-[#161322] to-[#0f0d18] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[#F5C518]/15 blur-3xl" />
        <div className="relative grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5C518]/15 text-[#F5C518]">
              <CoinIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9AA0B4]">Your chips</p>
              <p className="font-mono text-2xl font-black tabular-nums text-white">{chips.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7B5CFF]/15 text-[#B9A8FF]">
              <DiamondIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9AA0B4]">XP level fuel</p>
              <p className="font-mono text-2xl font-black tabular-nums text-white">{xp.toLocaleString()}</p>
            </div>
          </div>
        </div>
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
          {CARD_BACKS.map((item) => {
            const owned = ownedCardBacks.includes(item.id);
            const equipped = equippedCardBack === item.id;

            return (
              <div
                key={item.id}
                className="soft-card-hover rounded-[26px] border border-white/8 bg-[#12101c] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
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
          {TABLE_FELTS.map((item) => {
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
    </div>
  );
}
