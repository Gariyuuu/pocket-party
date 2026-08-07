import type { ChessPiece, ChessPieceType } from "./types";

const BACK_RANK: ChessPieceType[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];

/** playerIds[0] ("White") starts on row 7 (moves toward row 0); playerIds[1] ("Black") starts on row 0. */
export function initialChessBoard(playerIds: [string, string]): (ChessPiece | null)[] {
  const board: (ChessPiece | null)[] = Array(64).fill(null);
  const [white, black] = playerIds;
  for (let col = 0; col < 8; col++) {
    board[6 * 8 + col] = { playerId: white, type: "pawn" };
    board[1 * 8 + col] = { playerId: black, type: "pawn" };
    board[7 * 8 + col] = { playerId: white, type: BACK_RANK[col] };
    board[0 * 8 + col] = { playerId: black, type: BACK_RANK[col] };
  }
  return board;
}
