const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function findFourfallWin(
  cells: (string | null)[],
  columns: number,
  rows: number,
): { cellIndices: number[]; playerId: string } | null {
  const at = (row: number, col: number) =>
    row >= 0 && row < rows && col >= 0 && col < columns ? cells[row * columns + col] : undefined;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const owner = at(row, col);
      if (!owner) continue;

      for (const [dr, dc] of DIRECTIONS) {
        const indices: number[] = [];
        let ok = true;
        for (let step = 0; step < 4; step++) {
          const r = row + dr * step;
          const c = col + dc * step;
          if (at(r, c) !== owner) {
            ok = false;
            break;
          }
          indices.push(r * columns + c);
        }
        if (ok) return { cellIndices: indices, playerId: owner };
      }
    }
  }

  return null;
}

export function isFourfallFull(cells: (string | null)[]): boolean {
  return cells.every((cell) => cell !== null);
}

/** Lowest empty row in a column (row 0 = bottom), or null if the column is full. */
export function landingRow(cells: (string | null)[], columns: number, rows: number, column: number): number | null {
  for (let row = 0; row < rows; row++) {
    if (cells[row * columns + column] === null) return row;
  }
  return null;
}
