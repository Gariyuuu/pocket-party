import { describe, expect, it } from "vitest";
import { generateBiteRack } from "@/games/word-bites/board-gen";
import { SEED_WORDS } from "@/games/word-bites/seed-words";
import { WORD_BITES_SOURCE_WORD_COUNT } from "@/games/word-bites/constants";

function groupsOf(rack: ReturnType<typeof generateBiteRack>) {
  const groups = new Map<number, string>();
  for (const tile of rack) {
    groups.set(tile.groupId, (groups.get(tile.groupId) ?? "") + tile.letters);
  }
  return [...groups.values()];
}

describe("generateBiteRack", () => {
  it("is deterministic for the same seed", () => {
    const a = generateBiteRack("seed-1");
    const b = generateBiteRack("seed-1");
    expect(a).toEqual(b);
  });

  it("produces a different rack for a different seed", () => {
    const a = generateBiteRack("seed-1");
    const b = generateBiteRack("seed-2");
    expect(a).not.toEqual(b);
  });

  it("draws exactly WORD_BITES_SOURCE_WORD_COUNT source words", () => {
    const rack = generateBiteRack("seed-1");
    const groupIds = new Set(rack.map((t) => t.groupId));
    expect(groupIds.size).toBe(WORD_BITES_SOURCE_WORD_COUNT);
  });

  it("keeps every source word's bites contiguous, reconstructing a real seed word", () => {
    const rack = generateBiteRack("seed-1");
    for (const word of groupsOf(rack)) {
      expect(SEED_WORDS).toContain(word);
    }
  });

  it("never produces an empty bite", () => {
    const rack = generateBiteRack("seed-1");
    for (const tile of rack) {
      expect(tile.letters.length).toBeGreaterThanOrEqual(1);
      expect(tile.letters.length).toBeLessThanOrEqual(3);
    }
  });

  it("gives every tile a unique id", () => {
    const rack = generateBiteRack("seed-1");
    const ids = new Set(rack.map((t) => t.id));
    expect(ids.size).toBe(rack.length);
  });
});
