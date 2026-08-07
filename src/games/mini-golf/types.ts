import type { EnginePlayer } from "@/games/core/game-engine";
import type { Vec2 } from "@/games/core/physics";

export interface MiniGolfObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MiniGolfCourse {
  name: string;
  start: Vec2;
  hole: Vec2;
  obstacles: MiniGolfObstacle[];
  par: number;
}

export interface MiniGolfBall {
  playerId: string;
  x: number;
  y: number;
  /** Strokes taken on the current hole only — folded into totalStrokes once holed out. */
  strokes: number;
  holedOut: boolean;
}

export interface LastMiniGolfShot {
  playerId: string;
  angle: number;
  power: number;
  path: Vec2[];
  holedOut: boolean;
  strokesUsed: number;
  forcedHoleOut: boolean;
}

export interface MiniGolfState {
  players: EnginePlayer[];
  holeIndex: number;
  holeCount: number;
  balls: MiniGolfBall[];
  /** Strokes from every completed hole, per player — what the final standings are ranked on. */
  totalStrokes: Record<string, number>;
  currentTurnPlayerId: string;
  lastShot: LastMiniGolfShot | null;
  status: "playing" | "match-ended";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

/** angle in degrees (0 = right, 90 = up, matches velocityFromAimPower's convention), power 0-100. */
export type MiniGolfAction = { type: "putt"; angle: number; power: number };
