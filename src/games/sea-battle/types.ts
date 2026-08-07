import type { EnginePlayer } from "@/games/core/game-engine";

export interface Ship {
  /** Board cell indices this ship occupies, in order. */
  cells: number[];
  /** Subset of `cells` that have been hit. */
  hits: number[];
}

export interface ShipPlacement {
  cells: number[];
}

export interface LastSeaBattleShot {
  playerId: string;
  cellIndex: number;
  hit: boolean;
  /** Set when this shot was the final hit on a ship. */
  sunkShipLength: number | null;
}

export interface SeaBattleState {
  players: EnginePlayer[];
  boardSize: number;
  shipLengths: number[];
  /** null until that player has submitted a valid fleet. */
  fleets: Record<string, Ship[] | null>;
  /** Cell indices each player has fired at, on their opponent's board. */
  shots: Record<string, number[]>;
  currentTurnPlayerId: string;
  status: "placing" | "battling" | "match-ended";
  lastShot: LastSeaBattleShot | null;
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type SeaBattleAction =
  | { type: "place-ships"; placements: ShipPlacement[] }
  | { type: "fire"; cellIndex: number };
