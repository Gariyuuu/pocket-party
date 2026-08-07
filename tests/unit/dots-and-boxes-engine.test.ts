import { describe, expect, it } from "vitest";
import { dotsAndBoxesEngine } from "@/games/dots-and-boxes/engine";
import { EDGE_COUNT, boxIndex, edgesForBox, verticalEdge } from "@/games/dots-and-boxes/moves";
import { pickDotsAndBoxesMove } from "@/games/dots-and-boxes/bot";
import type { DotsAndBoxesState } from "@/games/dots-and-boxes/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): DotsAndBoxesState {
  return dotsAndBoxesEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

describe("dotsAndBoxesEngine.createInitialState", () => {
  it("starts with every edge open and every box unclaimed", () => {
    const state = initial();
    expect(state.edges).toHaveLength(EDGE_COUNT);
    expect(state.edges.every((e) => e === false)).toBe(true);
    expect(state.boxOwners.every((o) => o === null)).toBe(true);
    expect(state.currentTurnPlayerId).toBe("p1");
  });
});

describe("dotsAndBoxesEngine.applyAction", () => {
  it("rejects a move from the wrong player", () => {
    const result = dotsAndBoxesEngine.applyAction(initial(), { type: "claim-edge", edge: 0 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("rejects an already-claimed edge", () => {
    let state = initial();
    const first = dotsAndBoxesEngine.applyAction(state, { type: "claim-edge", edge: 0 }, "p1");
    expect(first.ok).toBe(true);
    if (first.ok) state = first.nextState;
    const second = dotsAndBoxesEngine.applyAction(state, { type: "claim-edge", edge: 0 }, "p2");
    expect(second.ok).toBe(false);
  });

  it("passes the turn when the claimed edge doesn't complete a box", () => {
    const result = dotsAndBoxesEngine.applyAction(initial(), { type: "claim-edge", edge: 0 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.nextState.currentTurnPlayerId).toBe("p2");
  });

  it("completing a box credits it and grants an extra turn", () => {
    const box0 = boxIndex(0, 0);
    const [top, bottom, left, right] = edgesForBox(box0);
    let state = initial();
    for (const edge of [top, bottom, left]) {
      const result = dotsAndBoxesEngine.applyAction(state, { type: "claim-edge", edge }, state.currentTurnPlayerId);
      expect(result.ok).toBe(true);
      if (result.ok) state = result.nextState;
    }
    // All 3 setup edges were claimed by whoever's turn it was each time
    // (alternating, since none of them complete a box) — claim the final
    // edge as p1 specifically to check the credit/extra-turn behavior.
    state = { ...state, currentTurnPlayerId: "p1" };
    const result = dotsAndBoxesEngine.applyAction(state, { type: "claim-edge", edge: right }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.boxOwners[box0]).toBe("p1");
      expect(result.nextState.lastMove?.completedBoxes).toEqual([box0]);
      expect(result.nextState.currentTurnPlayerId).toBe("p1");
    }
  });

  it("completing two boxes with one shared edge credits both", () => {
    const box0 = boxIndex(0, 0);
    const box1 = boxIndex(0, 1);
    const shared = verticalEdge(0, 1);
    const box0Others = edgesForBox(box0).filter((e) => e !== shared);
    const box1Others = edgesForBox(box1).filter((e) => e !== shared);

    const edges = Array(EDGE_COUNT).fill(false);
    for (const edge of [...box0Others, ...box1Others]) edges[edge] = true;
    const boxOwners = Array(16).fill(null);
    const state: DotsAndBoxesState = { ...initial(), edges, boxOwners, currentTurnPlayerId: "p1" };

    const result = dotsAndBoxesEngine.applyAction(state, { type: "claim-edge", edge: shared }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.boxOwners[box0]).toBe("p1");
      expect(result.nextState.boxOwners[box1]).toBe("p1");
      expect(result.nextState.lastMove?.completedBoxes.sort()).toEqual([box0, box1].sort());
      expect(result.nextState.currentTurnPlayerId).toBe("p1");
    }
  });

  it("ends the match and declares a winner once every edge is claimed", () => {
    const lastEdge = 39; // the single edge left open when the match finally completes
    const edges = Array(EDGE_COUNT).fill(true);
    edges[lastEdge] = false;
    const incompleteBoxes = new Set<number>();
    for (let box = 0; box < 16; box++) {
      if (!edgesForBox(box).every((e) => edges[e])) incompleteBoxes.add(box);
    }
    const boxOwners = Array.from({ length: 16 }, (_, box) => (incompleteBoxes.has(box) ? null : "p1"));
    const state: DotsAndBoxesState = { ...initial(), edges, boxOwners, currentTurnPlayerId: "p1" };

    const result = dotsAndBoxesEngine.applyAction(state, { type: "claim-edge", edge: lastEdge }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.edges.every(Boolean)).toBe(true);
      expect(result.nextState.status).toBe("finished");
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("rejects further moves once the match has ended", () => {
    const state: DotsAndBoxesState = { ...initial(), status: "finished", winnerPlayerId: "p1" };
    const result = dotsAndBoxesEngine.applyAction(state, { type: "claim-edge", edge: 5 }, "p2");
    expect(result.ok).toBe(false);
  });
});

describe("pickDotsAndBoxesMove", () => {
  it("always returns a currently-open edge, at every difficulty", () => {
    const state = initial();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const move = pickDotsAndBoxesMove(state, "p1", difficulty);
      expect(state.edges[move.edge]).toBe(false);
    }
  });

  it("takes a free box instead of leaving it for the opponent", () => {
    const box0 = boxIndex(0, 0);
    const [top, bottom, left, right] = edgesForBox(box0);
    const edges = Array(EDGE_COUNT).fill(false);
    edges[top] = true;
    edges[bottom] = true;
    edges[left] = true;
    const state: DotsAndBoxesState = { ...initial(), edges };
    const move = pickDotsAndBoxesMove(state, "p1", "hard");
    expect(move.edge).toBe(right);
  });
});
