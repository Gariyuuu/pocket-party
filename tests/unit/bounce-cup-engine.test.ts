import { describe, expect, it } from "vitest";
import { bounceCupEngine } from "@/games/bounce-cup/engine";
import { simulateProjectile, velocityFromAimPower } from "@/games/core/physics";
import {
  CAPTURE_RADIUS,
  GRAVITY,
  MAX_BOUNCES,
  MAX_SHOT_SPEED,
  RESTITUTION,
  SHOOTER_X,
  SHOOTER_Y,
  TABLE_GROUND_Y,
} from "@/games/bounce-cup/constants";
import type { BounceCupState } from "@/games/bounce-cup/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial() {
  return bounceCupEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

/** Deterministic grid search (no bot randomness) for a shot landing within capture radius of targetX. */
function findExactShot(targetX: number): { angle: number; power: number } {
  let best = { angle: 45, power: 60, error: Infinity };
  for (let angle = 5; angle <= 85; angle += 0.5) {
    for (let power = 1; power <= 100; power += 1) {
      const result = simulateProjectile({
        start: { x: SHOOTER_X, y: SHOOTER_Y },
        velocity: velocityFromAimPower(angle, power, MAX_SHOT_SPEED),
        gravity: GRAVITY,
        wind: 0,
        dt: 1 / 60,
        maxSteps: 600,
        groundHeightAt: () => TABLE_GROUND_Y,
        restitution: RESTITUTION,
        maxBounces: MAX_BOUNCES,
      });
      const error = Math.abs(result.finalPosition.x - targetX);
      if (error < best.error) best = { angle, power, error };
    }
  }
  expect(best.error).toBeLessThanOrEqual(CAPTURE_RADIUS);
  return { angle: best.angle, power: best.power };
}

describe("bounceCupEngine.createInitialState", () => {
  it("sets up six cups and the first-seat player to shoot", () => {
    const state = initial();
    expect(state.cups).toHaveLength(6);
    expect(state.cups.every((c) => !c.cleared)).toBe(true);
    expect(state.currentTurnPlayerId).toBe("p1");
  });
});

describe("bounceCupEngine.applyAction", () => {
  it("rejects a shot from the wrong player", () => {
    const result = bounceCupEngine.applyAction(initial(), { type: "shoot", angle: 45, power: 60 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("rejects an out-of-range angle or power", () => {
    const state = initial();
    expect(bounceCupEngine.applyAction(state, { type: "shoot", angle: 0, power: 50 }, "p1").ok).toBe(false);
    expect(bounceCupEngine.applyAction(state, { type: "shoot", angle: 45, power: 150 }, "p1").ok).toBe(false);
  });

  it("always alternates turns, hit or miss", () => {
    const state = initial();
    const result = bounceCupEngine.applyAction(state, { type: "shoot", angle: 20, power: 5 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.nextState.currentTurnPlayerId).toBe("p2");
  });

  it("clears a cup on a well-aimed shot and wins when the last cup is cleared", () => {
    let state = initial();
    // Pre-clear every cup but one so the next accurate shot wins the match.
    const target = state.cups[state.cups.length - 1];
    state = {
      ...state,
      cups: state.cups.map((c) => (c.id === target.id ? c : { ...c, cleared: true })),
    };

    const shot = findExactShot(target.x);
    const result = bounceCupEngine.applyAction(state, { type: "shoot", ...shot }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.cups.find((c) => c.id === target.id)?.cleared).toBe(true);
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("rejects further shots once the match has ended", () => {
    const state: BounceCupState = { ...initial(), winnerPlayerId: "p1" };
    const result = bounceCupEngine.applyAction(state, { type: "shoot", angle: 45, power: 50 }, "p2");
    expect(result.ok).toBe(false);
  });
});
