import type { CastlingRights, ChessPiece, ChessPieceType } from "./types";

export const SIZE = 8;

export function rowColOf(cell: number): [number, number] {
  return [Math.floor(cell / SIZE), cell % SIZE];
}

export function cellAt(row: number, col: number): number | null {
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
  return row * SIZE + col;
}

export interface PseudoMove {
  from: number;
  to: number;
  isEnPassant?: boolean;
  isCastleKingSide?: boolean;
  isCastleQueenSide?: boolean;
  /** Set on a pawn move reaching the final rank — the actual chosen piece is supplied by the player's action. */
  isPromotion?: boolean;
}

const SLIDE_DIRECTIONS: Record<"bishop" | "rook" | "queen", [number, number][]> = {
  bishop: [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ],
  rook: [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ],
  queen: [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ],
};
const KNIGHT_DELTAS: [number, number][] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];
const KING_DELTAS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

/** Squares a piece could move to or capture on, ignoring whether that would leave its own king in check. Used both for move generation and (for attack purposes) check detection. */
function reachableSquares(board: (ChessPiece | null)[], cell: number, piece: ChessPiece): number[] {
  const [row, col] = rowColOf(cell);
  const out: number[] = [];

  if (piece.type === "knight" || piece.type === "king") {
    const deltas = piece.type === "knight" ? KNIGHT_DELTAS : KING_DELTAS;
    for (const [dr, dc] of deltas) {
      const to = cellAt(row + dr, col + dc);
      if (to === null) continue;
      const occupant = board[to];
      if (!occupant || occupant.playerId !== piece.playerId) out.push(to);
    }
    return out;
  }

  if (piece.type === "bishop" || piece.type === "rook" || piece.type === "queen") {
    for (const [dr, dc] of SLIDE_DIRECTIONS[piece.type]) {
      let r = row + dr;
      let c = col + dc;
      while (true) {
        const to = cellAt(r, c);
        if (to === null) break;
        const occupant = board[to];
        if (!occupant) {
          out.push(to);
        } else {
          if (occupant.playerId !== piece.playerId) out.push(to);
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return out;
  }

  return out; // pawns handled separately (attack pattern differs from move pattern)
}

/** A pawn's diagonal *attack* squares — used for check detection, independent of whether a capture is currently possible there. */
function pawnAttackSquares(cell: number, forwardRowDelta: number): number[] {
  const [row, col] = rowColOf(cell);
  const out: number[] = [];
  for (const dc of [-1, 1]) {
    const to = cellAt(row + forwardRowDelta, col + dc);
    if (to !== null) out.push(to);
  }
  return out;
}

export function isSquareAttacked(
  board: (ChessPiece | null)[],
  square: number,
  byPlayerId: string,
  forwardRowDeltaFor: (id: string) => number,
): boolean {
  for (let cell = 0; cell < board.length; cell++) {
    const piece = board[cell];
    if (!piece || piece.playerId !== byPlayerId) continue;
    if (piece.type === "pawn") {
      if (pawnAttackSquares(cell, forwardRowDeltaFor(byPlayerId)).includes(square)) return true;
    } else if (reachableSquares(board, cell, piece).includes(square)) {
      return true;
    }
  }
  return false;
}

function findKing(board: (ChessPiece | null)[], playerId: string): number {
  return board.findIndex((p) => p?.playerId === playerId && p.type === "king");
}

export function isInCheck(
  board: (ChessPiece | null)[],
  playerId: string,
  opponentId: string,
  forwardRowDeltaFor: (id: string) => number,
): boolean {
  const kingCell = findKing(board, playerId);
  if (kingCell === -1) return false;
  return isSquareAttacked(board, kingCell, opponentId, forwardRowDeltaFor);
}

/** Pseudo-legal moves for one piece — legal except possibly for leaving your own king in check. */
export function pseudoLegalMovesForPiece(
  board: (ChessPiece | null)[],
  cell: number,
  piece: ChessPiece,
  opponentId: string,
  forwardRowDeltaFor: (id: string) => number,
  castlingRights: CastlingRights,
  enPassantTarget: number | null,
): PseudoMove[] {
  if (piece.type !== "pawn" && piece.type !== "king") {
    return reachableSquares(board, cell, piece).map((to) => ({ from: cell, to }));
  }

  if (piece.type === "king") {
    const moves: PseudoMove[] = reachableSquares(board, cell, piece).map((to) => ({ from: cell, to }));
    const [row, col] = rowColOf(cell);
    const forwardRowDelta = forwardRowDeltaFor(piece.playerId);
    const inCheckNow = isSquareAttacked(board, cell, opponentId, forwardRowDeltaFor);
    if (!inCheckNow) {
      if (castlingRights.kingSide[piece.playerId]) {
        const f = cellAt(row, col + 1)!;
        const g = cellAt(row, col + 2)!;
        const rookCell = cellAt(row, col + 3);
        const rook = rookCell !== null ? board[rookCell] : null;
        if (
          rook?.type === "rook" &&
          rook.playerId === piece.playerId &&
          !board[f] &&
          !board[g] &&
          !isSquareAttacked(board, f, opponentId, forwardRowDeltaFor) &&
          !isSquareAttacked(board, g, opponentId, forwardRowDeltaFor)
        ) {
          moves.push({ from: cell, to: g, isCastleKingSide: true });
        }
      }
      if (castlingRights.queenSide[piece.playerId]) {
        const d = cellAt(row, col - 1)!;
        const b = cellAt(row, col - 2)!;
        const a = cellAt(row, col - 3);
        const rookCell = cellAt(row, col - 4);
        const rook = rookCell !== null ? board[rookCell] : null;
        if (
          rook?.type === "rook" &&
          rook.playerId === piece.playerId &&
          !board[d] &&
          !board[b] &&
          a !== null &&
          !board[a] &&
          !isSquareAttacked(board, d, opponentId, forwardRowDeltaFor) &&
          !isSquareAttacked(board, b, opponentId, forwardRowDeltaFor)
        ) {
          moves.push({ from: cell, to: b, isCastleQueenSide: true });
        }
      }
      void forwardRowDelta;
    }
    return moves;
  }

  // Pawns.
  const [row, col] = rowColOf(cell);
  const forwardRowDelta = forwardRowDeltaFor(piece.playerId);
  const moves: PseudoMove[] = [];
  const oneStep = cellAt(row + forwardRowDelta, col);
  const promotionRow = forwardRowDelta === -1 ? 0 : SIZE - 1;

  if (oneStep !== null && !board[oneStep]) {
    moves.push({ from: cell, to: oneStep, isPromotion: row + forwardRowDelta === promotionRow });
    const startRow = forwardRowDelta === -1 ? SIZE - 2 : 1;
    const twoStep = cellAt(row + forwardRowDelta * 2, col);
    if (row === startRow && twoStep !== null && !board[twoStep]) {
      moves.push({ from: cell, to: twoStep });
    }
  }
  for (const dc of [-1, 1]) {
    const to = cellAt(row + forwardRowDelta, col + dc);
    if (to === null) continue;
    const occupant = board[to];
    if (occupant && occupant.playerId !== piece.playerId) {
      moves.push({ from: cell, to, isPromotion: row + forwardRowDelta === promotionRow });
    } else if (!occupant && to === enPassantTarget) {
      moves.push({ from: cell, to, isEnPassant: true });
    }
  }
  return moves;
}

/** Applies a pseudo-legal move to a cloned board — used both for real moves and for check-safety simulation. Does not touch castling rights/en-passant bookkeeping (the engine owns that). */
export function applyMoveToBoard(
  board: (ChessPiece | null)[],
  move: PseudoMove,
  promotion?: ChessPieceType,
): (ChessPiece | null)[] {
  const next = [...board];
  const piece = next[move.from]!;
  next[move.from] = null;

  if (move.isEnPassant) {
    const [toRow, toCol] = rowColOf(move.to);
    const [fromRow] = rowColOf(move.from);
    next[cellAt(fromRow, toCol)!] = null;
    void toRow;
  }

  next[move.to] = move.isPromotion && promotion ? { playerId: piece.playerId, type: promotion } : piece;

  if (move.isCastleKingSide || move.isCastleQueenSide) {
    const [row, col] = rowColOf(move.from);
    const rookFrom = cellAt(row, move.isCastleKingSide ? col + 3 : col - 4)!;
    const rookTo = cellAt(row, move.isCastleKingSide ? col + 1 : col - 1)!;
    next[rookTo] = next[rookFrom];
    next[rookFrom] = null;
  }

  return next;
}

/** Every legal move for playerId — pseudo-legal moves filtered to exclude any that leave their own king in check. */
export function legalMovesForPlayer(
  board: (ChessPiece | null)[],
  playerId: string,
  opponentId: string,
  forwardRowDeltaFor: (id: string) => number,
  castlingRights: CastlingRights,
  enPassantTarget: number | null,
): PseudoMove[] {
  const legal: PseudoMove[] = [];
  for (let cell = 0; cell < board.length; cell++) {
    const piece = board[cell];
    if (!piece || piece.playerId !== playerId) continue;
    const pseudo = pseudoLegalMovesForPiece(board, cell, piece, opponentId, forwardRowDeltaFor, castlingRights, enPassantTarget);
    for (const move of pseudo) {
      const resultBoard = applyMoveToBoard(board, move, move.isPromotion ? "queen" : undefined);
      if (!isInCheck(resultBoard, playerId, opponentId, forwardRowDeltaFor)) legal.push(move);
    }
  }
  return legal;
}
