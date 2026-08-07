"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SeenTutorialsState {
  seen: Record<string, boolean>;
  markSeen: (gameId: string) => void;
}

export const useSeenTutorials = create<SeenTutorialsState>()(
  persist(
    (set) => ({
      seen: {},
      markSeen: (gameId) => set((s) => ({ seen: { ...s.seen, [gameId]: true } })),
    }),
    { name: "pocket-party-seen-tutorials" },
  ),
);
