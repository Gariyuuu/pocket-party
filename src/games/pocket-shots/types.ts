import type { EnginePlayer } from "@/games/core/game-engine";

export type BallGroup = "orb" | "ring" | "comet" | "cue";
export type Assignment = "orb" | "ring" | null;

export interface PocketShotsBall {
  id: string;
  group: BallGroup;
  x: number;
  y: number;
  pocketed: boolean;
}

export interface LastPocketShot {
  playerId: string;
  angle: number;
  power: number;
  paths: Record<string, { x: number; y: number }[]>;
  pocketedIds: string[];
  foul: string | null;
}

export interface PocketShotsState {
  players: EnginePlayer[];
  balls: PocketShotsBall[];
  /** null until a player legally pockets a non-comet ball for the first time ("open table"). */
  assignments: Record<string, Assignment>;
  currentTurnPlayerId: string;
  turnCount: number;
  lastShot: LastPocketShot | null;
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type PocketShotsAction = { type: "shoot"; angle: number; power: number };
