import type { EnginePlayer } from "@/games/core/game-engine";

export type GridThreeMode = "classic" | "connect-five-board";

export interface GridThreeState {
  players: EnginePlayer[];
  mode: GridThreeMode;
  boardSize: 3 | 5;
  /** Cell value is the playerId occupying it, or null if empty. Row-major. */
  cells: (string | null)[];
  currentTurnPlayerId: string;
  winnerPlayerId: string | null;
  isDraw: boolean;
  winningLine: number[] | null;
  moveCount: number;
}

export type GridThreeAction = { type: "place"; cellIndex: number };
