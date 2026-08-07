import type { EnginePlayer } from "@/games/core/game-engine";
import type { Vec2 } from "@/games/core/physics";

export interface LastDartThrow {
  playerId: string;
  angle: number;
  power: number;
  path: Vec2[];
  score: number;
  ringLabel: string | null;
}

export interface DartsState {
  players: EnginePlayer[];
  totalRounds: number;
  dartsThrownThisTurn: number;
  turnScore: number;
  turnsPlayed: number;
  totalScores: Record<string, number>;
  currentTurnPlayerId: string;
  lastThrow: LastDartThrow | null;
  status: "active" | "match-ended";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type DartsAction = { type: "throw"; angle: number; power: number };
