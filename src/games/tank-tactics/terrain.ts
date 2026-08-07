import { createSeededRng } from "@/games/core/rng";

export const TERRAIN_SEGMENTS = 48;
export const TERRAIN_WIDTH = 960;
export const TERRAIN_BASE_Y = 320;
export const TERRAIN_MAX_VARIATION = 60;
export const CRATER_WIDTH_SEGMENTS = 3;
export const CRATER_DEPTH = 26;

export const segmentWidth = TERRAIN_WIDTH / TERRAIN_SEGMENTS;

/** A simple deterministic random-walk height map — "destructible-looking terrain" via segments, not a physics mesh. */
export function generateTerrain(seed: string): number[] {
  const rng = createSeededRng(`${seed}:terrain`);
  const heights: number[] = [TERRAIN_BASE_Y];
  for (let i = 1; i < TERRAIN_SEGMENTS; i++) {
    const delta = (rng() * 2 - 1) * 8;
    const next = Math.min(
      TERRAIN_BASE_Y + TERRAIN_MAX_VARIATION,
      Math.max(TERRAIN_BASE_Y - TERRAIN_MAX_VARIATION, heights[i - 1] + delta),
    );
    heights.push(next);
  }
  return heights;
}

export function segmentIndexForX(x: number): number {
  return Math.min(TERRAIN_SEGMENTS - 1, Math.max(0, Math.floor(x / segmentWidth)));
}

export function terrainHeightAt(heights: number[], x: number): number {
  const index = segmentIndexForX(x);
  const nextIndex = Math.min(TERRAIN_SEGMENTS - 1, index + 1);
  const localT = x / segmentWidth - index;
  return heights[index] + (heights[nextIndex] - heights[index]) * localT;
}

/** Digs a shallow crater into the height map centered on `x` — terrain sinks, it never gets filled back in. */
export function applyCrater(heights: number[], x: number): number[] {
  const center = segmentIndexForX(x);
  const next = [...heights];
  for (let offset = -CRATER_WIDTH_SEGMENTS; offset <= CRATER_WIDTH_SEGMENTS; offset++) {
    const index = center + offset;
    if (index < 0 || index >= next.length) continue;
    const falloff = 1 - Math.abs(offset) / (CRATER_WIDTH_SEGMENTS + 1);
    next[index] = Math.min(TERRAIN_BASE_Y + TERRAIN_MAX_VARIATION, next[index] + CRATER_DEPTH * falloff);
  }
  return next;
}
