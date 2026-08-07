/**
 * Generates tiny original WAV files in-memory (sine/square tone bursts) and
 * hands them to Howler as data URIs. This is what "sound effects" means on
 * this platform for now — no external/licensed audio assets, no binary
 * files to ship, and every sound is procedurally original.
 */

interface ToneStep {
  frequency: number;
  durationMs: number;
  type?: "sine" | "square" | "triangle";
}

const SAMPLE_RATE = 22050;

function synthesizeStep(samples: Float32Array, offset: number, step: ToneStep): void {
  const count = Math.round((step.durationMs / 1000) * SAMPLE_RATE);
  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE;
    const phase = 2 * Math.PI * step.frequency * t;
    let value: number;
    switch (step.type ?? "sine") {
      case "square":
        value = Math.sign(Math.sin(phase));
        break;
      case "triangle":
        value = (2 / Math.PI) * Math.asin(Math.sin(phase));
        break;
      default:
        value = Math.sin(phase);
    }
    // Fade in/out to avoid clicks at segment boundaries.
    const fade = Math.min(1, i / 200, (count - i) / 200);
    samples[offset + i] = value * fade * 0.35;
  }
}

function encodeWav(samples: Float32Array): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, text: string) {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped * 0x7fff, true);
    offset += 2;
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

/** Builds a short tone sequence (a "sound effect") as a playable data URI. */
export function buildToneDataUri(steps: readonly ToneStep[]): string {
  const totalSamples = steps.reduce(
    (sum, step) => sum + Math.round((step.durationMs / 1000) * SAMPLE_RATE),
    0,
  );
  const samples = new Float32Array(totalSamples);
  let offset = 0;
  for (const step of steps) {
    synthesizeStep(samples, offset, step);
    offset += Math.round((step.durationMs / 1000) * SAMPLE_RATE);
  }
  return encodeWav(samples);
}
