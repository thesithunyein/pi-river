"use client";

import { PremiumChip } from "@/components/PremiumChip";
import { SpadeIcon } from "@/components/icons";

/** Felt table + hole cards + chips — welcome atmosphere only. */
export function WelcomeFeltHero() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div
        className="relative overflow-hidden rounded-[48%] px-8 pb-10 pt-9 shadow-[0_28px_70px_rgba(0,0,0,0.55),0_0_0_1px_rgba(245,197,24,0.2)]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, #2f9e68 0%, #1a7a4f 28%, #0c3d2c 58%, #061910 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[10px] rounded-[46%] border border-[#F5C518]/35"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[18px] rounded-[44%] border border-white/10"
        />
        <div className="relative flex flex-col items-center">
          <div className="mb-5 flex items-end gap-3">
            <div className="animate-deal-left -rotate-8">
              <MiniCardBack />
            </div>
            <div className="animate-deal-right rotate-8">
              <MiniCardBack delay />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PremiumChip size={34} tone="gold" className="animate-chip-drop" />
            <PremiumChip size={28} tone="red" className="animate-chip-drop-delayed" />
            <PremiumChip size={30} tone="green" className="animate-chip-drop" />
          </div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c8ecd8]/90">
            Private heads-up
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniCardBack({ delay }: { delay?: boolean }) {
  return (
    <div
      className={`relative h-[72px] w-[52px] overflow-hidden rounded-[12px] border-2 border-[#F5C518]/45 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] shadow-[0_12px_28px_rgba(0,0,0,0.45)] ${
        delay ? "opacity-95" : ""
      }`}
    >
      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 7px)",
        }}
      />
      <div className="absolute inset-[5px] rounded-[8px] border border-[#F5C518]/30" />
      <div className="absolute inset-0 flex items-center justify-center text-[#F5C518]">
        <SpadeIcon className="h-5 w-5" />
      </div>
    </div>
  );
}
