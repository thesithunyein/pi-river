"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { sound } from "@/lib/sound";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const [roomName, setRoomName] = useState("Sithu's High Rollers");
  const [gameVariant, setGameVariant] = useState("No Limit Hold'em");
  const [blinds, setBlinds] = useState("50 / 100");
  const [maxSeats, setMaxSeats] = useState(6);
  const [passcode, setPasscode] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playWin();

    // Store custom room details in sessionStorage/localStorage for Table page to pick up
    if (typeof window !== "undefined") {
      const roomData = {
        name: roomName || "Custom Room",
        variant: gameVariant,
        blinds,
        maxSeats,
        isPrivate,
        passcode,
        id: `room-${Date.now()}`,
      };
      sessionStorage.setItem("river_current_room", JSON.stringify(roomData));
    }

    onClose();
    router.push("/table");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-river-bg2 border border-river-cyan/50 rounded-3xl p-6 text-left shadow-[0_0_50px_rgba(34,211,238,0.25)] relative overflow-hidden flex flex-col">
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

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-river-cyan to-blue-700 flex items-center justify-center text-2xl shadow-md border border-cyan-400/30">
            🎲
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-white">Create Custom Room</h3>
            <p className="text-river-grey text-xs">Host your own encrypted onchain poker table</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          {/* Room Name */}
          <div>
            <label className="block text-river-grey font-bold uppercase mb-1">Room / Table Title</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Sithu's VIP Room"
              required
              className="w-full bg-river-bg1/90 border border-river-line/80 focus:border-river-cyan rounded-2xl p-3 text-white outline-none font-bold text-xs"
            />
          </div>

          {/* Game Variant & Blinds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-river-grey font-bold uppercase mb-1">Variant</label>
              <select
                value={gameVariant}
                onChange={(e) => setGameVariant(e.target.value)}
                className="w-full bg-river-bg1/90 border border-river-line/80 focus:border-river-cyan rounded-2xl p-3 text-white outline-none font-bold text-xs"
              >
                <option value="No Limit Hold'em">No Limit Hold&apos;em</option>
                <option value="Short Deck 6+">Short Deck 6+</option>
                <option value="Pot Limit Omaha">Pot Limit Omaha</option>
              </select>
            </div>

            <div>
              <label className="block text-river-grey font-bold uppercase mb-1">Small / Big Blinds</label>
              <select
                value={blinds}
                onChange={(e) => setBlinds(e.target.value)}
                className="w-full bg-river-bg1/90 border border-river-line/80 focus:border-river-cyan rounded-2xl p-3 text-white outline-none font-bold text-xs"
              >
                <option value="10 / 20">10 / 20 Chips</option>
                <option value="50 / 100">50 / 100 Chips</option>
                <option value="200 / 400">200 / 400 Chips</option>
                <option value="500 / 1K">500 / 1,000 High Roller</option>
              </select>
            </div>
          </div>

          {/* Seats Selector */}
          <div>
            <label className="block text-river-grey font-bold uppercase mb-1">Max Table Seats</label>
            <div className="grid grid-cols-3 gap-2">
              {[2, 6, 9].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setMaxSeats(s);
                  }}
                  className={`py-2.5 rounded-2xl font-black text-xs transition border ${
                    maxSeats === s
                      ? "bg-gradient-to-r from-river-cyan/30 to-blue-600/30 border-river-cyan text-river-cyan shadow-sm"
                      : "bg-river-bg1 border-river-line text-river-grey hover:text-white"
                  }`}
                >
                  {s === 2 ? "2 Seats (Heads Up)" : s === 6 ? "6 Seats (6-Max)" : "9 Seats (Full Ring)"}
                </button>
              ))}
            </div>
          </div>

          {/* Private Table & Passcode */}
          <div className="p-3.5 rounded-2xl bg-river-bg3/60 border border-river-line/60 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-black text-white text-xs">Private Table</div>
                <div className="text-[10px] text-river-grey">Require passcode to join table</div>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 accent-river-cyan cursor-pointer"
              />
            </div>

            {isPrivate && (
              <div>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Set 4-digit Passcode"
                  maxLength={6}
                  className="w-full bg-river-bg1 border border-river-line rounded-xl p-2.5 text-white font-mono text-xs outline-none focus:border-river-cyan"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-river-cyan via-blue-500 to-indigo-600 text-river-bg font-black text-xs uppercase tracking-wider glow-cyan hover:scale-[1.02] active:scale-98 transition shadow-xl cursor-pointer"
          >
            🚀 Launch & Host Table Now
          </button>
        </form>
      </div>
    </div>
  );
}
