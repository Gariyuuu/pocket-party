import { describe, expect, it } from "vitest";
import { createSeededRng, shuffle, pickInt } from "@/games/core/rng";

describe("createSeededRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createSeededRng("match-123");
    const b = createSeededRng("match-123");
    const sequenceA = Array.from({ length: 10 }, () => a());
    const sequenceB = Array.from({ length: 10 }, () => b());
    expect(sequenceA).toEqual(sequenceB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createSeededRng("match-123");
    const b = createSeededRng("match-456");
    expect(a()).not.toEqual(b());
  });

  it("stays within [0, 1)", () => {
    const rng = createSeededRng("bounds-check");
    for (let i = 0; i < 100; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  it("is deterministic for the same seed and produces a permutation", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const shuffledA = shuffle(createSeededRng("shuffle-seed"), items);
    const shuffledB = shuffle(createSeededRng("shuffle-seed"), items);
    expect(shuffledA).toEqual(shuffledB);
    expect([...shuffledA].sort()).toEqual([...items].sort());
  });
});

describe("pickInt", () => {
  it("stays within the inclusive bounds", () => {
    const rng = createSeededRng("pick-int-seed");
    for (let i = 0; i < 200; i++) {
      const value = pickInt(rng, 3, 9);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(9);
    }
  });
});
