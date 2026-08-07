import { describe, expect, it } from "vitest";
import { extractPlayerScore } from "@/lib/multiplayer/extract-score";

describe("extractPlayerScore", () => {
  it("reads totalScores for word-clash and quick-draw", () => {
    const state = { totalScores: { p1: 42 } };
    expect(extractPlayerScore("word-clash", state, "p1")).toBe(42);
    expect(extractPlayerScore("quick-draw", state, "p1")).toBe(42);
  });

  it("reads the per-player board score for tile-rush", () => {
    const state = { boardsByPlayer: { p1: { score: 17 } } };
    expect(extractPlayerScore("tile-rush", state, "p1")).toBe(17);
  });

  it("reads makesByPlayer for mini-hoops", () => {
    const state = { makesByPlayer: { p1: 3 } };
    expect(extractPlayerScore("mini-hoops", state, "p1")).toBe(3);
  });

  it("reads scoreByPlayer for orb-hockey", () => {
    const state = { scoreByPlayer: { p1: 7 } };
    expect(extractPlayerScore("orb-hockey", state, "p1")).toBe(7);
  });

  it("defaults to 0 for games with no running score, or a missing player", () => {
    expect(extractPlayerScore("grid-three", {}, "p1")).toBe(0);
    expect(extractPlayerScore("word-clash", { totalScores: {} }, "p1")).toBe(0);
    expect(extractPlayerScore("word-clash", null, "p1")).toBe(0);
  });
});
