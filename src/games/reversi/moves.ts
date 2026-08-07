export const BOARD_SIZE = 8;

const DIRECTIONS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function rowColOf(cell: number): [number, number] {
  return [Math.floor(cell / BOARD_SIZE), cell % BOARD_SIZE];
}

export function cellAt(row: number, col: number): number | null {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return row * BOARD_SIZE + col;
}

/** Cells that would flip if `playerId` placed a disc at `cell` right now — an empty array means the move is illegal (including if `cell` is already occupied). */
export function flipsForMove(
  board: (string | null)[],
  cell: number,
  playerId: string,
  opponentId: string,
): number[] {
  if (board[cell] !== null) return [];
  const [row, col] = rowColOf(cell);
  const flips: number[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    const line: number[] = [];
    let r = row + dr;
    let c = col + dc;
    while (true) {
      const at = cellAt(r, c);
      if (at === null) break;
      if (board[at] === opponentId) {
        line.push(at);
        r += dr;
        c += dc;
        continue;
      }
      if (board[at] === playerId && line.length > 0) flips.push(...line);
      break;
    }
  }
  return flips;
}

/** Every cell `playerId` could legally place a disc on right now. */
export function legalMoves(board: (string | null)[], playerId: string, opponentId: string): number[] {
  const moves: number[] = [];
  for (let cell = 0; cell < board.length; cell++) {
    if (flipsForMove(board, cell, playerId, opponentId).length > 0) moves.push(cell);
  }
  return moves;
}
