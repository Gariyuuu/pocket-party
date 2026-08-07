import type { EnginePlayer } from "@/games/core/game-engine";

export const WORD_CLASH_TOTAL_ROUNDS = 3;
export const WORD_CLASH_ROUND_DURATION_MS = 60_000;
export const WORD_CLASH_LETTER_POOL_SIZE = 16;

export interface WordSubmission {
  word: string;
  submittedAt: number;
}

export interface RoundResult {
  /** playerId -> words that scored (unique, non-duplicate, valid). */
  scoringWords: Record<string, string[]>;
  /** playerId -> points earned this round. */
  scores: Record<string, number>;
}

export interface WordClashState {
  players: EnginePlayer[];
  seed: string;
  round: number;
  totalRounds: number;
  letterPool: string[];
  roundEndsAt: number;
  roundDurationMs: number;
  /** playerId -> submissions for the current round only. */
  submissions: Record<string, WordSubmission[]>;
  roundHistory: RoundResult[];
  totalScores: Record<string, number>;
  status: "round-active" | "match-ended";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type WordClashAction =
  | { type: "submit-word"; word: string }
  | { type: "advance-round"; now: number };
