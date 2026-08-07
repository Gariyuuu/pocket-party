import { describe, expect, it } from "vitest";
import { quickDrawEngine } from "@/games/quick-draw/engine";
import { MAX_GUESS_POINTS, MIN_GUESS_POINTS, OPTION_COUNT, POINTS_PER_CORRECT_GUESSER } from "@/games/quick-draw/constants";
import type { QuickDrawState } from "@/games/quick-draw/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
  { playerId: "p3", seat: 3, nickname: "Cy" },
];

function initial() {
  return quickDrawEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 1_000 });
}

describe("quickDrawEngine.createInitialState", () => {
  it("sets up round 1 with the first-seat player as artist", () => {
    const state = initial();
    expect(state.round).toBe(1);
    expect(state.totalRounds).toBe(3);
    expect(state.artistPlayerId).toBe("p1");
    expect(state.options).toHaveLength(OPTION_COUNT);
    expect(state.options[state.correctIndex]).toBe(state.promptWord);
    expect(state.roundEndsAt).toBeGreaterThan(state.roundStartedAt);
  });

  it("is deterministic for the same seed", () => {
    const a = quickDrawEngine.createInitialState({ seed: "abc", players: PLAYERS, modifiers: {}, now: 0 });
    const b = quickDrawEngine.createInitialState({ seed: "abc", players: PLAYERS, modifiers: {}, now: 0 });
    expect(a.promptWord).toBe(b.promptWord);
    expect(a.options).toEqual(b.options);
  });
});

describe("quickDrawEngine.applyAction — submit-guess", () => {
  it("rejects the artist trying to guess", () => {
    const state = initial();
    const result = quickDrawEngine.applyAction(state, { type: "submit-guess", answerIndex: 0, now: 2000 }, "p1");
    expect(result.ok).toBe(false);
  });

  it("rejects a second guess from the same player", () => {
    const state = initial();
    const first = quickDrawEngine.applyAction(
      state,
      { type: "submit-guess", answerIndex: 0, now: 2000 },
      "p2",
    ) as { ok: true; nextState: QuickDrawState };
    const second = quickDrawEngine.applyAction(
      first.nextState,
      { type: "submit-guess", answerIndex: 1, now: 2500 },
      "p2",
    );
    expect(second.ok).toBe(false);
  });

  it("rejects an out-of-range answer index", () => {
    const state = initial();
    const result = quickDrawEngine.applyAction(state, { type: "submit-guess", answerIndex: 99, now: 2000 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("records a valid guess", () => {
    const state = initial();
    const result = quickDrawEngine.applyAction(
      state,
      { type: "submit-guess", answerIndex: state.correctIndex, now: 2000 },
      "p2",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.nextState.guesses.p2).toEqual({ answerIndex: state.correctIndex, guessedAt: 2000 });
  });
});

describe("quickDrawEngine.applyAction — advance-round", () => {
  it("rewards a faster correct guess with more points than a slower one", () => {
    const state = initial();
    const roundStart = state.roundStartedAt;
    const withGuesses: QuickDrawState = {
      ...state,
      guesses: {
        p2: { answerIndex: state.correctIndex, guessedAt: roundStart + 1000 }, // fast
        p3: { answerIndex: state.correctIndex, guessedAt: roundStart + state.roundDurationMs - 1000 }, // slow
      },
    };
    const result = quickDrawEngine.applyAction(withGuesses, { type: "advance-round", now: 5000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const fastPoints = result.nextState.roundHistory[0].scores.p2;
      const slowPoints = result.nextState.roundHistory[0].scores.p3;
      expect(fastPoints).toBeGreaterThan(slowPoints);
      expect(fastPoints).toBeLessThanOrEqual(MAX_GUESS_POINTS);
      expect(slowPoints).toBeGreaterThanOrEqual(MIN_GUESS_POINTS);
    }
  });

  it("scores wrong guesses as zero and rewards the artist per correct guesser", () => {
    const state = initial();
    const withGuesses: QuickDrawState = {
      ...state,
      guesses: {
        p2: { answerIndex: state.correctIndex, guessedAt: state.roundStartedAt + 500 },
        p3: { answerIndex: (state.correctIndex + 1) % state.options.length, guessedAt: state.roundStartedAt + 500 },
      },
    };
    const result = quickDrawEngine.applyAction(withGuesses, { type: "advance-round", now: 5000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.roundHistory[0].scores.p3).toBe(0);
      expect(result.nextState.totalScores.p1).toBe(1 * POINTS_PER_CORRECT_GUESSER);
    }
  });

  it("rotates the artist and clears guesses for the next round", () => {
    const state = initial();
    const result = quickDrawEngine.applyAction(state, { type: "advance-round", now: 5000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.round).toBe(2);
      expect(result.nextState.artistPlayerId).toBe("p2");
      expect(result.nextState.guesses).toEqual({});
      expect(result.nextState.status).toBe("drawing");
    }
  });

  it("ends the match with a winner after the final round", () => {
    const state: QuickDrawState = {
      ...initial(),
      round: 3,
      totalScores: { p1: 5, p2: 10, p3: 2 },
      guesses: {},
    };
    const result = quickDrawEngine.applyAction(state, { type: "advance-round", now: 5000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.status).toBe("match-ended");
      expect(result.nextState.winnerPlayerId).toBe("p2");
    }
  });

  it("ends the match as a draw on a tie", () => {
    const state: QuickDrawState = {
      ...initial(),
      round: 3,
      totalScores: { p1: 6, p2: 6, p3: 2 },
      guesses: {},
    };
    const result = quickDrawEngine.applyAction(state, { type: "advance-round", now: 5000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.isDraw).toBe(true);
      expect(result.nextState.winnerPlayerId).toBeNull();
    }
  });
});

describe("quickDrawEngine.checkOutcome", () => {
  it("is active mid-match", () => {
    expect(quickDrawEngine.checkOutcome(initial())).toEqual({ status: "active" });
  });
});
