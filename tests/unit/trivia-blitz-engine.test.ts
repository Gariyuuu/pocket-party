import { describe, expect, it } from "vitest";
import { triviaBlitzEngine, TRIVIA_TOTAL_ROUNDS } from "@/games/trivia-blitz/engine";
import { TRIVIA_QUESTIONS } from "@/games/trivia-blitz/questions";
import { pickTriviaAnswer } from "@/games/trivia-blitz/bot";
import type { TriviaBlitzState } from "@/games/trivia-blitz/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): TriviaBlitzState {
  return triviaBlitzEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

describe("triviaBlitzEngine.createInitialState", () => {
  it("shuffles a distinct question per round, up to the configured total", () => {
    const state = initial();
    expect(state.totalRounds).toBe(TRIVIA_TOTAL_ROUNDS);
    expect(state.questionOrder).toHaveLength(TRIVIA_TOTAL_ROUNDS);
    expect(new Set(state.questionOrder).size).toBe(TRIVIA_TOTAL_ROUNDS); // no repeats
    expect(state.round).toBe(1);
    expect(state.status).toBe("round-active");
  });
});

describe("triviaBlitzEngine.applyAction", () => {
  it("rejects an invalid answer index", () => {
    const result = triviaBlitzEngine.applyAction(initial(), { type: "answer", answerIndex: 7 }, "p1");
    expect(result.ok).toBe(false);
  });

  it("rejects answering twice in the same round", () => {
    let state = initial();
    const first = triviaBlitzEngine.applyAction(state, { type: "answer", answerIndex: 0 }, "p1");
    expect(first.ok).toBe(true);
    if (first.ok) state = first.nextState;
    const second = triviaBlitzEngine.applyAction(state, { type: "answer", answerIndex: 1 }, "p1");
    expect(second.ok).toBe(false);
  });

  it("waits for every player before advancing the round", () => {
    const state = initial();
    const result = triviaBlitzEngine.applyAction(state, { type: "answer", answerIndex: 0 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.round).toBe(1);
      expect(result.nextState.answers.p1).toBeDefined();
      expect(result.nextState.answers.p2).toBeUndefined();
    }
  });

  it("scores correctly and advances once everyone has answered", () => {
    let state = initial();
    const question = TRIVIA_QUESTIONS[state.questionOrder[0]];
    const wrongIndex = (question.correctIndex + 1) % 4;

    const p1Result = triviaBlitzEngine.applyAction(state, { type: "answer", answerIndex: question.correctIndex }, "p1");
    expect(p1Result.ok).toBe(true);
    if (!p1Result.ok) return;
    state = p1Result.nextState;

    const p2Result = triviaBlitzEngine.applyAction(state, { type: "answer", answerIndex: wrongIndex }, "p2");
    expect(p2Result.ok).toBe(true);
    if (p2Result.ok) {
      expect(p2Result.nextState.round).toBe(2);
      expect(p2Result.nextState.answers).toEqual({});
      expect(p2Result.nextState.totalScores.p1).toBe(10);
      expect(p2Result.nextState.totalScores.p2).toBe(0);
      expect(p2Result.nextState.roundHistory).toHaveLength(1);
    }
  });

  it("ends the match after the final round, with the higher score winning", () => {
    let state: TriviaBlitzState = { ...initial(), round: TRIVIA_TOTAL_ROUNDS, totalScores: { p1: 50, p2: 30 } };
    const question = TRIVIA_QUESTIONS[state.questionOrder[TRIVIA_TOTAL_ROUNDS - 1]];

    const p1Result = triviaBlitzEngine.applyAction(state, { type: "answer", answerIndex: question.correctIndex }, "p1");
    if (!p1Result.ok) throw new Error("setup failed");
    state = p1Result.nextState;

    const p2Result = triviaBlitzEngine.applyAction(state, { type: "answer", answerIndex: (question.correctIndex + 1) % 4 }, "p2");
    expect(p2Result.ok).toBe(true);
    if (p2Result.ok) {
      expect(p2Result.nextState.status).toBe("match-ended");
      expect(p2Result.nextState.winnerPlayerId).toBe("p1");
      expect(p2Result.nextState.totalScores.p1).toBe(60);
    }
  });

  it("rejects further answers once the match has ended", () => {
    const state: TriviaBlitzState = { ...initial(), status: "match-ended", winnerPlayerId: "p1" };
    const result = triviaBlitzEngine.applyAction(state, { type: "answer", answerIndex: 0 }, "p2");
    expect(result.ok).toBe(false);
  });
});

describe("pickTriviaAnswer", () => {
  it("always returns a valid option index", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      for (let i = 0; i < 20; i++) {
        const answer = pickTriviaAnswer(2, 4, difficulty);
        expect(answer).toBeGreaterThanOrEqual(0);
        expect(answer).toBeLessThan(4);
      }
    }
  });
});
