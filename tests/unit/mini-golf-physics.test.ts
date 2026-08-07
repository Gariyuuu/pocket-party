import { describe, expect, it } from "vitest";
import { simulatePutt } from "@/games/mini-golf/physics";

const BOUNDS = { width: 700, height: 380 };
const BASE = {
  obstacles: [] as { x: number; y: number; width: number; height: number }[],
  hole: { x: 640, y: 190 },
  holeRadius: 13,
  ballRadius: 8,
  bounds: BOUNDS,
  frictionPerSecond: 0.5,
  wallRestitution: 0.7,
  minSpeed: 3,
  dt: 1 / 120,
  maxSteps: 1500,
};

describe("simulatePutt", () => {
  it("comes to rest under friction with no obstacles", () => {
    const result = simulatePutt({ ...BASE, start: { x: 60, y: 190 }, velocity: { x: 80, y: 0 }, hole: { x: -1000, y: -1000 } });
    expect(result.holedOut).toBe(false);
    expect(result.finalPosition.x).toBeGreaterThan(60);
  });

  it("bounces off the course boundary", () => {
    const result = simulatePutt({ ...BASE, start: { x: 690, y: 190 }, velocity: { x: 400, y: 0 }, hole: { x: -1000, y: -1000 } });
    const maxX = Math.max(...result.path.map((p) => p.x));
    expect(maxX).toBeLessThanOrEqual(BOUNDS.width - 8 + 0.5);
  });

  it("bounces off a rectangular obstacle instead of passing through it", () => {
    const result = simulatePutt({
      ...BASE,
      start: { x: 60, y: 190 },
      velocity: { x: 400, y: 0 },
      obstacles: [{ x: 200, y: 100, width: 20, height: 180 }],
      hole: { x: -1000, y: -1000 },
    });
    // The obstacle's left face sits at x=200; a radius-8 ball should never
    // rest with its center past x=192 (allowing a little overlap-correction slack).
    const maxX = Math.max(...result.path.map((p) => p.x));
    expect(maxX).toBeLessThanOrEqual(192 + 1);
    expect(result.finalPosition.x).toBeLessThanOrEqual(192 + 1);
  });

  it("holes out when the ball reaches the hole", () => {
    const result = simulatePutt({ ...BASE, start: { x: 60, y: 190 }, velocity: { x: 500, y: 0 } });
    expect(result.holedOut).toBe(true);
    expect(result.finalPosition).toEqual(BASE.hole);
  });

  it("does not hole out if the ball never reaches the hole's radius", () => {
    const result = simulatePutt({ ...BASE, start: { x: 60, y: 190 }, velocity: { x: 20, y: 0 } });
    expect(result.holedOut).toBe(false);
  });
});
