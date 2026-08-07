import { describe, expect, it } from "vitest";
import { centerPuck, clampPaddleToHalf, stepOrbHockey, type PuckState } from "@/games/orb-hockey/physics";
import { PADDLE_RADIUS, TABLE_HEIGHT, TABLE_WIDTH } from "@/games/orb-hockey/constants";

const NO_PADDLES = {
  bottom: { position: { x: -1000, y: -1000 }, velocity: { x: 0, y: 0 } },
  top: { position: { x: -1000, y: -1000 }, velocity: { x: 0, y: 0 } },
};

describe("stepOrbHockey", () => {
  it("bounces the puck off the side wall", () => {
    const puck: PuckState = { x: TABLE_WIDTH - 5, y: TABLE_HEIGHT / 2, vx: 200, vy: 0 };
    const result = stepOrbHockey(puck, 1 / 60, NO_PADDLES.bottom, NO_PADDLES.top);
    expect(result.puck.vx).toBeLessThanOrEqual(0);
    expect(result.puck.x).toBeLessThanOrEqual(TABLE_WIDTH);
  });

  it("bounces off the goal line outside the goal mouth", () => {
    const puck: PuckState = { x: 10, y: 3, vx: 0, vy: -100 };
    const result = stepOrbHockey(puck, 1 / 60, NO_PADDLES.bottom, NO_PADDLES.top);
    expect(result.goalScoredAgainst).toBeNull();
    expect(result.puck.vy).toBeGreaterThanOrEqual(0);
  });

  it("scores a goal when the puck fully crosses inside the goal mouth", () => {
    const puck: PuckState = { x: TABLE_WIDTH / 2, y: -20, vx: 0, vy: -400 };
    const result = stepOrbHockey(puck, 1 / 10, NO_PADDLES.bottom, NO_PADDLES.top);
    expect(result.goalScoredAgainst).toBe("top");
  });

  it("deflects the puck off a paddle and adds the paddle's velocity", () => {
    const puck: PuckState = { x: 250, y: 350, vx: 0, vy: 100 };
    const bottomPaddle = { position: { x: 250, y: 355 }, velocity: { x: 300, y: 0 } };
    const result = stepOrbHockey(puck, 1 / 60, bottomPaddle, NO_PADDLES.top);
    expect(result.puck.vx).toBeGreaterThan(0);
  });

  it("is fully deterministic for identical inputs", () => {
    const puck: PuckState = { x: 200, y: 400, vx: 120, vy: -80 };
    const a = stepOrbHockey(puck, 1 / 60, NO_PADDLES.bottom, NO_PADDLES.top);
    const b = stepOrbHockey(puck, 1 / 60, NO_PADDLES.bottom, NO_PADDLES.top);
    expect(a).toEqual(b);
  });
});

describe("clampPaddleToHalf", () => {
  it("keeps the bottom player's paddle out of the top half", () => {
    const clamped = clampPaddleToHalf({ x: 250, y: 10 }, "bottom");
    expect(clamped.y).toBeGreaterThanOrEqual(TABLE_HEIGHT / 2 + PADDLE_RADIUS);
  });

  it("keeps the top player's paddle out of the bottom half", () => {
    const clamped = clampPaddleToHalf({ x: 250, y: TABLE_HEIGHT - 10 }, "top");
    expect(clamped.y).toBeLessThanOrEqual(TABLE_HEIGHT / 2 - PADDLE_RADIUS);
  });

  it("keeps the paddle within the table's horizontal bounds", () => {
    const clamped = clampPaddleToHalf({ x: -50, y: TABLE_HEIGHT - 10 }, "bottom");
    expect(clamped.x).toBeGreaterThanOrEqual(PADDLE_RADIUS);
  });
});

describe("centerPuck", () => {
  it("starts at rest in the middle of the table", () => {
    const puck = centerPuck();
    expect(puck).toEqual({ x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 2, vx: 0, vy: 0 });
  });
});
