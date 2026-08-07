"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useThemePack } from "@/lib/design/use-theme-pack";

/**
 * The theme wheel's actual PNG background — scoped to whichever section
 * renders it (landing hero, lobby), not the whole app or inside any game
 * board. Absolutely positioned within its parent, so wrap it in a
 * `relative` container.
 */
export function ThemedBackground({ className = "absolute inset-0" }: { className?: string }) {
  const themePackId = useThemePack((s) => s.themePackId);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Avoids a light/dark flash before the theme resolves on first paint.
  if (!mounted) return null;

  const mode = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div
      className={`pointer-events-none bg-cover bg-center transition-opacity duration-500 ${className}`}
      style={{ backgroundImage: `url(/themes/${themePackId}-${mode}.png)` }}
      aria-hidden="true"
    />
  );
}
