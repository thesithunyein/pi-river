"use client";

import React, { useState } from "react";
import { useGame } from "@/context/GameContext";
import { sound } from "@/lib/sound";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { walletAddress, isWalletConnected, chainId, connectWallet, disconnectWallet, switchNetworkToInco } = useGame();
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setConnecting(true);
    await connectWallet();
    setConnecting(false);
  };

  const handleCopy = () => {
    if (walletAddress) {
      sound.playClick();
      navigator.clipboard?.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddr = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isIncoChain = chainId === "0x2105" || chainId === "8453";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-river-bg2 border border-river-cyan/50 rounded-3xl p-6 text-left shadow-[0_0_50px_rgba(34,211,238,0.25)] relative overflow-hidden flex flex-col">
        {/* Glow backdrop */}
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

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-md border border-amber-400/40">
            🦊
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-white">Web3 Poker Wallet</h3>
            <p className="text-river-grey text-xs">Connect MetaMask for encrypted onchain gameplay</p>
          </div>
        </div>

        {isWalletConnected && walletAddress ? (
          <div className="space-y-4">
            {/* Connected Card */}
            <div className="p-4 rounded-2xl bg-river-bg3/80 border border-river-cyan/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-river-grey uppercase tracking-wider">Status:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-black border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  MetaMask Connected
                </span>
              </div>

              <div>
                <div className="text-[10px] text-river-grey font-bold uppercase mb-1">Account Address:</div>
                <div className="flex items-center justify-between bg-river-bg1 p-3 rounded-xl border border-river-line font-mono text-sm text-river-gold">
                  <span>{formatAddr(walletAddress)}</span>
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 bg-river-bg3 hover:bg-river-cyan/20 border border-river-line hover:border-river-cyan text-white text-xs font-bold rounded-lg transition"
                  >
                    {copied ? "Copied! ✓" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Network Status */}
              <div className="pt-2 border-t border-river-line/50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-river-grey uppercase font-bold">Connected Network</div>
                  <div className="text-xs font-black text-white">{isIncoChain ? "Inco Gentry Testnet" : "Ethereum Mainnet / Local"}</div>
                </div>
                {!isIncoChain && (
                  <button
                    onClick={switchNetworkToInco}
                    className="px-3 py-1.5 bg-gradient-to-r from-river-cyan to-blue-600 text-river-bg font-black text-xs rounded-xl hover:scale-105 transition"
                  >
                    Switch to Inco
                  </button>
                )}
              </div>
            </div>

            {/* Inco FHE Badge */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-3">
              <span className="text-xl">🔐</span>
              <div>
                <div className="font-black text-emerald-300">FHE Key Agreement Enabled</div>
                <div className="text-[11px] text-emerald-100/80">
                  Your hand cards remain 100% encrypted onchain using Inco FH-EVM euint8 keys.
                </div>
              </div>
            </div>

            {/* Disconnect button */}
            <button
              onClick={() => {
                disconnectWallet();
                onClose();
              }}
              className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-river-red font-black text-xs transition cursor-pointer"
            >
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-river-bg3/60 border border-river-line text-center space-y-2">
              <p className="text-xs text-river-grey leading-relaxed">
                Connect your Web3 Wallet to sign encrypted hand hashes and verify onchain shuffling without exposing cards to the dealer.
              </p>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-amber-950 font-black text-xs uppercase tracking-wider glow-gold hover:scale-[1.02] active:scale-98 transition shadow-xl flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <span className="text-base">🦊</span>
              <span>{connecting ? "Connecting MetaMask..." : "Connect MetaMask Wallet"}</span>
            </button>

            <div className="text-center">
              <span className="text-[11px] text-river-grey">Supports MetaMask, Coinbase Wallet, Rabby & Inco Vault</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
