"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemePackId } from "./theme-packs";

interface ThemePackState {
  themePackId: ThemePackId;
  setThemePackId: (id: ThemePackId) => void;
}

export const useThemePack = create<ThemePackState>()(
  persist(
    (set) => ({
      themePackId: "classic",
      setThemePackId: (themePackId) => set({ themePackId }),
    }),
    { name: "pocket-party-theme-pack" },
  ),
);
