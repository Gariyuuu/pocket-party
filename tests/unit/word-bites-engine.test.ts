import { describe, expect, it } from "vitest";
import { wordBitesEngine } from "@/games/word-bites/engine";
import type { WordBitesState } from "@/games/word-bites/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): WordBitesState {
  return wordBitesEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 1000 });
}

describe("wordBitesEngine.createInitialState", () => {
  it("starts round-active with a populated rack and zeroed scores", () => {
    const state = initial();
    expect(state.status).toBe("round-active");
    expect(state.rack.length).toBeGreaterThan(0);
    expect(state.scores).toEqual({ p1: 0, p2: 0 });
    expect(state.roundEndsAt).toBeGreaterThan(1000);
  });
});

describe("wordBitesEngine.applyAction", () => {
  it("rejects a non-contiguous tile selection", () => {
    const state = initial();
    const result = wordBitesEngine.applyAction(
      state,
      { type: "submit-word", tileIds: [state.rack[0].id, state.rack[2].id] },
      "p1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_move");
  });

  it("rejects tiles that aren't in the rack", () => {
    const state = initial();
    const result = wordBitesEngine.applyAction(state, { type: "submit-word", tileIds: ["nonexistent"] }, "p1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_move");
  });

  it("accepts a valid contiguous run, removes those tiles, and scores points", () => {
    const state = initial();
    // Grab one whole source-word group (guaranteed contiguous and real by construction).
    const groupId = state.rack[0].groupId;
    const groupTiles = state.rack.filter((t) => t.groupId === groupId);
    const word = groupTiles.map((t) => t.letters).join("");

    const result = wordBitesEngine.applyAction(
      state,
      { type: "submit-word", tileIds: groupTiles.map((t) => t.id) },
      "p1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.rack).toHaveLength(state.rack.length - groupTiles.length);
      expect(result.nextState.rack.some((t) => t.groupId === groupId)).toBe(false);
      expect(result.nextState.scores.p1).toBe(word.length * word.length);
      expect(result.nextState.claimed).toHaveLength(1);
      expect(result.nextState.claimed[0].word).toBe(word);
    }
  });

  it("rejects a submission shorter than 3 letters", () => {
    const state = initial();
    const singleLetterTile = state.rack.find((t) => t.letters.length === 1);
    if (!singleLetterTile) return; // rack composition is seed-dependent; skip if this seed has none
    const result = wordBitesEngine.applyAction(
      state,
      { type: "submit-word", tileIds: [singleLetterTile.id] },
      "p1",
    );
    expect(result.ok).toBe(false);
  });

  it("ends the match once the rack is fully claimed", () => {
    let state = initial();
    const groupIds = [...new Set(state.rack.map((t) => t.groupId))];
    for (const groupId of groupIds) {
      const tiles = state.rack.filter((t) => t.groupId === groupId);
      const result = wordBitesEngine.applyAction(
        state,
        { type: "submit-word", tileIds: tiles.map((t) => t.id) },
        "p1",
      );
      expect(result.ok).toBe(true);
      if (result.ok) state = result.nextState;
    }
    expect(state.rack).toHaveLength(0);
    expect(state.status).toBe("match-ended");
    expect(state.winnerPlayerId).toBe("p1");
  });

  it("ends the match via advance-round and picks the higher scorer", () => {
    const state: WordBitesState = { ...initial(), scores: { p1: 10, p2: 4 } };
    const result = wordBitesEngine.applyAction(state, { type: "advance-round", now: 999999 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.status).toBe("match-ended");
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("declares a draw when scores tie at match end", () => {
    const state: WordBitesState = { ...initial(), scores: { p1: 5, p2: 5 } };
    const result = wordBitesEngine.applyAction(state, { type: "advance-round", now: 999999 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.isDraw).toBe(true);
      expect(result.nextState.winnerPlayerId).toBeNull();
    }
  });

  it("rejects further submissions once the match has ended", () => {
    const state: WordBitesState = { ...initial(), status: "match-ended", winnerPlayerId: "p1" };
    const result = wordBitesEngine.applyAction(
      state,
      { type: "submit-word", tileIds: [state.rack[0].id] },
      "p1",
    );
    expect(result.ok).toBe(false);
  });
});
