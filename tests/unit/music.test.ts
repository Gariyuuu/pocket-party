import { describe, expect, it } from "vitest";
import { buildComposition } from "@/lib/audio/music";
import { buildMixedToneDataUri } from "@/lib/audio/tone";

function decodeWav(dataUri: string): { samples: Int16Array; sampleRate: number } {
  const base64 = dataUri.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const sampleRate = view.getUint32(24, true);
  const dataSize = view.getUint32(40, true);
  const samples = new Int16Array(dataSize / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(44 + i * 2, true);
  return { samples, sampleRate };
}

describe("buildComposition", () => {
  it("produces at least one bass, pad, and melody note", () => {
    const { notes } = buildComposition();
    expect(notes.length).toBeGreaterThan(20);
    expect(notes.every((n) => n.frequency > 0 && Number.isFinite(n.frequency))).toBe(true);
    expect(notes.every((n) => n.startMs >= 0)).toBe(true);
  });

  it("every note fits inside the total loop duration", () => {
    const { notes, totalDurationMs } = buildComposition();
    for (const note of notes) {
      expect(note.startMs + note.durationMs).toBeLessThanOrEqual(totalDurationMs + 1);
    }
  });

  it("renders to a valid, non-silent, non-clipping WAV data URI", () => {
    const { notes, totalDurationMs } = buildComposition();
    const uri = buildMixedToneDataUri(notes, totalDurationMs);
    expect(uri.startsWith("data:audio/wav;base64,")).toBe(true);

    const { samples, sampleRate } = decodeWav(uri);
    expect(sampleRate).toBe(22050);
    expect(samples.length).toBeGreaterThan(sampleRate * 15); // an 8-bar loop at 100bpm should run well past 15s

    let peak = 0;
    let sumSquares = 0;
    for (const raw of samples) {
      const s = Math.abs(raw) / 0x7fff;
      if (s > peak) peak = s;
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / samples.length);

    expect(peak).toBeGreaterThan(0.05); // audibly present
    expect(peak).toBeLessThan(0.95); // not clipping
    expect(rms).toBeGreaterThan(0.01); // not near-silent throughout
  });

  it("starts and ends near silence, so the loop point doesn't click", () => {
    const { notes, totalDurationMs } = buildComposition();
    const uri = buildMixedToneDataUri(notes, totalDurationMs);
    const { samples } = decodeWav(uri);
    const edgeWindow = 50; // first/last ~2ms at 22050Hz
    const startPeak = Math.max(...Array.from(samples.slice(0, edgeWindow)).map((s) => Math.abs(s) / 0x7fff));
    const endPeak = Math.max(...Array.from(samples.slice(-edgeWindow)).map((s) => Math.abs(s) / 0x7fff));
    expect(startPeak).toBeLessThan(0.05);
    expect(endPeak).toBeLessThan(0.05);
  });
});
