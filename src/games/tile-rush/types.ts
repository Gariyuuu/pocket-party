import type { EnginePlayer } from "@/games/core/game-engine";
import type { POWER_UP_TYPES } from "./constants";

export type PowerUpType = (typeof POWER_UP_TYPES)[number];

export interface Tile {
  color: number;
  powerUp: PowerUpType | null;
}

export interface PlayerBoard {
  tiles: Tile[];
  score: number;
  moveCount: number;
  multiplierCharges: number;
  freezeUntil: number;
  lastClear: { clearedCount: number; points: number; powerUps: PowerUpType[] } | null;
}

export interface TileRushState {
  players: EnginePlayer[];
  seed: string;
  roundEndsAt: number;
  roundDurationMs: number;
  boardsByPlayer: Record<string, PlayerBoard>;
  status: "active" | "completed";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type TileRushAction =
  | { type: "clear-tile"; row: number; col: number; now: number }
  | { type: "end-round"; now: number };
