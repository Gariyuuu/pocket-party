import type { EnginePlayer } from "@/games/core/game-engine";

export interface BiteTile {
  id: string;
  letters: string;
  /** Which source word this bite was chopped from — the whole rack is shuffled by group, not by individual bite, so a group's bites always stay contiguous until part of it is claimed. */
  groupId: number;
}

export interface ClaimedWord {
  playerId: string;
  word: string;
  tileIds: string[];
  points: number;
}

export interface WordBitesState {
  players: EnginePlayer[];
  seed: string;
  rack: BiteTile[];
  claimed: ClaimedWord[];
  scores: Record<string, number>;
  roundEndsAt: number;
  roundDurationMs: number;
  status: "round-active" | "match-ended";
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type WordBitesAction =
  | { type: "submit-word"; tileIds: string[] }
  | { type: "advance-round"; now: number };
