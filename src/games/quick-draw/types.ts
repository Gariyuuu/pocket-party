import type { EnginePlayer } from "@/games/core/game-engine";

export interface QuickDrawGuess {
  answerIndex: number;
  guessedAt: number;
}

export interface QuickDrawRoundResult {
  correctIndex: number;
  scores: Record<string, number>;
}

export interface QuickDrawState {
  players: EnginePlayer[];
  seed: string;
  round: number;
  totalRounds: number;
  artistPlayerId: string;
  promptWord: string;
  options: string[];
  correctIndex: number;
  roundStartedAt: number;
  roundEndsAt: number;
  roundDurationMs: number;
  /** playerId -> guess, cleared each round. Never includes the artist. */
  guesses: Record<string, QuickDrawGuess>;
  roundHistory: QuickDrawRoundResult[];
  totalScores: Record<string, number>;
  status: "drawing" | "match-ended";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type QuickDrawAction =
  | { type: "submit-guess"; answerIndex: number; now: number }
  | { type: "advance-round"; now: number };
