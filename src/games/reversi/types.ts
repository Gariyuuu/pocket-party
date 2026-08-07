import type { EnginePlayer } from "@/games/core/game-engine";

export interface LastReversiMove {
  playerId: string;
  cell: number;
  flipped: number[];
}

export interface ReversiState {
  players: EnginePlayer[];
  /** 64 cells, row-major (row*8+col). Value is the occupying player's id, or null if empty. */
  board: (string | null)[];
  currentTurnPlayerId: string;
  lastMove: LastReversiMove | null;
  status: "active" | "finished";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type ReversiAction = { type: "place"; cell: number };
