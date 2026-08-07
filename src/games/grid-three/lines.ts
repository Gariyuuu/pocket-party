/**
 * Shared win-line scanner for both Grid Three modes: classic 3x3 (winLength
 * 3) and the 5x5 "connect four" board (winLength 4). Checks every straight
 * run of `winLength` cells in the four line directions.
 */
const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal down-right
  [1, -1], // diagonal down-left
];

export function findWinningLine(
  cells: (string | null)[],
  boardSize: number,
  winLength: number,
): { cellIndices: number[]; playerId: string } | null {
  const at = (row: number, col: number) =>
    row >= 0 && row < boardSize && col >= 0 && col < boardSize ? cells[row * boardSize + col] : undefined;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const owner = at(row, col);
      if (!owner) continue;

      for (const [dr, dc] of DIRECTIONS) {
        const indices: number[] = [];
        let ok = true;
        for (let step = 0; step < winLength; step++) {
          const r = row + dr * step;
          const c = col + dc * step;
          if (at(r, c) !== owner) {
            ok = false;
            break;
          }
          indices.push(r * boardSize + c);
        }
        if (ok) return { cellIndices: indices, playerId: owner };
      }
    }
  }

  return null;
}

export function isBoardFull(cells: (string | null)[]): boolean {
  return cells.every((cell) => cell !== null);
}
