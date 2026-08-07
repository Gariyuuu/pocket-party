import { describe, expect, it } from "vitest";
import { fourfallEngine } from "@/games/fourfall/engine";
import { pickFourfallBotMove } from "@/games/fourfall/bot";
import { FOURFALL_COLUMNS, FOURFALL_ROWS, type FourfallState } from "@/games/fourfall/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial() {
  return fourfallEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

describe("fourfallEngine.createInitialState", () => {
  it("builds a 7x6 empty board", () => {
    const state = initial();
    expect(state.columns).toBe(FOURFALL_COLUMNS);
    expect(state.rows).toBe(FOURFALL_ROWS);
    expect(state.cells).toHaveLength(FOURFALL_COLUMNS * FOURFALL_ROWS);
    expect(state.currentTurnPlayerId).toBe("p1");
  });
});

describe("fourfallEngine.applyAction", () => {
  it("stacks tokens in a column from the bottom up", () => {
    let state = initial();
    state = (fourfallEngine.applyAction(state, { type: "drop", column: 2 }, "p1") as { ok: true; nextState: FourfallState }).nextState;
    expect(state.cells[2]).toBe("p1"); // row 0, col 2
    state = (fourfallEngine.applyAction(state, { type: "drop", column: 2 }, "p2") as { ok: true; nextState: FourfallState }).nextState;
    expect(state.cells[state.columns + 2]).toBe("p2"); // row 1, col 2
  });

  it("rejects dropping into a full column", () => {
    const cells = Array(FOURFALL_COLUMNS * FOURFALL_ROWS).fill(null);
    for (let row = 0; row < FOURFALL_ROWS; row++) cells[row * FOURFALL_COLUMNS + 0] = "p1";
    const state: FourfallState = { ...initial(), cells, currentTurnPlayerId: "p2" };
    const result = fourfallEngine.applyAction(state, { type: "drop", column: 0 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("detects a horizontal win across the bottom row", () => {
    const cells = Array(FOURFALL_COLUMNS * FOURFALL_ROWS).fill(null);
    cells[0] = "p1";
    cells[1] = "p1";
    cells[2] = "p1";
    const state: FourfallState = { ...initial(), cells, currentTurnPlayerId: "p1" };
    const result = fourfallEngine.applyAction(state, { type: "drop", column: 3 }, "p1") as { ok: true; nextState: FourfallState };
    expect(result.ok).toBe(true);
    expect(result.nextState.winnerPlayerId).toBe("p1");
  });

  it("detects a full-board draw", () => {
    // A verified win-free full 7x6 filling (checked with the actual win
    // scanner, not hand-drawn — Connect Four boards are surprisingly easy
    // to accidentally give a diagonal run to when sketched by hand).
    const fullBoard = [
      "p1", "p1", "p2", "p2", "p2", "p1", "p1",
      "p2", "p2", "p1", "p2", "p1", "p1", "p1",
      "p1", "p2", "p1", "p2", "p2", "p2", "p1",
      "p2", "p1", "p1", "p1", "p2", "p1", "p2",
      "p1", "p2", "p2", "p2", "p1", "p2", "p2",
      "p1", "p2", "p1", "p2", "p2", "p2", "p1",
    ];
    const cells: (string | null)[] = [...fullBoard];
    const lastIndex = cells.length - 1; // row 5, column 6
    const lastOwner = cells[lastIndex]!;
    cells[lastIndex] = null;

    const state: FourfallState = { ...initial(), cells, currentTurnPlayerId: lastOwner };
    const result = fourfallEngine.applyAction(
      state,
      { type: "drop", column: FOURFALL_COLUMNS - 1 },
      lastOwner,
    ) as { ok: true; nextState: FourfallState };
    expect(result.ok).toBe(true);
    expect(result.nextState.isDraw).toBe(true);
    expect(result.nextState.winnerPlayerId).toBeNull();
  });
});

describe("pickFourfallBotMove", () => {
  it("always returns a column that still has room", () => {
    const state = initial();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const move = pickFourfallBotMove(state, "p1", difficulty);
      expect(move.column).toBeGreaterThanOrEqual(0);
      expect(move.column).toBeLessThan(state.columns);
    }
  });

  it("blocks an immediate opponent win on hard difficulty", () => {
    const cells = Array(FOURFALL_COLUMNS * FOURFALL_ROWS).fill(null);
    cells[0] = "p2";
    cells[1] = "p2";
    cells[2] = "p2";
    const state: FourfallState = { ...initial(), cells, currentTurnPlayerId: "p1" };
    const move = pickFourfallBotMove(state, "p1", "hard");
    expect(move.column).toBe(3);
  });
});
