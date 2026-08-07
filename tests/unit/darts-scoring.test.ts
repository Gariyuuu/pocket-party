import { describe, expect, it } from "vitest";
import { throwDart } from "@/games/darts/scoring";
import { RINGS } from "@/games/darts/constants";

describe("throwDart", () => {
  it("scores zero for a throw too weak to reach the board", () => {
    const result = throwDart(45, 5);
    expect(result.score).toBe(0);
    expect(result.ringLabel).toBeNull();
  });

  it("scores the bullseye for a well-aimed strong throw", () => {
    // A grid search across reasonable angle/power should find at least one
    // combo landing in the bullseye — proves the target is actually reachable.
    let bestScore = -1;
    for (let angle = 10; angle <= 80; angle += 2) {
      for (let power = 40; power <= 100; power += 5) {
        const result = throwDart(angle, power);
        bestScore = Math.max(bestScore, result.score);
      }
    }
    expect(bestScore).toBe(RINGS[0].score);
  });

  it("always returns a non-empty path", () => {
    const result = throwDart(45, 70);
    expect(result.path.length).toBeGreaterThan(0);
  });
});
