"use client";

import { useState } from "react";

const SEATS = [
  { name: "Maya", stack: "890K", gradient: "from-violet-600 to-violet-900", pos: "s1", active: false },
  { name: "Jonas", stack: "210K", gradient: "from-red-600 to-red-900", pos: "s2", folded: true },
  { name: "Kenji", stack: "1.4M", gradient: "from-amber-500 to-amber-800", pos: "s3", active: false },
  { name: "Pia", stack: "560K", gradient: "from-emerald-500 to-emerald-800", pos: "s4", dealer: true },
  { name: "Sithu", stack: "2.1M", gradient: "from-cyan-500 to-cyan-800", pos: "s-you", isYou: true },
];

export default function TablePage() {
  const [betAmount, setBetAmount] = useState(80000);
  const [activePreset, setActivePreset] = useState("Min");

  const presets = [
    { label: "Min", value: 40000 },
    { label: "1/2 Pot", value: 60000 },
    { label: "Pot", value: 120000 },
    { label: "All-In", value: 2100000 },
  ];

  return (
    <div className="p-4 animate-fade-in">
      {/* Poker table */}
      <div className="relative bg-gradient-to-b from-river-feltGlow via-river-felt to-[#061E16] rounded-[48%] border-[14px] border-[#0C3A2C] shadow-[inset_0_0_80px_rgba(0,0,0,0.6),0_0_50px_rgba(34,211,238,0.06),0_16px_40px_rgba(0,0,0,0.5)] aspect-[2/1] flex items-center justify-center">
          <div className="absolute inset-[14px] rounded-[48%] border border-white/5 pointer-events-none" />

          {/* Community cards */}
          <div className="flex gap-1.5 relative z-10">
            <Card suit="♥" rank="A" red />
            <Card suit="♠" rank="K" />
            <Card suit="♦" rank="7" />
            <CardBack />
            <CardBack />
          </div>

          {/* Pot */}
          <div className="absolute top-[36%] left-1/2 -translate-x-1/2 text-center z-20">
            <div className="flex justify-center mb-1">
              <div className="w-[18px] h-[18px] rounded-full bg-river-green shadow-md" />
              <div className="w-[18px] h-[18px] rounded-full bg-river-gold shadow-md -ml-1.5" />
              <div className="w-[18px] h-[18px] rounded-full bg-river-cyan shadow-md -ml-1.5" />
            </div>
            <div className="font-display font-black text-lg drop-shadow-lg">120,000</div>
            <div className="text-[9px] text-white/60 tracking-[0.22em] uppercase">Pot</div>
          </div>

          {/* Seats */}
          {SEATS.map((s) => (
            <div key={s.name} className={`absolute flex flex-col items-center gap-0.5 z-30 ${
              s.pos === "s1" ? "top-3 left-[18%]" :
              s.pos === "s2" ? "top-3 right-[18%]" :
              s.pos === "s3" ? "bottom-2 left-[4%]" :
              s.pos === "s4" ? "bottom-2 right-[4%]" :
              "bottom-2 left-[41%]"
            } ${s.folded ? "opacity-38" : ""}`}>
              <div className={`relative w-12 h-12 rounded-full border-[3px] flex items-center justify-center font-bold text-sm text-white shadow-lg ${
                s.isYou ? "border-river-cyan shadow-[0_0_0_4px_rgba(34,211,238,0.18),0_0_24px_rgba(34,211,238,0.5)]" : "border-white/25"
              } bg-gradient-to-br ${s.gradient}`}>
                {s.isYou && <div className="absolute -inset-[5px] rounded-full border-[3px] border-transparent border-t-river-cyan animate-spin-slow" />}
                {s.name[0]}
                {s.dealer && <div className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-white text-[9px] font-black text-river-bg flex items-center justify-center shadow">D</div>}
              </div>
              <div className={`text-[10.5px] font-bold drop-shadow-md ${s.isYou ? "text-river-cyan" : ""}`}>{s.name}</div>
              <div className="text-[10px] text-river-green font-bold drop-shadow-md">{s.stack}</div>
              {s.folded && <div className="text-[8px] text-river-grey font-bold uppercase tracking-wider">Folded</div>}
              {s.isYou && (
                <div className="flex gap-0.5 mt-0.5">
                  <div className="w-[26px] h-[38px] rounded-[8px] bg-white border border-gray-200 shadow-md flex flex-col justify-between p-[3px] font-bold text-[9px] text-gray-800">
                    <span>Q♠</span><span className="text-[11px]">♠</span>
                  </div>
                  <div className="w-[26px] h-[38px] rounded-[8px] bg-white border border-gray-200 shadow-md flex flex-col justify-between p-[3px] font-bold text-[9px] text-red-600">
                    <span>Q♦</span><span className="text-[11px]">♦</span>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Bet dock */}
      <div className="mt-3.5 bg-river-bg1/88 border border-river-line rounded-2xl p-3 backdrop-blur-xl">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <div className="text-[9px] text-river-grey uppercase tracking-widest font-semibold">Your stack</div>
            <div className="font-display font-bold text-base">2,100,000</div>
          </div>
          <div className="text-xs text-river-grey flex-1">Pot 120,000 · Small blind</div>
          <div className="flex gap-1.5">
            <button className="px-3.5 py-2 rounded-xl font-bold text-xs bg-red-500/10 text-river-red border border-red-500/30 hover:translate-y-[-1px] transition">Fold</button>
            <button className="px-3.5 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-river-green to-emerald-600 text-emerald-950 shadow-[0_4px_16px_rgba(52,211,153,0.3)] hover:translate-y-[-1px] transition">Check</button>
            <button className="px-3.5 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-river-cyan to-cyan-600 text-cyan-950 shadow-[0_4px_16px_rgba(34,211,238,0.3)] hover:translate-y-[-1px] transition">Raise {betAmount.toLocaleString()}</button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-[10px] text-river-grey uppercase tracking-wider font-semibold">Bet</span>
          {presets.map((p) => (
            <button key={p.label} onClick={() => { setBetAmount(p.value); setActivePreset(p.label); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                activePreset === p.label
                  ? "bg-river-cyan/12 border-river-cyan/40 text-river-cyan"
                  : "bg-river-bg3 border-river-line text-river-grey"
              }`}>{p.label}</button>
          ))}
          <input type="range" min={40000} max={2100000} value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className="flex-1 accent-river-cyan h-1 min-w-[80px]" />
          <div className="font-display font-bold text-sm text-river-cyan min-w-[80px] text-right">{betAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Trust note */}
      <div className="mt-2.5 text-center text-[10.5px] text-river-grey flex items-center justify-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-river-green flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        <span>Your hole cards are <b className="text-river-white">encrypted onchain</b>. The house cannot see them. Revealed only at showdown.</span>
      </div>
    </div>
  );
}

function Card({ suit, rank, red }: { suit: string; rank: string; red?: boolean }) {
  return (
    <div className={`w-[46px] h-[64px] rounded-lg bg-gradient-to-b from-white to-gray-100 border border-gray-200 shadow-[0_6px_14px_rgba(0,0,0,0.45)] flex flex-col justify-between p-1.5 font-bold text-[12px] ${red ? "text-red-600" : "text-gray-800"} hover:translate-y-[-4px] hover:rotate-[1.5deg] transition-transform cursor-pointer`}>
      <span>{rank}{suit}</span>
      <span className="text-sm self-end">{suit}</span>
    </div>
  );
}

function CardBack() {
  return (
    <div className="w-[46px] h-[64px] rounded-lg bg-[repeating-linear-gradient(45deg,#1A2540_0_5px,#131B2E_5px_10px)] border-2 border-river-cyan/55 shadow-[0_6px_14px_rgba(0,0,0,0.45)] animate-pulse-glow" />
  );
}
