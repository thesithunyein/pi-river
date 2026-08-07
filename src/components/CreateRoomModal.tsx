"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CardsIcon, LockIncoIcon } from "@/components/icons";
import { sound } from "@/lib/sound";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const [roomName, setRoomName] = useState("pi River Home Table");
  const [gameVariant, setGameVariant] = useState("No Limit Hold'em");
  const [blinds, setBlinds] = useState("20,000 / 40,000");
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
      <div className="glass-panel relative flex w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-river-line/20 p-6 text-left shadow-mi-panel">
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-river-line/15 bg-river-bg1/75 text-sm font-bold text-river-grey transition hover:text-river-white"
        >
          ✕
        </button>

        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-river-violet/10 text-river-violet">
            <CardsIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-black text-white">Create a local room</h3>
            <p className="mt-1 text-sm text-river-grey">
              This saves your table settings in the browser and opens the table with your selected mood.
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-[24px] border border-river-blue/15 bg-river-blue/10 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-river-bg/50 text-river-cyan">
              <LockIncoIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-river-white">Network target</p>
              <p className="mt-1 text-xs leading-6 text-river-grey">
                UI badge only for now: Inco Lightning on Base Sepolia. Wallet and contract actions are still
                being wired.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-river-grey">
              Room title
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Name your table"
              required
              className="w-full rounded-2xl border border-river-line/20 bg-river-bg1/80 p-3 text-white"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-river-grey">
                Variant
              </label>
              <select
                value={gameVariant}
                onChange={(e) => setGameVariant(e.target.value)}
                className="w-full rounded-2xl border border-river-line/20 bg-river-bg1/80 p-3 text-white"
              >
                <option value="No Limit Hold'em">No Limit Hold&apos;em</option>
                <option value="Short Deck 6+">Short Deck 6+</option>
                <option value="Pot Limit Omaha">Pot Limit Omaha</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-river-grey">
                Blinds
              </label>
              <select
                value={blinds}
                onChange={(e) => setBlinds(e.target.value)}
                className="w-full rounded-2xl border border-river-line/20 bg-river-bg1/80 p-3 text-white"
              >
                <option value="5,000 / 10,000">5,000 / 10,000</option>
                <option value="20,000 / 40,000">20,000 / 40,000</option>
                <option value="50,000 / 100,000">50,000 / 100,000</option>
                <option value="100,000 / 200,000">100,000 / 200,000</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-river-grey">
              Max seats
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[2, 6, 9].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setMaxSeats(s);
                  }}
                  className={`min-h-11 rounded-2xl border py-2.5 text-xs font-black transition ${
                    maxSeats === s
                      ? "border-river-violet/30 bg-river-violet/10 text-river-white"
                      : "border-river-line/20 bg-river-bg1/80 text-river-grey hover:text-white"
                  }`}
                >
                  {s === 2 ? "2 Seats" : s === 6 ? "6 Seats" : "9 Seats"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-[24px] border border-river-line/15 bg-river-bg1/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-white">Private table</div>
                <div className="text-xs text-river-grey">Add a passcode for your local room setup.</div>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-river-violet"
              />
            </div>

            {isPrivate && (
              <div>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Set passcode"
                  maxLength={6}
                  className="w-full rounded-2xl border border-river-line/20 bg-river-bg p-3 font-mono text-white"
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="brand-gradient w-full rounded-2xl py-3.5 text-sm font-black text-slate-950 shadow-mi-glow transition hover:brightness-105 active:translate-y-px"
          >
            Open table
          </button>
        </form>
      </div>
    </div>
  );
}
