import type { EnginePlayer } from "@/games/core/game-engine";

export interface LastDotsAndBoxesMove {
  playerId: string;
  edge: number;
  completedBoxes: number[];
}

export interface DotsAndBoxesState {
  players: EnginePlayer[];
  /** 40 edges (20 horizontal, indices 0-19, then 20 vertical, indices 20-39) — see moves.ts for the exact addressing. */
  edges: boolean[];
  /** 16 boxes, row-major. Value is the owning player's id, or null if not yet completed. */
  boxOwners: (string | null)[];
  currentTurnPlayerId: string;
  lastMove: LastDotsAndBoxesMove | null;
  status: "active" | "finished";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type DotsAndBoxesAction = { type: "claim-edge"; edge: number };
