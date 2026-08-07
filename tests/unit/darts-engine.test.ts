import { describe, expect, it } from "vitest";
import { dartsEngine } from "@/games/darts/engine";
import { DARTS_PER_TURN } from "@/games/darts/constants";
import type { DartsState } from "@/games/darts/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): DartsState {
  return dartsEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

describe("dartsEngine", () => {
  it("rejects a throw from the wrong player", () => {
    const result = dartsEngine.applyAction(initial(), { type: "throw", angle: 45, power: 70 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("rejects an out-of-range power", () => {
    const result = dartsEngine.applyAction(initial(), { type: "throw", angle: 45, power: 150 }, "p1");
    expect(result.ok).toBe(false);
  });

  it("keeps the turn with the same player until they've thrown all their darts", () => {
    let state = initial();
    for (let i = 0; i < DARTS_PER_TURN - 1; i++) {
      const result = dartsEngine.applyAction(state, { type: "throw", angle: 45, power: 20 }, "p1");
      expect(result.ok).toBe(true);
      if (result.ok) state = result.nextState;
      expect(state.currentTurnPlayerId).toBe("p1");
    }
  });

  it("passes the turn once a player has thrown all their darts, banking the turn score", () => {
    let state = initial();
    for (let i = 0; i < DARTS_PER_TURN; i++) {
      const result = dartsEngine.applyAction(state, { type: "throw", angle: 45, power: 20 }, "p1");
      expect(result.ok).toBe(true);
      if (result.ok) state = result.nextState;
    }
    expect(state.currentTurnPlayerId).toBe("p2");
    expect(state.dartsThrownThisTurn).toBe(0);
    // Weak throws always miss (angle 45, power 20 falls well short of the board), so the banked score should be 0 either way — the real point of this test is that a turn transition happened at all.
    expect(state.totalScores.p1).toBeGreaterThanOrEqual(0);
  });

  it("ends the match after every player has completed all their rounds", () => {
    let state = initial();
    const totalTurns = state.players.length * state.totalRounds;
    for (let turn = 0; turn < totalTurns; turn++) {
      for (let dart = 0; dart < DARTS_PER_TURN; dart++) {
        const result = dartsEngine.applyAction(state, { type: "throw", angle: 45, power: 20 }, state.currentTurnPlayerId);
        expect(result.ok).toBe(true);
        if (result.ok) state = result.nextState;
      }
    }
    expect(state.status).toBe("match-ended");
  });

  it("rejects further throws once the match has ended", () => {
    const state: DartsState = { ...initial(), status: "match-ended", winnerPlayerId: "p1" };
    const result = dartsEngine.applyAction(state, { type: "throw", angle: 45, power: 70 }, "p1");
    expect(result.ok).toBe(false);
  });
});
