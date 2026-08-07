"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemePack } from "@/lib/design/use-theme-pack";
import { THEME_PACK_LIST } from "@/lib/design/theme-packs";

export function ThemePackPicker() {
  const themePackId = useThemePack((s) => s.themePackId);
  const setThemePackId = useThemePack((s) => s.setThemePackId);

  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
      {THEME_PACK_LIST.map((pack) => {
        const selected = pack.id === themePackId;
        return (
          <button
            key={pack.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={pack.name}
            title={pack.description}
            onClick={() => setThemePackId(pack.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors",
              selected ? "border-primary ring-2 ring-primary" : "border-border hover:bg-muted",
            )}
          >
            <span
              className="relative flex h-8 w-full overflow-hidden rounded-lg"
              style={{ background: `linear-gradient(135deg, ${pack.swatch[0]}, ${pack.swatch[1]} 55%, ${pack.swatch[2]})` }}
            >
              {selected && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check className="size-4 text-white" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="text-xs font-medium">{pack.name}</span>
          </button>
        );
      })}
    </div>
  );
}
