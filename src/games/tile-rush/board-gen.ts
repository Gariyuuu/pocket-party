import { COLOR_COUNT, POWERUP_CHANCE, POWER_UP_TYPES, BOARD_SIZE } from "./constants";
import type { Tile } from "./types";

export function randomTile(rng: () => number): Tile {
  const color = Math.floor(rng() * COLOR_COUNT);
  const powerUp = rng() < POWERUP_CHANCE ? POWER_UP_TYPES[Math.floor(rng() * POWER_UP_TYPES.length)] : null;
  return { color, powerUp };
}

export function generateInitialBoard(rng: () => number): Tile[] {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => randomTile(rng));
}
