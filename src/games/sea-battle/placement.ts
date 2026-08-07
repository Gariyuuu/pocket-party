import type { ShipPlacement } from "./types";

function toRowCol(cell: number, boardSize: number): [number, number] {
  return [Math.floor(cell / boardSize), cell % boardSize];
}

/**
 * A ship's cells are valid if they're all in bounds, form a single
 * straight (horizontal or vertical) contiguous run of the right length,
 * with no gaps or diagonal steps.
 */
function isStraightContiguous(cells: number[], length: number, boardSize: number): boolean {
  if (cells.length !== length) return false;
  if (cells.some((c) => !Number.isInteger(c) || c < 0 || c >= boardSize * boardSize)) return false;
  if (length === 1) return true;

  const rowsCols = cells.map((c) => toRowCol(c, boardSize));
  const sameRow = rowsCols.every(([r]) => r === rowsCols[0][0]);
  const sameCol = rowsCols.every(([, c]) => c === rowsCols[0][1]);
  if (!sameRow && !sameCol) return false;

  const sorted = [...cells].sort((a, b) => a - b);
  const step = sameRow ? 1 : boardSize;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== step) return false;
  }
  return true;
}

/**
 * Validates a full fleet: every ship matches its expected length in order,
 * is a legal straight run, and no two ships (or cells within one ship)
 * overlap. Returns an error message, or null if the fleet is legal.
 */
export function validateFleet(placements: ShipPlacement[], shipLengths: number[], boardSize: number): string | null {
  if (placements.length !== shipLengths.length) return "Wrong number of ships.";

  const occupied = new Set<number>();
  for (let i = 0; i < placements.length; i++) {
    const cells = placements[i].cells;
    if (!isStraightContiguous(cells, shipLengths[i], boardSize)) {
      return `Ship ${i + 1} isn't a valid straight, in-bounds placement.`;
    }
    for (const cell of cells) {
      if (occupied.has(cell)) return "Ships can't overlap.";
      occupied.add(cell);
    }
  }
  return null;
}

/** A random, legal, non-overlapping fleet — used for the solo bot and the client's "Randomize" button. */
export function randomFleetPlacement(shipLengths: number[], boardSize: number): ShipPlacement[] {
  const occupied = new Set<number>();
  const placements: ShipPlacement[] = [];

  for (const length of shipLengths) {
    let cells: number[] | null = null;
    while (!cells) {
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(Math.random() * boardSize);
      const col = Math.floor(Math.random() * boardSize);
      const candidate: number[] = [];
      for (let i = 0; i < length; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        if (r >= boardSize || c >= boardSize) {
          candidate.length = 0;
          break;
        }
        candidate.push(r * boardSize + c);
      }
      if (candidate.length === length && candidate.every((cell) => !occupied.has(cell))) {
        cells = candidate;
      }
    }
    for (const cell of cells) occupied.add(cell);
    placements.push({ cells });
  }

  return placements;
}
