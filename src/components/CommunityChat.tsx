"use client";

import React, { useState, useEffect, useRef } from "react";
import { sound } from "@/lib/sound";

export interface ChatMessage {
  id: string;
  sender: string;
  role?: "player" | "admin" | "dealer";
  avatarBg: string;
  text: string;
  time: string;
  badge?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: "1", sender: "jognwatson", avatarBg: "from-blue-500 to-cyan-600", text: "Congratulations 👏👏👏", time: "1m ago" },
  { id: "2", sender: "amador", role: "admin", badge: "Admin", avatarBg: "from-purple-600 to-violet-800", text: "play safe bro", time: "1m ago" },
  { id: "3", sender: "jognwatson", avatarBg: "from-blue-500 to-cyan-600", text: "nice Hit ❤️", time: "1m ago" },
  { id: "4", sender: "jognwatson", avatarBg: "from-blue-500 to-cyan-600", text: "Best of luck", time: "1m ago" },
  { id: "5", sender: "cookiechip", avatarBg: "from-pink-500 to-rose-600", text: "@all congratulations big win today good luck!", time: "1m ago" },
  { id: "6", sender: "Kenji", avatarBg: "from-amber-500 to-yellow-600", text: "Hi, everyone! Ready for River Rush?", time: "2m ago" },
];

export default function CommunityChat({ isOpen, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulated live community messages
  useEffect(() => {
    const randomPhrases = [
      "Let's go River Rush! 🏆",
      "Full House on the river! 🃏",
      "Good luck everyone at the high roller table!",
      "FHE encryption onchain is awesome, no cheating possible 🔥",
      "Claimed my daily bonus today! 🪙",
      "Who's joining Short Deck tonight?",
    ];

    const randomSenders = ["Pia", "Maya", "Jonas", "Alex", "CryptoKing", "Sithu"];

    const interval = setInterval(() => {
      const phrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];
      const sender = randomSenders[Math.floor(Math.random() * randomSenders.length)];
      const colors = ["from-cyan-500 to-blue-600", "from-purple-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600"];
      const avatarBg = colors[Math.floor(Math.random() * colors.length)];

      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        sender,
        avatarBg,
        text: phrase,
        time: "Just now",
      };

      setMessages((prev) => [...prev.slice(-20), newMsg]);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sound.playClick();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "You",
      role: "player",
      avatarBg: "from-cyan-400 to-blue-600",
      text: inputText.trim(),
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
  };

  return (
    <div className="bg-river-bg2/90 border border-river-line rounded-2xl flex flex-col h-[480px] overflow-hidden shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-river-bg3/60 border-b border-river-line">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-river-green animate-pulse" />
          <span className="font-bold text-xs text-river-white uppercase tracking-wider">Live Community Chat</span>
          <span className="bg-river-cyan/20 text-river-cyan text-[10px] font-bold px-2 py-0.5 rounded-full">
            1,842 online
          </span>
        </div>
        {onToggle && (
          <button onClick={onToggle} className="text-river-grey hover:text-white text-xs font-bold">
            ✕
          </button>
        )}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-2 text-xs group">
            <div
              className={`w-7 h-7 rounded-full bg-gradient-to-br ${m.avatarBg} flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0 shadow-sm`}
            >
              {m.sender[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-river-white text-[11px]">{m.sender}</span>
                {m.role === "admin" && (
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                    Admin
                  </span>
                )}
                {m.sender === "You" && (
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                    You
                  </span>
                )}
                <span className="text-[9px] text-river-grey/70 ml-auto">{m.time}</span>
              </div>
              <div className="text-river-grey text-[11.5px] mt-0.5 leading-relaxed break-words bg-river-bg3/40 rounded-lg px-2.5 py-1.5 border border-river-line/40">
                {m.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-2.5 bg-river-bg3/50 border-t border-river-line flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Say something in chat..."
          className="flex-1 bg-river-bg1/80 border border-river-line/80 rounded-xl px-3 py-2 text-xs text-river-white outline-none focus:border-river-cyan transition placeholder:text-river-grey/60"
        />
        <button
          type="submit"
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-river-cyan to-blue-600 text-river-bg font-bold text-xs glow-cyan hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        >
          Send
        </button>
      </form>
    </div>
  );
}
