import { describe, expect, it } from "vitest";
import { simulateProjectile, velocityFromAimPower, windForShot, distance } from "@/games/core/physics";
import { createSeededRng } from "@/games/core/rng";

describe("velocityFromAimPower", () => {
  it("points right and up for a 45-degree shot", () => {
    const v = velocityFromAimPower(45, 100, 100);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeLessThan(0); // canvas y decreases going up
  });

  it("scales with power", () => {
    const soft = velocityFromAimPower(45, 20, 100);
    const hard = velocityFromAimPower(45, 90, 100);
    expect(Math.hypot(hard.x, hard.y)).toBeGreaterThan(Math.hypot(soft.x, soft.y));
  });
});

describe("simulateProjectile", () => {
  it("is fully deterministic for identical inputs", () => {
    const params = {
      start: { x: 0, y: 0 },
      velocity: { x: 200, y: -300 },
      gravity: 900,
      wind: 10,
      dt: 1 / 60,
      maxSteps: 200,
      groundHeightAt: () => 300,
    };
    const a = simulateProjectile(params);
    const b = simulateProjectile(params);
    expect(a.path).toEqual(b.path);
    expect(a.finalPosition).toEqual(b.finalPosition);
  });

  it("falls under gravity and stops at the ground", () => {
    const result = simulateProjectile({
      start: { x: 0, y: 0 },
      velocity: { x: 50, y: -200 },
      gravity: 900,
      wind: 0,
      dt: 1 / 60,
      maxSteps: 300,
      groundHeightAt: () => 100,
    });
    expect(result.finalPosition.y).toBeCloseTo(100, 0);
  });

  it("bounces and loses energy according to restitution", () => {
    const result = simulateProjectile({
      start: { x: 0, y: 0 },
      velocity: { x: 100, y: -150 },
      gravity: 900,
      wind: 0,
      dt: 1 / 60,
      maxSteps: 400,
      groundHeightAt: () => 100,
      restitution: 0.5,
      maxBounces: 1,
    });
    expect(result.bounces).toBe(1);
  });

  it("stops early when onStep signals a hit", () => {
    let stepsSeen = 0;
    const result = simulateProjectile({
      start: { x: 0, y: 0 },
      velocity: { x: 100, y: -100 },
      gravity: 900,
      wind: 0,
      dt: 1 / 60,
      maxSteps: 500,
      onStep: () => {
        stepsSeen += 1;
        if (stepsSeen === 5) return "stop";
      },
    });
    expect(result.stoppedEarly).toBe(true);
    expect(stepsSeen).toBe(5);
  });
});

describe("windForShot", () => {
  it("is deterministic for a given seed and stays within maxWind", () => {
    const a = windForShot(createSeededRng("wind-seed"), 40);
    const b = windForShot(createSeededRng("wind-seed"), 40);
    expect(a).toBe(b);
    expect(Math.abs(a)).toBeLessThanOrEqual(40);
  });
});

describe("distance", () => {
  it("computes Euclidean distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
