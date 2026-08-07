import type { EnginePlayer } from "@/games/core/game-engine";

export const YAHTZEE_CATEGORIES = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "threeOfKind",
  "fourOfKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "yahtzee",
  "chance",
] as const;

export type YahtzeeCategory = (typeof YAHTZEE_CATEGORIES)[number];

export interface LastYahtzeeEvent {
  playerId: string;
  type: "roll" | "score";
  category?: YahtzeeCategory;
  score?: number;
}

export interface YahtzeeState {
  players: EnginePlayer[];
  seed: string;
  /** 5 dice, values 1-6. Meaningless until the current player's first roll of their turn. */
  dice: number[];
  heldDice: boolean[];
  rollsUsedThisTurn: number;
  /** Monotonically increasing — every roll derives its randomness from `${seed}:yahtzee-roll:${rollCount}` so the sequence is deterministic and replayable. */
  rollCount: number;
  currentTurnPlayerId: string;
  /** Per player, per category — a category's presence as a key (even with value 0) means it's been used. */
  scores: Record<string, Partial<Record<YahtzeeCategory, number>>>;
  lastEvent: LastYahtzeeEvent | null;
  status: "active" | "match-ended";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type YahtzeeAction =
  | { type: "roll" }
  | { type: "toggle-hold"; die: number }
  | { type: "score"; category: YahtzeeCategory };
