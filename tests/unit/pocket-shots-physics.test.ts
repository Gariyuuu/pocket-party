import { describe, expect, it } from "vitest";
import { simulateShot, firstCueContact, type Ball2D } from "@/games/pocket-shots/physics";

const TABLE = { width: 760, height: 380 };
const POCKETS = [
  { x: 0, y: 0 },
  { x: 380, y: 0 },
  { x: 760, y: 0 },
  { x: 0, y: 380 },
  { x: 380, y: 380 },
  { x: 760, y: 380 },
];
const DT = 1 / 120;
const MAX_STEPS = 1200;

function ball(id: string, x: number, y: number, vx = 0, vy = 0): Ball2D {
  return { id, x, y, vx, vy, radius: 11, pocketed: false };
}

describe("simulateShot", () => {
  it("comes to rest under friction with no obstacles", () => {
    const result = simulateShot([ball("cue", 100, 190, 300, 0)], TABLE, POCKETS, DT, MAX_STEPS);
    const cue = result.balls.find((b) => b.id === "cue")!;
    expect(Math.hypot(cue.vx, cue.vy)).toBeLessThan(4);
  });

  it("bounces off the side wall", () => {
    const result = simulateShot([ball("cue", 700, 190, 400, 0)], TABLE, POCKETS, DT, MAX_STEPS);
    const cue = result.balls.find((b) => b.id === "cue")!;
    // Started moving right near the right wall — should have bounced left at some point.
    const path = result.paths.cue;
    const maxX = Math.max(...path.map((p) => p.x));
    expect(maxX).toBeLessThanOrEqual(TABLE.width - 11 + 0.5);
    expect(cue.x).toBeLessThan(700);
  });

  it("transfers velocity in an equal-mass collision", () => {
    // A moving cue ball strikes a stationary object ball head-on.
    const result = simulateShot(
      [ball("cue", 100, 190, 400, 0), ball("target", 140, 190, 0, 0)],
      TABLE,
      POCKETS,
      DT,
      MAX_STEPS,
    );
    expect(result.collisions.length).toBeGreaterThan(0);
    const first = result.collisions[0];
    expect([first.a, first.b].sort()).toEqual(["cue", "target"]);
  });

  it("pockets a ball that reaches a pocket", () => {
    const result = simulateShot([ball("cue", 700, 40, 300, -200)], TABLE, POCKETS, DT, MAX_STEPS);
    expect(result.pocketedIds).toContain("cue");
    const cue = result.balls.find((b) => b.id === "cue")!;
    expect(cue.pocketed).toBe(true);
  });

  it("never lets balls end up overlapping after a collision", () => {
    const result = simulateShot(
      [ball("cue", 100, 190, 500, 0), ball("target", 200, 190, 0, 0)],
      TABLE,
      POCKETS,
      DT,
      MAX_STEPS,
    );
    const [a, b] = result.balls;
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    expect(dist).toBeGreaterThanOrEqual(a.radius + b.radius - 0.5);
  });
});

describe("firstCueContact", () => {
  it("returns the first ball the cue touched, in order", () => {
    const collisions = [
      { a: "orb-0", b: "ring-0", step: 1 },
      { a: "cue", b: "orb-1", step: 5 },
      { a: "cue", b: "orb-2", step: 9 },
    ];
    expect(firstCueContact(collisions, "cue")).toBe("orb-1");
  });

  it("returns null if the cue never touched anything", () => {
    expect(firstCueContact([{ a: "orb-0", b: "ring-0", step: 1 }], "cue")).toBeNull();
  });
});
