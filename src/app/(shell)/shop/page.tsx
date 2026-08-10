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
import { AVATAR_FRAMES } from "@/lib/frames";
import { STICKER_PACKS, HD_STICKERS } from "@/lib/stickers";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PremiumChip } from "@/components/PremiumChip";
import { PremiumPageShell } from "@/components/ui/PremiumPageShell";
import { PublicPlayerAvatar } from "@/components/PublicPlayerAvatar";
import { usePlayerAvatarSrc } from "@/components/PlayerAvatar";
import { BuyChipsModal } from "@/components/BuyChipsModal";
import { sound } from "@/lib/sound";
import Image from "next/image";

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
    equippedCardBack,
    equippedTableFelt,
    ownedCardBacks,
    ownedTableFelts,
    ownedFrames,
    profile,
    buyCardBack,
    buyTableFelt,
    buyFrame,
    buyStickerPack,
    equipCardBack,
    equipTableFelt,
    equipFrame,
    ownedStickerPacks,
    onchainChips,
  } = useGame();
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<"deck" | "felt" | "frames" | "stickers">("deck");
  const [showChain, setShowChain] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const avatarSrc = usePlayerAvatarSrc();

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2200);
  };

  return (
    <PremiumPageShell tone="gold" className="space-y-4">
      <SectionHeader
        eyebrow="Boutique"
        title="Style the table"
        description="Buy with chips. Equip what shows at the table."
      />

      {notice ? (
        <div className="rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/10 px-4 py-3 text-sm font-bold text-white">
          {notice}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#F5C518]/25 bg-gradient-to-r from-[#2a2210] to-[#12101a] px-4 py-3">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setBuyOpen(true);
          }}
          className="flex items-center gap-2.5 text-left"
          title="Buy chips with Base Sepolia ETH"
        >
          <PremiumChip size={36} tone="gold" />
          <div>
            <p className="font-mono text-xl font-black tabular-nums text-white">{chips.toLocaleString()}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#F5C518]">Tap + to buy</p>
          </div>
          <span className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F5C518] text-lg font-black text-black">
            +
          </span>
        </button>
        <div className="text-right">
          <button
            type="button"
            onClick={() => setShowChain((v) => !v)}
            className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B4] hover:text-[#F5C518]"
          >
            {showChain ? "Hide rCHIP" : "On-chain details"}
          </button>
          {showChain ? (
            <p className="mt-1 max-w-[11rem] text-[10px] font-semibold leading-snug text-[#9AA0B4]">
              {onchainChips != null
                ? `${onchainChips.toLocaleString()} rCHIP on seat`
                : "rCHIP syncs after Google play"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1 rounded-[20px] border border-white/10 bg-black/30 p-1">
        {(
          [
            { id: "deck" as const, label: "Deck" },
            { id: "felt" as const, label: "Felt" },
            { id: "frames" as const, label: "Frames" },
            { id: "stickers" as const, label: "HD Stickers" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-11 flex-1 rounded-[16px] text-[10px] font-black tracking-wide transition sm:text-xs ${
              tab === t.id
                ? "bg-gradient-to-b from-[#FFE08A] via-[#F5C518] to-[#E29A12] text-[#1A1400] shadow-[0_8px_20px_rgba(245,197,24,0.3)]"
                : "text-[#9AA0B4] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "deck" ? (
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
      ) : null}

      {tab === "felt" ? (
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
      ) : null}

      {tab === "frames" ? (
      <GlassCard accent="gold" className="space-y-5 overflow-hidden border-[#F5C518]/25 bg-gradient-to-b from-[#2a2210] via-[#161322] to-[#0f0d18]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#F5C518]/25 bg-[#F5C518]/12 text-[#F5C518]">
            <DiamondIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5C518]">Face</p>
            <h2 className="text-xl font-black text-white">Ornate frames</h2>
            <p className="mt-0.5 text-[12px] text-[#9AA0B4]">Gold + gem borders for your seat photo.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {AVATAR_FRAMES.filter((f) => f.id !== "none").map((item) => {
            const owned = ownedFrames.includes(item.id) || ownedFrames.some((id) => id === item.id);
            const equipped = profile.equippedFrame === item.id;

            return (
              <div
                key={item.id}
                className="soft-card-hover group flex items-center gap-4 rounded-[26px] border border-[#F5C518]/15 bg-black/30 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.35)] transition hover:border-[#F5C518]/35"
              >
                <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1a1430] to-[#0a0814]">
                  <PublicPlayerAvatar
                    size={48}
                    displayName={profile.displayName}
                    avatarUrl={avatarSrc}
                    avatarId={profile.avatarId}
                    usePresetAvatar={!avatarSrc}
                    equippedFrame={item.id}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">{item.name}</p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-[#F5C518]">
                    {item.price.toLocaleString()} chips
                  </p>
                  <div className="mt-3">
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
                            equipFrame(item.id);
                            announce(`${item.name} equipped.`);
                          } else {
                            const ok = buyFrame(item.id, item.price);
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
              </div>
            );
          })}
        </div>
      </GlassCard>
      ) : null}

      {tab === "stickers" ? (
        <GlassCard accent="gold" className="space-y-6 overflow-hidden border-[#F5C518]/25">
          <div className="mx-auto max-w-md text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5C518]">Live chat</p>
            <h2 className="mt-1 text-2xl font-black text-white">Premium stickers</h2>
            <p className="mt-1 text-[13px] text-[#9AA0B4]">
              Transparent poker HD · unlock once · send in public club chat
            </p>
          </div>

          <div className="mx-auto grid max-w-lg gap-5">
            {STICKER_PACKS.map((pack) => {
              const owned = ownedStickerPacks.includes(pack.id);
              const preview = HD_STICKERS.filter((s) => s.packId === pack.id);
              return (
                <div
                  key={pack.id}
                  className="rounded-[28px] border border-white/10 bg-gradient-to-b from-[#1c1a24] to-[#100e16] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.35)]"
                >
                  <div className="mx-auto mb-4 grid max-w-sm grid-cols-4 gap-2">
                    {preview.map((s) => (
                      <div
                        key={s.id}
                        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[#F5C518]/15 bg-transparent p-1"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.src}
                          alt={s.label}
                          className="h-full w-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mx-auto max-w-sm text-center">
                    <p className="text-lg font-black text-white">{pack.name}</p>
                    <p className="mt-1 text-[12px] leading-snug text-[#9AA0B4]">{pack.blurb}</p>
                    <p className="mt-2 font-mono text-sm font-bold tabular-nums text-[#F5C518]">
                      {pack.priceChips.toLocaleString()} chips · {pack.stickerIds.length} stickers
                    </p>
                    <div className="mt-4 flex justify-center">
                      {owned ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#F5C518]/30 bg-[#F5C518]/10 px-4 py-2 text-[12px] font-bold text-[#F5C518]">
                          <CheckIcon className="h-3.5 w-3.5" />
                          Owned — ready in chat
                        </span>
                      ) : (
                        <GradientButton
                          className="min-h-11 min-w-[140px] px-6 text-sm"
                          onClick={() => {
                            const ok = buyStickerPack(pack.id, pack.priceChips);
                            announce(
                              ok
                                ? `${pack.name} unlocked for live chat.`
                                : `Need ${pack.priceChips.toLocaleString()} chips.`
                            );
                          }}
                        >
                          Buy pack
                        </GradientButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      ) : null}

      <BuyChipsModal open={buyOpen} onClose={() => setBuyOpen(false)} />
    </PremiumPageShell>
  );
}
