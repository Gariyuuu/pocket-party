export type ThemePackId = "classic" | "neon" | "sunset";

interface AccentSet {
  violet: string;
  pink: string;
  cyan: string;
  amber: string;
  lime: string;
}

export interface ThemePack {
  id: ThemePackId;
  name: string;
  description: string;
  /** Three swatch colors for the picker card preview — plain hex, not tied to light/dark. */
  swatch: [string, string, string];
  light: AccentSet;
  dark: AccentSet;
}

/**
 * Reassigns the same five `--party-*` token names (already used everywhere
 * from buttons to game boards) to different hues per theme, so switching
 * themes restyles the whole app without touching every component that
 * reads `var(--color-party-violet)` etc. Light/dark keep the same hues as
 * the current mode, just at the lightness/chroma globals.css already uses
 * for :root vs .dark.
 */
export const THEME_PACKS: Record<ThemePackId, ThemePack> = {
  classic: {
    id: "classic",
    name: "Classic Party",
    description: "The original violet, pink, and amber look.",
    swatch: ["#7c3aed", "#ec4899", "#f59e0b"],
    light: {
      violet: "oklch(0.541 0.229 293.1)",
      pink: "oklch(0.668 0.219 354.3)",
      cyan: "oklch(0.75 0.145 210)",
      amber: "oklch(0.795 0.161 75)",
      lime: "oklch(0.82 0.19 128)",
    },
    dark: {
      violet: "oklch(0.68 0.21 293.1)",
      pink: "oklch(0.74 0.19 354.3)",
      cyan: "oklch(0.8 0.13 210)",
      amber: "oklch(0.83 0.15 75)",
      lime: "oklch(0.85 0.18 128)",
    },
  },
  neon: {
    id: "neon",
    name: "Arcade Neon",
    description: "Electric cyan and lime, blue-leaning violet.",
    swatch: ["#22d3ee", "#84cc16", "#8b5cf6"],
    light: {
      violet: "oklch(0.56 0.24 275)",
      pink: "oklch(0.68 0.22 335)",
      cyan: "oklch(0.74 0.16 195)",
      amber: "oklch(0.8 0.17 110)",
      lime: "oklch(0.8 0.23 145)",
    },
    dark: {
      violet: "oklch(0.68 0.23 275)",
      pink: "oklch(0.74 0.2 335)",
      cyan: "oklch(0.79 0.15 195)",
      amber: "oklch(0.85 0.16 110)",
      lime: "oklch(0.83 0.22 145)",
    },
  },
  sunset: {
    id: "sunset",
    name: "Sunset Warmth",
    description: "Coral, gold, and magenta, dusk-blue in the background.",
    swatch: ["#fb7185", "#fbbf24", "#c026d3"],
    light: {
      violet: "oklch(0.58 0.24 320)",
      pink: "oklch(0.7 0.2 20)",
      cyan: "oklch(0.72 0.1 250)",
      amber: "oklch(0.8 0.17 70)",
      lime: "oklch(0.8 0.16 55)",
    },
    dark: {
      violet: "oklch(0.68 0.23 320)",
      pink: "oklch(0.75 0.19 20)",
      cyan: "oklch(0.75 0.09 250)",
      amber: "oklch(0.84 0.16 70)",
      lime: "oklch(0.83 0.15 55)",
    },
  },
};

export const THEME_PACK_LIST = Object.values(THEME_PACKS);
