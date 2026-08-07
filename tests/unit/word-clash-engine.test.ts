import { describe, expect, it } from "vitest";
import { wordClashEngine } from "@/games/word-clash/engine";
import { wordScore } from "@/games/word-clash/scoring";
import type { WordClashState } from "@/games/word-clash/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function baseState(overrides: Partial<WordClashState> = {}): WordClashState {
  return {
    players: PLAYERS,
    seed: "seed-1",
    round: 1,
    totalRounds: 3,
    letterPool: ["C", "A", "T", "D", "O", "G", "S", "R", "E", "N"],
    roundEndsAt: 60_000,
    roundDurationMs: 60_000,
    submissions: {},
    roundHistory: [],
    totalScores: { p1: 0, p2: 0 },
    status: "round-active",
    winnerPlayerId: null,
    isDraw: false,
    ...overrides,
  };
}

describe("wordClashEngine.createInitialState", () => {
  it("starts round 1 with a deadline roundDurationMs after `now`", () => {
    const state = wordClashEngine.createInitialState({
      seed: "abc",
      players: PLAYERS,
      modifiers: {},
      now: 1_000,
    });
    expect(state.round).toBe(1);
    expect(state.roundEndsAt).toBe(1_000 + state.roundDurationMs);
    expect(state.letterPool.length).toBeGreaterThan(0);
  });
});

describe("wordClashEngine.applyAction — submit-word", () => {
  it("accepts a word formable from the pool", () => {
    const result = wordClashEngine.applyAction(baseState(), { type: "submit-word", word: "CAT" }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.submissions.p1?.map((s) => s.word)).toEqual(["CAT"]);
    }
  });

  it("rejects a word that isn't formable from the pool", () => {
    const result = wordClashEngine.applyAction(baseState(), { type: "submit-word", word: "ZEBRA" }, "p1");
    expect(result.ok).toBe(false);
  });

  it("rejects a duplicate submission from the same player", () => {
    const state = baseState({ submissions: { p1: [{ word: "CAT", submittedAt: 0 }] } });
    const result = wordClashEngine.applyAction(state, { type: "submit-word", word: "CAT" }, "p1");
    expect(result.ok).toBe(false);
  });

  it("rejects words shorter than 3 letters", () => {
    const result = wordClashEngine.applyAction(baseState(), { type: "submit-word", word: "AT" }, "p1");
    expect(result.ok).toBe(false);
  });
});

describe("wordClashEngine.applyAction — advance-round", () => {
  it("scores the round and advances when more rounds remain", () => {
    const state = baseState({
      submissions: { p1: [{ word: "CAT", submittedAt: 0 }], p2: [{ word: "DOGS", submittedAt: 0 }] },
    });
    const result = wordClashEngine.applyAction(state, { type: "advance-round", now: 5_000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.round).toBe(2);
      expect(result.nextState.status).toBe("round-active");
      expect(result.nextState.totalScores.p1).toBe(wordScore(3));
      expect(result.nextState.totalScores.p2).toBe(wordScore(4));
      expect(result.nextState.submissions).toEqual({});
      expect(result.nextState.roundEndsAt).toBe(5_000 + state.roundDurationMs);
    }
  });

  it("ends the match with a winner after the final round", () => {
    const state = baseState({
      round: 3,
      totalScores: { p1: 2, p2: 1 },
      submissions: { p1: [{ word: "CAT", submittedAt: 0 }], p2: [] },
    });
    const result = wordClashEngine.applyAction(state, { type: "advance-round", now: 5_000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.status).toBe("match-ended");
      expect(result.nextState.winnerPlayerId).toBe("p1");
      expect(result.nextState.isDraw).toBe(false);
    }
  });

  it("ends the match as a draw on a tied final score", () => {
    const state = baseState({ round: 3, totalScores: { p1: 5, p2: 5 }, submissions: {} });
    const result = wordClashEngine.applyAction(state, { type: "advance-round", now: 5_000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.status).toBe("match-ended");
      expect(result.nextState.isDraw).toBe(true);
      expect(result.nextState.winnerPlayerId).toBeNull();
    }
  });

  it("cancels a word both players found when scoring the round", () => {
    const state = baseState({
      submissions: {
        p1: [{ word: "CAT", submittedAt: 0 }],
        p2: [{ word: "CAT", submittedAt: 0 }],
      },
    });
    const result = wordClashEngine.applyAction(state, { type: "advance-round", now: 5_000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.totalScores.p1).toBe(0);
      expect(result.nextState.totalScores.p2).toBe(0);
    }
  });
});

describe("wordClashEngine.checkOutcome", () => {
  it("is active mid-match", () => {
    expect(wordClashEngine.checkOutcome(baseState())).toEqual({ status: "active" });
  });

  it("reports the winner once the match has ended", () => {
    const state = baseState({ status: "match-ended", winnerPlayerId: "p1" });
    expect(wordClashEngine.checkOutcome(state)).toEqual({ status: "win", winnerPlayerId: "p1" });
  });

  it("reports a draw once the match has ended with no winner", () => {
    const state = baseState({ status: "match-ended", isDraw: true });
    expect(wordClashEngine.checkOutcome(state)).toEqual({ status: "draw" });
  });
});
