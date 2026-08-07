import { RotateCcw } from "lucide-react";

/**
 * CSS-only (no JS orientation polling) — shown only on narrow portrait
 * phones via the `portrait-hint` media-query utility in globals.css, for
 * the physics-heavy games where extra horizontal space actually helps aim.
 */
export function LandscapeHint() {
  return (
    <div className="portrait-hint mb-2 flex items-center gap-2 rounded-xl border border-party-amber/40 bg-party-amber/10 px-3 py-2 text-xs text-muted-foreground">
      <RotateCcw className="size-4 shrink-0" />
      <span>Rotate your phone for more room to aim — this plays fine in portrait too.</span>
    </div>
  );
}
