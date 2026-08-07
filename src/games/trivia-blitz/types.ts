import type { EnginePlayer } from "@/games/core/game-engine";

export interface TriviaAnswerRecord {
  answerIndex: number;
  correct: boolean;
  pointsAwarded: number;
}

export interface TriviaRoundResult {
  questionIndex: number;
  answers: Record<string, TriviaAnswerRecord>;
}

export interface TriviaBlitzState {
  players: EnginePlayer[];
  seed: string;
  round: number;
  totalRounds: number;
  /** Indices into `TRIVIA_QUESTIONS`, shuffled once at match start — one per round, no repeats within a match. */
  questionOrder: number[];
  /** playerId -> answer for the current round only, cleared once the round advances. */
  answers: Record<string, TriviaAnswerRecord>;
  roundHistory: TriviaRoundResult[];
  totalScores: Record<string, number>;
  status: "round-active" | "match-ended";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type TriviaBlitzAction = { type: "answer"; answerIndex: number };
