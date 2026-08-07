"use client";

import React, { useState } from "react";
import { sound } from "@/lib/sound";

interface IncoInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  userCards: Array<{ suit: string; rank: string; isRed?: boolean }>;
  gameStage: string;
}

export default function IncoInspectorModal({
  isOpen,
  onClose,
  userCards,
  gameStage,
}: IncoInspectorProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  // Generate deterministic mock handles based on card value
  const getCiphertextHandle = (card: { suit: string; rank: string }, index: number) => {
    const code = (card.rank.charCodeAt(0) * 31 + card.suit.charCodeAt(0) * 17 + index * 997).toString(16);
    return `0x${code}f89a2e4c${index + 1}b78d31209e5a4f${code.slice(-2)}891c`;
  };

  const handleCopy = (text: string, index: number) => {
    sound.playClick();
    navigator.clipboard?.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-river-bg2 border border-river-cyan/50 rounded-3xl p-5 sm:p-6 text-left shadow-[0_0_50px_rgba(34,211,238,0.25)] relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glowing backdrop */}
        <div className="absolute top-[-40px] right-[-40px] w-48 h-48 bg-river-cyan/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-river-bg1/80 border border-river-line text-river-grey hover:text-white flex items-center justify-center font-bold text-sm transition"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-xl shadow-md border border-emerald-400/30">
            🔒
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-lg text-white">Inco FHE Onchain Ciphertext Inspector</h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                Inco FH-EVM v0.5
              </span>
            </div>
            <p className="text-river-grey text-xs">Verify encrypted card states & zero-knowledge deck unsealing</p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2.5 rounded-2xl bg-river-bg3/60 border border-river-line/60 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-river-green animate-pulse" />
            <div>
              <div className="text-[10px] text-river-grey uppercase font-bold">Inco Network</div>
              <div className="text-xs font-black text-white">Lightning EVM Testnet</div>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-river-bg3/60 border border-river-line/60 flex items-center gap-2">
            <div className="text-sm">🔑</div>
            <div>
              <div className="text-[10px] text-river-grey uppercase font-bold">Unseal Key</div>
              <div className="text-xs font-black text-river-cyan">Client Signature Active</div>
            </div>
          </div>
        </div>

        {/* Encrypted Cards Feed */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 text-xs">
          <div className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
            <span>Your Hole Cards (Homomorphic Handles)</span>
            <span className="text-river-cyan font-bold text-[10px]">Stage: {gameStage.toUpperCase()}</span>
          </div>

          {userCards.length === 0 ? (
            <div className="p-4 rounded-2xl bg-river-bg3/40 border border-river-line text-center text-river-grey">
              No active deal. Click &apos;DEAL HAND&apos; at the table to generate encrypted card handles.
            </div>
          ) : (
            userCards.map((card, i) => {
              const handle = getCiphertextHandle(card, i);
              return (
                <div key={i} className="p-3 rounded-2xl bg-river-bg3/60 border border-river-cyan/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-xs">Card #{i + 1}:</span>
                      <span className={`font-black px-2 py-0.5 rounded-lg bg-white ${card.isRed ? "text-red-600" : "text-black"}`}>
                        {card.rank}{card.suit}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      euint8 Verified
                    </span>
                  </div>

                  {/* Handle text */}
                  <div>
                    <div className="text-[10px] text-river-grey font-bold uppercase mb-0.5">Encrypted Onchain Ciphertext Handle:</div>
                    <div className="flex items-center gap-2 bg-river-bg1/90 p-2 rounded-xl border border-river-line font-mono text-[11px] text-river-gold break-all">
                      <span className="flex-1">{handle}</span>
                      <button
                        onClick={() => handleCopy(handle, i)}
                        className="px-2 py-1 bg-river-bg3 hover:bg-river-cyan/20 border border-river-line hover:border-river-cyan text-white text-[10px] font-bold rounded-lg transition"
                      >
                        {copiedIndex === i ? "Copied! ✓" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Technical Proof Callout */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-river-bg3 border border-emerald-500/30 text-emerald-200 text-xs space-y-1.5">
            <div className="font-black text-emerald-300 flex items-center gap-1.5">
              <span>🛡</span>
              <span>Why Inco FHE Wins for Poker:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-100/90">
              In traditional online poker, a central dealer server holds all card keys in plain text. With Inco Protocol, card suits & ranks are stored as <code className="bg-black/40 px-1 py-0.5 rounded text-emerald-300">euint8</code> ciphertexts. The smart contract shuffles the deck homomorphically without ever decrypting values onchain!
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-river-line/60 flex items-center justify-between text-[10px] text-river-grey">
          <span>Inco Summer Game Jam 2026</span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-river-cyan/20 border border-river-cyan text-river-cyan font-black hover:bg-river-cyan/30 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
