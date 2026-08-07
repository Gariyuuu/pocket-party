"use client";

import { useCallback, useEffect, useState } from "react";

/** Wraps the Fullscreen API — used for "full-screen game mode where supported." Silently no-ops where it isn't. */
export function useFullscreen(target: () => Element | null) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggle = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    const el = target();
    if (el && "requestFullscreen" in el) {
      await (el as Element).requestFullscreen().catch(() => {});
    }
  }, [target]);

  const supported = typeof document !== "undefined" && "fullscreenEnabled" in document && document.fullscreenEnabled;

  return { isFullscreen, toggle, supported };
}
