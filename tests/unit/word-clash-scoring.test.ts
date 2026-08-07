import { describe, expect, it } from "vitest";
import { wordScore, scoreRound } from "@/games/word-clash/scoring";
import { isFormableFromPool, drawLetterPool } from "@/games/word-clash/letter-pool";
import { createSeededRng } from "@/games/core/rng";

describe("wordScore", () => {
  it("rewards longer words with more points", () => {
    expect(wordScore(3)).toBeLessThan(wordScore(5));
    expect(wordScore(5)).toBeLessThan(wordScore(8));
  });

  it("scores nothing below 3 letters", () => {
    expect(wordScore(2)).toBe(0);
  });
});

describe("scoreRound", () => {
  it("scores unique words normally", () => {
    const result = scoreRound({ submissionsByPlayer: { p1: ["CAT"], p2: ["DOGS"] } });
    expect(result.scores.p1).toBe(wordScore(3));
    expect(result.scores.p2).toBe(wordScore(4));
  });

  it("cancels a word found by more than one player", () => {
    const result = scoreRound({ submissionsByPlayer: { p1: ["CAT", "MOUSE"], p2: ["CAT"] } });
    expect(result.scoringWords.p1).toEqual(["MOUSE"]);
    expect(result.scoringWords.p2).toEqual([]);
    expect(result.scores.p2).toBe(0);
  });

  it("is case-insensitive when detecting duplicates", () => {
    const result = scoreRound({ submissionsByPlayer: { p1: ["cat"], p2: ["CAT"] } });
    expect(result.scores.p1).toBe(0);
    expect(result.scores.p2).toBe(0);
  });
});

describe("isFormableFromPool", () => {
  it("accepts a word within the pool's letter multiset", () => {
    expect(isFormableFromPool("CAT", ["C", "A", "T", "X", "Y"])).toBe(true);
  });

  it("rejects a word needing more of a letter than the pool has", () => {
    expect(isFormableFromPool("TOOT", ["T", "O", "X", "Y"])).toBe(false);
  });
});

describe("drawLetterPool", () => {
  it("is deterministic for a given seed", () => {
    const poolA = drawLetterPool(createSeededRng("round-seed"));
    const poolB = drawLetterPool(createSeededRng("round-seed"));
    expect(poolA).toEqual(poolB);
  });

  it("draws only uppercase letters", () => {
    const pool = drawLetterPool(createSeededRng("letters"));
    for (const letter of pool) expect(letter).toMatch(/^[A-Z]$/);
  });
});
