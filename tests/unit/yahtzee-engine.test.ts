import { describe, expect, it } from "vitest";
import { yahtzeeEngine } from "@/games/yahtzee/engine";
import { YAHTZEE_CATEGORIES } from "@/games/yahtzee/types";
import type { YahtzeeState } from "@/games/yahtzee/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): YahtzeeState {
  return yahtzeeEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

describe("yahtzeeEngine.createInitialState", () => {
  it("starts with no rolls used and an empty scorecard for each player", () => {
    const state = initial();
    expect(state.rollsUsedThisTurn).toBe(0);
    expect(state.currentTurnPlayerId).toBe("p1");
    expect(state.scores.p1).toEqual({});
    expect(state.scores.p2).toEqual({});
  });
});

describe("yahtzeeEngine.applyAction — rolling", () => {
  it("rejects an action from the wrong player", () => {
    const result = yahtzeeEngine.applyAction(initial(), { type: "roll" }, "p2");
    expect(result.ok).toBe(false);
  });

  it("rolls all 5 dice into the 1-6 range and increments rollsUsedThisTurn", () => {
    const result = yahtzeeEngine.applyAction(initial(), { type: "roll" }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.dice).toHaveLength(5);
      expect(result.nextState.dice.every((d) => d >= 1 && d <= 6)).toBe(true);
      expect(result.nextState.rollsUsedThisTurn).toBe(1);
    }
  });

  it("rejects a 4th roll in the same turn", () => {
    let state = initial();
    for (let i = 0; i < 3; i++) {
      const result = yahtzeeEngine.applyAction(state, { type: "roll" }, "p1");
      expect(result.ok).toBe(true);
      if (result.ok) state = result.nextState;
    }
    const result = yahtzeeEngine.applyAction(state, { type: "roll" }, "p1");
    expect(result.ok).toBe(false);
  });

  it("held dice keep their value across a reroll", () => {
    let state = initial();
    const first = yahtzeeEngine.applyAction(state, { type: "roll" }, "p1");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = first.nextState;

    const held = yahtzeeEngine.applyAction(state, { type: "toggle-hold", die: 0 }, "p1");
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    state = held.nextState;
    const heldValue = state.dice[0];

    const second = yahtzeeEngine.applyAction(state, { type: "roll" }, "p1");
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.nextState.dice[0]).toBe(heldValue);
  });
});

describe("yahtzeeEngine.applyAction — holding and scoring", () => {
  it("rejects holding a die before the first roll", () => {
    const result = yahtzeeEngine.applyAction(initial(), { type: "toggle-hold", die: 0 }, "p1");
    expect(result.ok).toBe(false);
  });

  it("rejects scoring before the first roll", () => {
    const result = yahtzeeEngine.applyAction(initial(), { type: "score", category: "chance" }, "p1");
    expect(result.ok).toBe(false);
  });

  it("scores the category, resets the turn state, and passes to the next player", () => {
    let state = initial();
    const rolled = yahtzeeEngine.applyAction(state, { type: "roll" }, "p1");
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    state = rolled.nextState;

    const expectedScore = state.dice.reduce((a, b) => a + b, 0);
    const result = yahtzeeEngine.applyAction(state, { type: "score", category: "chance" }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.scores.p1.chance).toBe(expectedScore);
      expect(result.nextState.rollsUsedThisTurn).toBe(0);
      expect(result.nextState.heldDice.every((h) => h === false)).toBe(true);
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
    }
  });

  it("rejects reusing an already-scored category", () => {
    let state = initial();
    const rolled = yahtzeeEngine.applyAction(state, { type: "roll" }, "p1");
    if (!rolled.ok) throw new Error("setup failed");
    state = rolled.nextState;
    const scored = yahtzeeEngine.applyAction(state, { type: "score", category: "chance" }, "p1");
    if (!scored.ok) throw new Error("setup failed");
    // Force it back to p1's turn to attempt reusing "chance".
    state = { ...scored.nextState, currentTurnPlayerId: "p1" };
    const rolledAgain = yahtzeeEngine.applyAction(state, { type: "roll" }, "p1");
    if (!rolledAgain.ok) throw new Error("setup failed");
    const result = yahtzeeEngine.applyAction(rolledAgain.nextState, { type: "score", category: "chance" }, "p1");
    expect(result.ok).toBe(false);
  });

  it("ends the match once every player has filled all 13 categories", () => {
    let state: YahtzeeState = {
      ...initial(),
      scores: {
        p1: Object.fromEntries(YAHTZEE_CATEGORIES.slice(1).map((c) => [c, 0])) as YahtzeeState["scores"]["p1"],
        p2: Object.fromEntries(YAHTZEE_CATEGORIES.map((c) => [c, 0])) as YahtzeeState["scores"]["p2"],
      },
      currentTurnPlayerId: "p1",
    };
    const rolled = yahtzeeEngine.applyAction(state, { type: "roll" }, "p1");
    if (!rolled.ok) throw new Error("setup failed");
    state = rolled.nextState;

    const result = yahtzeeEngine.applyAction(state, { type: "score", category: YAHTZEE_CATEGORIES[0] }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.status).toBe("match-ended");
      expect(Object.keys(result.nextState.scores.p1)).toHaveLength(YAHTZEE_CATEGORIES.length);
    }
  });

  it("rejects further actions once the match has ended", () => {
    const state: YahtzeeState = { ...initial(), status: "match-ended", winnerPlayerId: "p1" };
    const result = yahtzeeEngine.applyAction(state, { type: "roll" }, "p2");
    expect(result.ok).toBe(false);
  });
});
