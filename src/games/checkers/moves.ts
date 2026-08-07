import type { CheckersPiece } from "./types";

export const BOARD_SIZE = 8;

export function rowColOf(cell: number): [number, number] {
  return [Math.floor(cell / BOARD_SIZE), cell % BOARD_SIZE];
}

export function cellAt(row: number, col: number): number | null {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return row * BOARD_SIZE + col;
}

/** Non-kings only move toward the opponent's home row; kings move in any of the 4 diagonal directions. */
function directionsFor(piece: CheckersPiece, forwardRowDelta: number): number[] {
  return piece.isKing ? [-1, 1] : [forwardRowDelta];
}

export interface StepOption {
  to: number;
}
export interface JumpOption {
  to: number;
  captured: number;
}

export function stepOptions(
  board: (CheckersPiece | null)[],
  from: number,
  piece: CheckersPiece,
  forwardRowDelta: number,
): StepOption[] {
  const [row, col] = rowColOf(from);
  const options: StepOption[] = [];
  for (const dRow of directionsFor(piece, forwardRowDelta)) {
    for (const dCol of [-1, 1]) {
      const to = cellAt(row + dRow, col + dCol);
      if (to !== null && board[to] === null) options.push({ to });
    }
  }
  return options;
}

export function jumpOptions(
  board: (CheckersPiece | null)[],
  from: number,
  piece: CheckersPiece,
  forwardRowDelta: number,
): JumpOption[] {
  const [row, col] = rowColOf(from);
  const options: JumpOption[] = [];
  for (const dRow of directionsFor(piece, forwardRowDelta)) {
    for (const dCol of [-1, 1]) {
      const midCell = cellAt(row + dRow, col + dCol);
      const landCell = cellAt(row + dRow * 2, col + dCol * 2);
      if (midCell === null || landCell === null) continue;
      const midPiece = board[midCell];
      if (midPiece && midPiece.playerId !== piece.playerId && board[landCell] === null) {
        options.push({ to: landCell, captured: midCell });
      }
    }
  }
  return options;
}

/** True if this specific piece has at least one legal jump available right now. */
export function pieceHasJump(
  board: (CheckersPiece | null)[],
  from: number,
  piece: CheckersPiece,
  forwardRowDelta: number,
): boolean {
  return jumpOptions(board, from, piece, forwardRowDelta).length > 0;
}

/** True if any of playerId's pieces can capture — triggers checkers' mandatory-capture rule. */
export function hasAnyCapture(
  board: (CheckersPiece | null)[],
  playerId: string,
  forwardRowDeltaFor: (id: string) => number,
): boolean {
  for (let cell = 0; cell < board.length; cell++) {
    const piece = board[cell];
    if (piece && piece.playerId === playerId && pieceHasJump(board, cell, piece, forwardRowDeltaFor(playerId))) {
      return true;
    }
  }
  return false;
}

/** True if playerId has any legal move at all (step or jump) — used for the "no moves left" loss condition. */
export function hasAnyLegalMove(
  board: (CheckersPiece | null)[],
  playerId: string,
  forwardRowDeltaFor: (id: string) => number,
): boolean {
  const forwardRowDelta = forwardRowDeltaFor(playerId);
  for (let cell = 0; cell < board.length; cell++) {
    const piece = board[cell];
    if (!piece || piece.playerId !== playerId) continue;
    if (stepOptions(board, cell, piece, forwardRowDelta).length > 0) return true;
    if (jumpOptions(board, cell, piece, forwardRowDelta).length > 0) return true;
  }
  return false;
}
