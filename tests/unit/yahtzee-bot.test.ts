import { describe, expect, it } from "vitest";
import { yahtzeeEngine } from "@/games/yahtzee/engine";
import { pickYahtzeeMove } from "@/games/yahtzee/bot";
import type { YahtzeeState } from "@/games/yahtzee/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): YahtzeeState {
  return yahtzeeEngine.createInitialState({ seed: "bot-seed", players: PLAYERS, modifiers: {}, now: 0 });
}

describe("pickYahtzeeMove", () => {
  it("always rolls first when it hasn't rolled yet this turn", () => {
    const state = initial();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      expect(pickYahtzeeMove(state, "p1", difficulty)).toEqual({ type: "roll" });
    }
  });

  it("completes a full turn (roll → hold/reroll decisions → score) within a bounded number of steps, then passes the turn", () => {
    let state = initial();
    let steps = 0;
    const maxSteps = 20; // 3 rolls + up to 5 hold-toggles per roll + 1 score is generously covered by this
    while (state.currentTurnPlayerId === "p1" && steps < maxSteps) {
      const action = pickYahtzeeMove(state, "p1", "hard");
      const result = yahtzeeEngine.applyAction(state, action, "p1");
      expect(result.ok).toBe(true);
      if (result.ok) state = result.nextState;
      steps++;
    }
    expect(state.currentTurnPlayerId).toBe("p2");
    expect(steps).toBeLessThan(maxSteps);
    expect(Object.keys(state.scores.p1)).toHaveLength(1);
  });
});
