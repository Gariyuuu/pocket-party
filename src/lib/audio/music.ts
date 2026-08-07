"use client";

import { Howl } from "howler";
import { buildMixedToneDataUri, type NoteEvent } from "./tone";

const NOTE_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

/** Converts a note name ("A3", "F#2", "Bb4") to its frequency in Hz, equal temperament, A4 = 440Hz. */
function noteFreq(name: string): number {
  const match = /^([A-G][#b]?)(-?\d+)$/.exec(name);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const [, letter, octaveStr] = match;
  const semitoneFromC0 = NOTE_SEMITONE[letter] + Number(octaveStr) * 12;
  const semitoneFromA4 = semitoneFromC0 - (9 + 4 * 12);
  return 440 * 2 ** (semitoneFromA4 / 12);
}

const BPM = 100;
const BEAT_MS = 60_000 / BPM;
const BAR_MS = BEAT_MS * 4;

interface ChordBar {
  pad: string[];
  bass: string;
  /** One melody note per beat (4 notes), a simple up- or down-arpeggio of the chord's own tones. */
  melody: string[];
}

// A warm, unhurried vi-IV-I-V progression (Am - F - C - G) — one of the most
// common "chill/lo-fi" progressions for a reason: every chord shares tones
// with its neighbor, so the movement feels smooth rather than jarring. Played
// twice through (8 bars total) with the melody direction flipped the second
// time so the loop doesn't feel like it's just repeating verbatim.
const PROGRESSION: ChordBar[] = [
  { pad: ["A3", "C4", "E4"], bass: "A2", melody: ["A4", "C5", "E5", "C5"] },
  { pad: ["F3", "A3", "C4"], bass: "F2", melody: ["F4", "A4", "C5", "A4"] },
  { pad: ["C4", "E4", "G4"], bass: "C3", melody: ["C5", "E5", "G5", "E5"] },
  { pad: ["G3", "B3", "D4"], bass: "G2", melody: ["G4", "B4", "D5", "B4"] },
];

/** Exported for unit testing (`tests/unit/music.test.ts`) — not used outside this module otherwise. */
export function buildComposition(): { notes: NoteEvent[]; totalDurationMs: number } {
  const notes: NoteEvent[] = [];
  const barCount = PROGRESSION.length * 2;

  for (let bar = 0; bar < barCount; bar++) {
    const chord = PROGRESSION[bar % PROGRESSION.length];
    const barStartMs = bar * BAR_MS;
    const secondPass = bar >= PROGRESSION.length;
    const melody = secondPass ? [...chord.melody].reverse() : chord.melody;

    // Bassline: a laid-back "1 - - - 3 - - -" half-note pulse, not a
    // held drone — gives the loop a heartbeat instead of a hum.
    notes.push({
      frequency: noteFreq(chord.bass),
      startMs: barStartMs,
      durationMs: BEAT_MS * 2 * 0.92,
      type: "sine",
      gain: 0.22,
      attackMs: 20,
      releaseMs: 260,
    });
    notes.push({
      frequency: noteFreq(chord.bass),
      startMs: barStartMs + BEAT_MS * 2,
      durationMs: BEAT_MS * 2 * 0.92,
      type: "sine",
      gain: 0.19,
      attackMs: 20,
      releaseMs: 260,
    });

    // Chord pad: the full triad, sustained almost the whole bar, slow
    // attack/release so it swells in and out rather than clicking.
    for (const noteName of chord.pad) {
      notes.push({
        frequency: noteFreq(noteName),
        startMs: barStartMs,
        durationMs: BAR_MS * 0.97,
        type: "triangle",
        gain: 0.05,
        attackMs: 260,
        releaseMs: 520,
      });
    }

    // Melody: one plucked note per beat, arpeggiating the current chord.
    for (let beat = 0; beat < melody.length; beat++) {
      notes.push({
        frequency: noteFreq(melody[beat]),
        startMs: barStartMs + beat * BEAT_MS,
        durationMs: BEAT_MS * 0.55,
        type: "triangle",
        gain: 0.14,
        attackMs: 10,
        releaseMs: 110,
      });
    }
  }

  return { notes, totalDurationMs: barCount * BAR_MS };
}

let howl: Howl | null = null;

function getHowl(): Howl {
  if (!howl) {
    const { notes, totalDurationMs } = buildComposition();
    howl = new Howl({
      src: [buildMixedToneDataUri(notes, totalDurationMs)],
      format: ["wav"],
      loop: true,
      volume: 0.22,
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
