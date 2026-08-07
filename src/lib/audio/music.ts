"use client";

import { Howl } from "howler";
import { buildToneDataUri } from "./tone";

// A soft, four-note arpeggio loop — procedurally generated like every other
// sound on the platform, no external audio file.
const AMBIENT_LOOP = [
  { frequency: 261.6, durationMs: 900, type: "sine" as const },
  { frequency: 329.6, durationMs: 900, type: "sine" as const },
  { frequency: 392.0, durationMs: 900, type: "sine" as const },
  { frequency: 329.6, durationMs: 900, type: "sine" as const },
];

let howl: Howl | null = null;

function getHowl(): Howl {
  if (!howl) {
    howl = new Howl({
      src: [buildToneDataUri(AMBIENT_LOOP)],
      format: ["wav"],
      loop: true,
      volume: 0.18,
    });
  }
  return howl;
}

export function playAmbientMusic() {
  const instance = getHowl();
  if (!instance.playing()) instance.play();
}

export function stopAmbientMusic() {
  howl?.stop();
}
