"use client";

import { useEffect } from "react";
import { sound } from "@/lib/sound";
import { useGame } from "@/context/GameContext";

/** Unlocks Web Audio after first gesture and starts lounge BGM when enabled. */
export function AudioBootstrap() {
  const { musicEnabled, soundEnabled } = useGame();

  useEffect(() => {
    sound.sfxEnabled = soundEnabled;
    sound.musicEnabled = musicEnabled;
    sound.bindUnlockOnce();
    if (musicEnabled) {
      // May no-op until gesture unlocks AudioContext
      sound.startMusic();
    } else {
      sound.stopMusic();
    }
  }, [musicEnabled, soundEnabled]);

  return null;
}
