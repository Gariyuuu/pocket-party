import type { EnginePlayer } from "@/games/core/game-engine";

export const FOURFALL_COLUMNS = 7;
export const FOURFALL_ROWS = 6;

export interface FourfallState {
  players: EnginePlayer[];
  columns: number;
  rows: number;
  /** Row-major, row 0 is the bottom row. */
  cells: (string | null)[];
  currentTurnPlayerId: string;
  winnerPlayerId: string | null;
  isDraw: boolean;
  winningLine: number[] | null;
  lastDropColumn: number | null;
  lastDropRow: number | null;
  moveCount: number;
}

export type FourfallAction = { type: "drop"; column: number };
