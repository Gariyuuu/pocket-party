import type { EnginePlayer } from "@/games/core/game-engine";
import type { Vec2 } from "@/games/core/physics";

export type ProjectileType = "standard" | "split" | "heavy" | "bounce" | "smoke";

export interface Tank {
  playerId: string;
  x: number;
  health: number;
  alive: boolean;
}

export interface SmokeCloud {
  x: number;
  radius: number;
  turnsRemaining: number;
}

export interface ImpactRecord {
  x: number;
  y: number;
  radius: number;
  damageDealt: Record<string, number>;
}

export interface LastTankShot {
  playerId: string;
  angle: number;
  power: number;
  wind: number;
  projectileType: ProjectileType;
  path: Vec2[];
  impacts: ImpactRecord[];
}

export interface TankTacticsState {
  players: EnginePlayer[];
  seed: string;
  terrainHeights: number[];
  tanks: Tank[];
  currentTurnPlayerId: string;
  turnEndsAt: number;
  turnDurationMs: number;
  turnCount: number;
  smokeClouds: SmokeCloud[];
  lastShot: LastTankShot | null;
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type TankTacticsAction =
  | { type: "fire"; angle: number; power: number; projectileType: ProjectileType; now: number }
  | { type: "skip-turn"; now: number };
