"use client";

import { useEffect } from "react";
import { useAudioSettings } from "@/lib/audio/use-audio-settings";
import { playAmbientMusic, stopAmbientMusic } from "@/lib/audio/music";
import { useAccessibilitySettings } from "@/lib/design/use-accessibility-settings";

/** Applies the music toggle and the high-contrast class to <html> — mounted once, at the root layout. */
export function AudioProvider() {
  const musicEnabled = useAudioSettings((s) => s.musicEnabled);
  const highContrastEnabled = useAccessibilitySettings((s) => s.highContrastEnabled);

  useEffect(() => {
    // Browsers block audio before any user gesture — this call is a
    // best-effort attempt that quietly no-ops until the user interacts
    // with something (including the settings toggle itself).
    if (musicEnabled) playAmbientMusic();
    else stopAmbientMusic();
  }, [musicEnabled]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrastEnabled);
  }, [highContrastEnabled]);

  return null;
}
