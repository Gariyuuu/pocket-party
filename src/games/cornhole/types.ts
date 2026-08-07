import type { EnginePlayer } from "@/games/core/game-engine";
import type { Vec2 } from "@/games/core/physics";

export interface LastCornholeToss {
  playerId: string;
  angle: number;
  power: number;
  path: Vec2[];
  score: number;
  label: string | null;
}

export interface CornholeState {
  players: EnginePlayer[];
  totalRounds: number;
  bagsThrownThisTurn: number;
  turnScore: number;
  turnsPlayed: number;
  totalScores: Record<string, number>;
  currentTurnPlayerId: string;
  lastToss: LastCornholeToss | null;
  status: "active" | "match-ended";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type CornholeAction = { type: "toss"; angle: number; power: number };
