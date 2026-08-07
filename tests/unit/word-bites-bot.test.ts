import { describe, expect, it } from "vitest";
import { pickWordBitesMove } from "@/games/word-bites/bot";
import type { BiteTile } from "@/games/word-bites/types";

const RACK: BiteTile[] = [
  { id: "0-0", letters: "CA", groupId: 0 },
  { id: "0-1", letters: "T", groupId: 0 },
  { id: "1-0", letters: "DO", groupId: 1 },
  { id: "1-1", letters: "G", groupId: 1 },
];
const WORD_SET = new Set(["CAT", "DOG"]);

describe("pickWordBitesMove", () => {
  it("finds a real word from an intact group", () => {
    const move = pickWordBitesMove(RACK, WORD_SET, "hard");
    expect(move).not.toBeNull();
    expect(["CAT", "DOG"]).toContain(move!.word);
  });

  it("returns null when no group forms a real word", () => {
    const move = pickWordBitesMove(RACK, new Set(["XYZZY"]), "hard");
    expect(move).toBeNull();
  });

  it("ignores a group that's been partially claimed and no longer forms a real word", () => {
    const partial = RACK.filter((t) => t.id !== "0-1"); // only "CA" left from group 0
    const move = pickWordBitesMove(partial, WORD_SET, "hard");
    expect(move?.word).toBe("DOG");
  });
});
