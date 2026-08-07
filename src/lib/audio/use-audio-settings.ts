"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AudioSettingsState {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleVibration: () => void;
}

/** Accessibility-required toggles: sound, music, and haptics, persisted per device. */
export const useAudioSettings = create<AudioSettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      musicEnabled: true,
      vibrationEnabled: true,
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
      toggleVibration: () => set((s) => ({ vibrationEnabled: !s.vibrationEnabled })),
    }),
    { name: "pocket-party-audio-settings" },
  ),
);

export function vibrate(pattern: number | number[]) {
  if (!useAudioSettings.getState().vibrationEnabled) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
