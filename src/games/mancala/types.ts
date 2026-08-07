import type { EnginePlayer } from "@/games/core/game-engine";

export interface LastMancalaMove {
  playerId: string;
  pit: number;
  captured: boolean;
  extraTurn: boolean;
}

export interface MancalaState {
  players: EnginePlayer[];
  /** 14 cells: 0-5 = player 1's pits, 6 = player 1's store, 7-12 = player 2's pits, 13 = player 2's store. */
  board: number[];
  currentTurnPlayerId: string;
  lastMove: LastMancalaMove | null;
  status: "active" | "finished";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type MancalaAction = { type: "sow"; pit: number };
