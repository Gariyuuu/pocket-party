"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useThemePack } from "@/lib/design/use-theme-pack";
import { THEME_PACKS } from "@/lib/design/theme-packs";

const VAR_NAMES = ["violet", "pink", "cyan", "amber", "lime"] as const;

/** Applies the selected theme pack's accent colors to <html>, reacting to both the theme pack and light/dark mode. */
export function ThemePackProvider() {
  const themePackId = useThemePack((s) => s.themePackId);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const pack = THEME_PACKS[themePackId];
    const accents = resolvedTheme === "dark" ? pack.dark : pack.light;
    const root = document.documentElement;
    for (const name of VAR_NAMES) {
      root.style.setProperty(`--party-${name}`, accents[name]);
    }
  }, [themePackId, resolvedTheme]);

  return null;
}
