import type { EnginePlayer } from "@/games/core/game-engine";
import type { Vec2 } from "@/games/core/physics";

export interface LastHoopsShot {
  playerId: string;
  angle: number;
  power: number;
  wind: number;
  path: Vec2[];
  hoopX: number;
  made: boolean;
}

export interface MiniHoopsState {
  players: EnginePlayer[];
  seed: string;
  windEnabled: boolean;
  shotsPerPlayer: number;
  shotIndex: number;
  makesByPlayer: Record<string, number>;
  currentTurnPlayerId: string;
  lastShot: LastHoopsShot | null;
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type MiniHoopsAction = { type: "shoot"; angle: number; power: number };
