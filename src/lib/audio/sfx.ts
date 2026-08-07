"use client";

import { Howl } from "howler";
import { buildToneDataUri } from "./tone";
import { useAudioSettings } from "./use-audio-settings";

const SFX_DEFINITIONS = {
  place: [{ frequency: 520, durationMs: 70, type: "sine" as const }],
  drop: [
    { frequency: 300, durationMs: 60, type: "sine" as const },
    { frequency: 180, durationMs: 90, type: "sine" as const },
  ],
  select: [{ frequency: 700, durationMs: 40, type: "triangle" as const }],
  ready: [
    { frequency: 440, durationMs: 60, type: "sine" as const },
    { frequency: 660, durationMs: 80, type: "sine" as const },
  ],
  win: [
    { frequency: 523, durationMs: 90, type: "sine" as const },
    { frequency: 659, durationMs: 90, type: "sine" as const },
    { frequency: 784, durationMs: 140, type: "sine" as const },
  ],
  draw: [
    { frequency: 440, durationMs: 90, type: "triangle" as const },
    { frequency: 392, durationMs: 140, type: "triangle" as const },
  ],
  error: [{ frequency: 160, durationMs: 140, type: "square" as const }],
  tick: [{ frequency: 880, durationMs: 30, type: "sine" as const }],
} as const;

export type SfxName = keyof typeof SFX_DEFINITIONS;

const cache = new Map<SfxName, Howl>();

function getHowl(name: SfxName): Howl {
  let howl = cache.get(name);
  if (!howl) {
    howl = new Howl({ src: [buildToneDataUri(SFX_DEFINITIONS[name])], format: ["wav"] });
    cache.set(name, howl);
  }
  return howl;
}

/** Plays a named effect, respecting the user's sound toggle. Call from client code only. */
export function playSfx(name: SfxName) {
  if (!useAudioSettings.getState().soundEnabled) return;
  getHowl(name).play();
}
