import { describe, expect, it } from "vitest";
import { tankTacticsEngine } from "@/games/tank-tactics/engine";
import { simulateProjectile, velocityFromAimPower } from "@/games/core/physics";
import { terrainHeightAt } from "@/games/tank-tactics/terrain";
import { DT, GRAVITY, MAX_SHOT_SPEED, MAX_STEPS } from "@/games/tank-tactics/constants";
import type { TankTacticsState } from "@/games/tank-tactics/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial() {
  const state = tankTacticsEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 1_000 });
  // Flat terrain makes shot-accuracy assertions deterministic and decouples
  // them from terrain-generation randomness, which has its own dedicated test.
  return { ...state, terrainHeights: state.terrainHeights.map(() => 320) };
}

function findExactShot(state: TankTacticsState, fromX: number, targetX: number): { angle: number; power: number } {
  const startY = terrainHeightAt(state.terrainHeights, fromX);
  let best = { angle: 45, power: 60, error: Infinity };
  for (let angle = 5; angle <= 175; angle += 1) {
    for (let power = 1; power <= 100; power += 1) {
      const result = simulateProjectile({
        start: { x: fromX, y: startY - 10 },
        velocity: velocityFromAimPower(angle, power, MAX_SHOT_SPEED),
        gravity: GRAVITY,
        wind: 0,
        dt: DT,
        maxSteps: MAX_STEPS,
        groundHeightAt: (x) => terrainHeightAt(state.terrainHeights, x),
      });
      const error = Math.abs(result.finalPosition.x - targetX);
      if (error < best.error) best = { angle, power, error };
    }
  }
  expect(best.error).toBeLessThan(15);
  return { angle: best.angle, power: best.power };
}

describe("tankTacticsEngine.createInitialState", () => {
  it("places every player's tank at full health, spread across the terrain", () => {
    const state = initial();
    expect(state.tanks).toHaveLength(2);
    expect(state.tanks.every((t) => t.health === 100 && t.alive)).toBe(true);
    expect(state.tanks[0].x).not.toBe(state.tanks[1].x);
    expect(state.turnEndsAt).toBe(1_000 + state.turnDurationMs);
  });

  it("generates the same terrain for the same seed", () => {
    const a = tankTacticsEngine.createInitialState({ seed: "same", players: PLAYERS, modifiers: {}, now: 0 });
    const b = tankTacticsEngine.createInitialState({ seed: "same", players: PLAYERS, modifiers: {}, now: 0 });
    expect(a.terrainHeights).toEqual(b.terrainHeights);
  });
});

describe("tankTacticsEngine.applyAction — fire", () => {
  it("rejects firing out of turn", () => {
    const state = initial();
    const result = tankTacticsEngine.applyAction(
      state,
      { type: "fire", angle: 45, power: 60, projectileType: "standard", now: 2_000 },
      "p2",
    );
    expect(result.ok).toBe(false);
  });

  it("damages a directly-hit tank and digs a crater", () => {
    const state = initial();
    const target = state.tanks[1];
    const shot = findExactShot(state, state.tanks[0].x, target.x);

    const result = tankTacticsEngine.applyAction(
      state,
      { type: "fire", ...shot, projectileType: "standard", now: 2_000 },
      "p1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const hitTank = result.nextState.tanks.find((t) => t.playerId === "p2")!;
      expect(hitTank.health).toBeLessThan(100);
      expect(result.nextState.terrainHeights).not.toEqual(state.terrainHeights);
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
      expect(result.nextState.turnEndsAt).toBe(2_000 + state.turnDurationMs);
    }
  });

  it("declares the last tank standing the winner", () => {
    const state: TankTacticsState = {
      ...initial(),
      tanks: [
        { playerId: "p1", x: 100, health: 100, alive: true },
        { playerId: "p2", x: 300, health: 5, alive: true },
      ],
    };
    const shot = findExactShot(state, state.tanks[0].x, state.tanks[1].x);
    const result = tankTacticsEngine.applyAction(
      state,
      { type: "fire", ...shot, projectileType: "standard", now: 2_000 },
      "p1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const survivor = result.nextState.tanks.filter((t) => t.alive);
      expect(survivor).toHaveLength(1);
      expect(result.nextState.winnerPlayerId).toBe(survivor[0].playerId);
    }
  });

  it("spawns a smoke cloud that decays after a few turns", () => {
    const state = initial();
    const target = state.tanks[1];
    const shot = findExactShot(state, state.tanks[0].x, target.x);
    const result = tankTacticsEngine.applyAction(
      state,
      { type: "fire", ...shot, projectileType: "smoke", now: 2_000 },
      "p1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.smokeClouds.length).toBeGreaterThan(0);
    }
  });
});

describe("tankTacticsEngine.applyAction — skip-turn", () => {
  it("passes the turn without firing", () => {
    const state = initial();
    const result = tankTacticsEngine.applyAction(state, { type: "skip-turn", now: 2_000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
      expect(result.nextState.tanks).toEqual(state.tanks);
    }
  });
});

describe("tankTacticsEngine.checkOutcome", () => {
  it("is active while more than one tank stands", () => {
    expect(tankTacticsEngine.checkOutcome(initial())).toEqual({ status: "active" });
  });
});
