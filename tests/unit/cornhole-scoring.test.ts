import { describe, expect, it } from "vitest";
import { tossBag } from "@/games/cornhole/scoring";

describe("tossBag", () => {
  it("scores zero for a toss too weak to reach the board", () => {
    const result = tossBag(45, 5);
    expect(result.score).toBe(0);
    expect(result.label).toBeNull();
  });

  it("finds at least one angle/power combo that lands in the hole", () => {
    let best = -1;
    for (let angle = 10; angle <= 80; angle += 2) {
      for (let power = 40; power <= 100; power += 5) {
        const result = tossBag(angle, power);
        best = Math.max(best, result.score);
      }
    }
    expect(best).toBe(3);
  });

  it("always returns a non-empty path", () => {
    const result = tossBag(45, 70);
    expect(result.path.length).toBeGreaterThan(0);
  });
});
