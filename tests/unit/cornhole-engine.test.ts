import { describe, expect, it } from "vitest";
import { cornholeEngine } from "@/games/cornhole/engine";
import { BAGS_PER_TURN } from "@/games/cornhole/constants";
import type { CornholeState } from "@/games/cornhole/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): CornholeState {
  return cornholeEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

describe("cornholeEngine", () => {
  it("rejects a toss from the wrong player", () => {
    const result = cornholeEngine.applyAction(initial(), { type: "toss", angle: 45, power: 70 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("passes the turn once a player has thrown all their bags", () => {
    let state = initial();
    for (let i = 0; i < BAGS_PER_TURN; i++) {
      const result = cornholeEngine.applyAction(state, { type: "toss", angle: 45, power: 20 }, "p1");
      expect(result.ok).toBe(true);
      if (result.ok) state = result.nextState;
    }
    expect(state.currentTurnPlayerId).toBe("p2");
    expect(state.bagsThrownThisTurn).toBe(0);
  });

  it("ends the match after every player has completed all their rounds", () => {
    let state = initial();
    const totalTurns = state.players.length * state.totalRounds;
    for (let turn = 0; turn < totalTurns; turn++) {
      for (let bag = 0; bag < BAGS_PER_TURN; bag++) {
        const result = cornholeEngine.applyAction(state, { type: "toss", angle: 45, power: 20 }, state.currentTurnPlayerId);
        expect(result.ok).toBe(true);
        if (result.ok) state = result.nextState;
      }
    }
    expect(state.status).toBe("match-ended");
  });

  it("rejects further tosses once the match has ended", () => {
    const state: CornholeState = { ...initial(), status: "match-ended", winnerPlayerId: "p1" };
    const result = cornholeEngine.applyAction(state, { type: "toss", angle: 45, power: 70 }, "p1");
    expect(result.ok).toBe(false);
  });
});
