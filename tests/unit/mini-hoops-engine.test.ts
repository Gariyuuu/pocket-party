import { describe, expect, it } from "vitest";
import { miniHoopsEngine } from "@/games/mini-hoops/engine";
import { simulateProjectile, velocityFromAimPower } from "@/games/core/physics";
import {
  DT,
  GRAVITY,
  GROUND_Y,
  HOOP_RADIUS,
  HOOP_Y,
  MAX_SHOT_SPEED,
  MAX_STEPS,
  SHOOTER_X,
  SHOOTER_Y,
  hoopXForShot,
} from "@/games/mini-hoops/constants";
import type { MiniHoopsState } from "@/games/mini-hoops/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial() {
  return miniHoopsEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

/** Deterministic grid search for a shot that passes through the hoop while descending. */
function findMakeShot(hoopX: number): { angle: number; power: number } {
  let best = { angle: 55, power: 65, error: Infinity };
  for (let angle = 20; angle <= 80; angle += 0.5) {
    for (let power = 20; power <= 100; power += 1) {
      let closest = Infinity;
      simulateProjectile({
        start: { x: SHOOTER_X, y: SHOOTER_Y },
        velocity: velocityFromAimPower(angle, power, MAX_SHOT_SPEED),
        gravity: GRAVITY,
        wind: 0,
        dt: DT,
        maxSteps: MAX_STEPS,
        groundHeightAt: () => GROUND_Y,
        onStep: (position, velocityNow) => {
          if (velocityNow.y > 0) {
            const dist = Math.hypot(position.x - hoopX, position.y - HOOP_Y);
            if (dist < closest) closest = dist;
          }
        },
      });
      if (closest < best.error) best = { angle, power, error: closest };
    }
  }
  expect(best.error).toBeLessThanOrEqual(HOOP_RADIUS);
  return { angle: best.angle, power: best.power };
}

describe("miniHoopsEngine.createInitialState", () => {
  it("starts at shot 0 with zero makes", () => {
    const state = initial();
    expect(state.shotIndex).toBe(0);
    expect(Object.values(state.makesByPlayer)).toEqual([0, 0]);
  });
});

describe("miniHoopsEngine.applyAction", () => {
  it("rejects a shot from the wrong player", () => {
    const result = miniHoopsEngine.applyAction(initial(), { type: "shoot", angle: 50, power: 60 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("counts a make and advances to the next player", () => {
    const state = initial();
    const shot = findMakeShot(hoopXForShot(0));
    const result = miniHoopsEngine.applyAction(state, { type: "shoot", ...shot }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.lastShot?.made).toBe(true);
      expect(result.nextState.makesByPlayer.p1).toBe(1);
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
    }
  });

  it("declares a winner after every shot is taken", () => {
    const state: MiniHoopsState = {
      ...initial(),
      shotIndex: 9, // last of 10 total shots (5 each)
      makesByPlayer: { p1: 3, p2: 2 },
      currentTurnPlayerId: "p2",
    };
    const result = miniHoopsEngine.applyAction(state, { type: "shoot", angle: 10, power: 1 }, "p2");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("declares a draw on equal makes after the final shot", () => {
    const state: MiniHoopsState = {
      ...initial(),
      shotIndex: 9,
      makesByPlayer: { p1: 2, p2: 2 },
      currentTurnPlayerId: "p2",
    };
    const result = miniHoopsEngine.applyAction(state, { type: "shoot", angle: 10, power: 1 }, "p2");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.isDraw).toBe(true);
      expect(result.nextState.winnerPlayerId).toBeNull();
    }
  });
});
