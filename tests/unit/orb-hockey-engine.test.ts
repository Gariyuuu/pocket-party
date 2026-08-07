import { describe, expect, it } from "vitest";
import { orbHockeyEngine } from "@/games/orb-hockey/engine";
import { COUNTDOWN_MS, WIN_SCORE } from "@/games/orb-hockey/constants";
import type { OrbHockeyState } from "@/games/orb-hockey/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial() {
  return orbHockeyEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 1_000 });
}

describe("orbHockeyEngine.createInitialState", () => {
  it("starts scoreless in a countdown", () => {
    const state = initial();
    expect(state.scoreByPlayer).toEqual({ p1: 0, p2: 0 });
    expect(state.status).toBe("countdown");
    expect(state.countdownEndsAt).toBe(1_000 + COUNTDOWN_MS);
  });
});

describe("orbHockeyEngine.applyAction — start-serve", () => {
  it("moves from countdown to live", () => {
    const result = orbHockeyEngine.applyAction(initial(), { type: "start-serve", now: 2_000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.nextState.status).toBe("live");
  });

  it("rejects starting a serve when already live", () => {
    const state: OrbHockeyState = { ...initial(), status: "live" };
    const result = orbHockeyEngine.applyAction(state, { type: "start-serve", now: 2_000 }, "p1");
    expect(result.ok).toBe(false);
  });
});

describe("orbHockeyEngine.applyAction — score-goal", () => {
  it("increments the scoring player's score and returns to countdown", () => {
    const state: OrbHockeyState = { ...initial(), status: "live" };
    const result = orbHockeyEngine.applyAction(
      state,
      { type: "score-goal", scoringPlayerId: "p1", now: 5_000 },
      "p1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.scoreByPlayer.p1).toBe(1);
      expect(result.nextState.status).toBe("countdown");
      expect(result.nextState.countdownEndsAt).toBe(5_000 + COUNTDOWN_MS);
    }
  });

  it("rejects a goal for an unknown player", () => {
    const state: OrbHockeyState = { ...initial(), status: "live" };
    const result = orbHockeyEngine.applyAction(
      state,
      { type: "score-goal", scoringPlayerId: "not-a-player", now: 5_000 },
      "p1",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a goal when the match isn't live", () => {
    const result = orbHockeyEngine.applyAction(
      initial(),
      { type: "score-goal", scoringPlayerId: "p1", now: 5_000 },
      "p1",
    );
    expect(result.ok).toBe(false);
  });

  it("declares a winner at the win score", () => {
    const state: OrbHockeyState = {
      ...initial(),
      status: "live",
      scoreByPlayer: { p1: WIN_SCORE - 1, p2: 3 },
    };
    const result = orbHockeyEngine.applyAction(
      state,
      { type: "score-goal", scoringPlayerId: "p1", now: 5_000 },
      "p1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.scoreByPlayer.p1).toBe(WIN_SCORE);
      expect(result.nextState.status).toBe("completed");
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("rejects further goals once the match has ended", () => {
    const state: OrbHockeyState = { ...initial(), status: "completed", winnerPlayerId: "p1" };
    const result = orbHockeyEngine.applyAction(
      state,
      { type: "score-goal", scoringPlayerId: "p2", now: 5_000 },
      "p2",
    );
    expect(result.ok).toBe(false);
  });
});

describe("orbHockeyEngine.checkOutcome", () => {
  it("is active with no winner yet", () => {
    expect(orbHockeyEngine.checkOutcome(initial())).toEqual({ status: "active" });
  });
});
