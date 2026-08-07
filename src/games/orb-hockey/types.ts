import type { EnginePlayer } from "@/games/core/game-engine";

export interface OrbHockeyState {
  players: EnginePlayer[];
  scoreByPlayer: Record<string, number>;
  status: "countdown" | "live" | "completed";
  countdownEndsAt: number;
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type OrbHockeyAction =
  | { type: "score-goal"; scoringPlayerId: string; now: number }
  | { type: "start-serve"; now: number };
