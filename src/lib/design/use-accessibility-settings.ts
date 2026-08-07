"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AccessibilitySettingsState {
  highContrastEnabled: boolean;
  toggleHighContrast: () => void;
}

/** High-contrast mode — the `.high-contrast` utility already exists in globals.css; this just controls whether it's applied. */
export const useAccessibilitySettings = create<AccessibilitySettingsState>()(
  persist(
    (set) => ({
      highContrastEnabled: false,
      toggleHighContrast: () => set((s) => ({ highContrastEnabled: !s.highContrastEnabled })),
    }),
    { name: "pocket-party-accessibility-settings" },
  ),
);
