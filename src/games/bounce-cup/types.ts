import type { EnginePlayer } from "@/games/core/game-engine";
import type { Vec2 } from "@/games/core/physics";

export interface Cup {
  id: number;
  x: number;
  cleared: boolean;
}

export interface LastShot {
  playerId: string;
  angle: number;
  power: number;
  wind: number;
  path: Vec2[];
  hitCupId: number | null;
}

export interface BounceCupState {
  players: EnginePlayer[];
  seed: string;
  windEnabled: boolean;
  cups: Cup[];
  currentTurnPlayerId: string;
  moveCount: number;
  lastShot: LastShot | null;
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type BounceCupAction = { type: "shoot"; angle: number; power: number };
