import { BOARD_SIZE } from "./constants";
import { randomTile } from "./board-gen";
import type { Tile } from "./types";

function toRowCol(index: number): [number, number] {
  return [Math.floor(index / BOARD_SIZE), index % BOARD_SIZE];
}

function toIndex(row: number, col: number): number {
  return row * BOARD_SIZE + col;
}

/** 4-directional flood fill of same-color, non-empty tiles starting at `index`. */
export function findConnectedGroup(tiles: (Tile | null)[], index: number): number[] {
  const start = tiles[index];
  if (!start) return [];
  const color = start.color;
  const visited = new Set<number>([index]);
  const stack = [index];
  const group: number[] = [];

  while (stack.length > 0) {
    const current = stack.pop()!;
    group.push(current);
    const [row, col] = toRowCol(current);
    const neighbors = [
      row > 0 ? toIndex(row - 1, col) : -1,
      row < BOARD_SIZE - 1 ? toIndex(row + 1, col) : -1,
      col > 0 ? toIndex(row, col - 1) : -1,
      col < BOARD_SIZE - 1 ? toIndex(row, col + 1) : -1,
    ];
    for (const n of neighbors) {
      if (n < 0 || visited.has(n)) continue;
      const tile = tiles[n];
      if (tile && tile.color === color) {
        visited.add(n);
        stack.push(n);
      }
    }
  }

  return group;
}

export function rowIndices(row: number): number[] {
  return Array.from({ length: BOARD_SIZE }, (_, col) => toIndex(row, col));
}

export function columnIndices(col: number): number[] {
  return Array.from({ length: BOARD_SIZE }, (_, row) => toIndex(row, col));
}

/** Removes the given indices, drops surviving tiles down within each column, and refills the gaps at the top. */
export function clearAndRefill(tiles: Tile[], cleared: Set<number>, rng: () => number): Tile[] {
  const next = new Array<Tile>(tiles.length);

  for (let col = 0; col < BOARD_SIZE; col++) {
    const survivors: Tile[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      const index = toIndex(row, col);
      if (!cleared.has(index)) survivors.push(tiles[index]);
    }
    const missing = BOARD_SIZE - survivors.length;
    const fresh = Array.from({ length: missing }, () => randomTile(rng));
    const column = [...fresh, ...survivors];
    for (let row = 0; row < BOARD_SIZE; row++) {
      next[toIndex(row, col)] = column[row];
    }
  }

  return next;
}

export function shuffleColors(tiles: Tile[], rng: () => number): Tile[] {
  const colors = tiles.map((t) => t.color);
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  return tiles.map((tile, i) => ({ ...tile, color: colors[i] }));
}
