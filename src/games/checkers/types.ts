import type { EnginePlayer } from "@/games/core/game-engine";

export interface CheckersPiece {
  playerId: string;
  isKing: boolean;
}

export interface LastCheckersMove {
  from: number;
  path: number[];
  captured: number[];
  crowned: boolean;
}

export interface CheckersState {
  players: EnginePlayer[];
  /** 64 cells, row-major (row*8+col) — only dark squares are ever occupied, but flat 8x8 addressing is simpler than packing 32. */
  board: (CheckersPiece | null)[];
  currentTurnPlayerId: string;
  lastMove: LastCheckersMove | null;
  winnerPlayerId: string | null;
  isDraw: boolean;
}

/** `path` is the sequence of landing cells for this turn — length 1 for a simple step or a single jump, length >1 for a chained multi-jump. */
export type CheckersAction = { type: "move"; from: number; path: number[] };
