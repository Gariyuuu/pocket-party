import type { EnginePlayer } from "@/games/core/game-engine";

export type ChessPieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";

export interface ChessPiece {
  playerId: string;
  type: ChessPieceType;
}

export interface CastlingRights {
  /** playerId -> still allowed to castle king-side (nothing has moved that would forfeit it). */
  kingSide: Record<string, boolean>;
  queenSide: Record<string, boolean>;
}

export interface LastChessMove {
  from: number;
  to: number;
  piece: ChessPieceType;
  captured: ChessPieceType | null;
  promotion: ChessPieceType | null;
  isCastle: boolean;
  isEnPassant: boolean;
  isCheck: boolean;
}

export interface ChessState {
  players: EnginePlayer[];
  /** 64 cells, row-major; row 0 is Black's home rank, row 7 is White's. */
  board: (ChessPiece | null)[];
  currentTurnPlayerId: string;
  castlingRights: CastlingRights;
  /** The square a pawn just double-stepped past — capturable via en passant on the very next move only. */
  enPassantTarget: number | null;
  /** Moves since the last capture or pawn push — a simplified 50-move-rule draw counter (counts plies, not full moves). */
  halfmoveClock: number;
  lastMove: LastChessMove | null;
  status: "active" | "checkmate" | "stalemate" | "draw";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type ChessAction = { type: "move"; from: number; to: number; promotion?: ChessPieceType };
