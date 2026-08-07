import { describe, expect, it } from "vitest";
import { gridThreeEngine } from "@/games/grid-three/engine";
import { pickGridThreeBotMove } from "@/games/grid-three/bot";
import type { GridThreeState } from "@/games/grid-three/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(mode: "classic" | "connect-five-board" = "classic") {
  return gridThreeEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: { mode }, now: 0 });
}

describe("gridThreeEngine.createInitialState", () => {
  it("sets up a 3x3 board with the first-seat player to move", () => {
    const state = initial();
    expect(state.boardSize).toBe(3);
    expect(state.cells).toHaveLength(9);
    expect(state.currentTurnPlayerId).toBe("p1");
  });

  it("sets up a 5x5 board for connect-five-board mode", () => {
    const state = initial("connect-five-board");
    expect(state.boardSize).toBe(5);
    expect(state.cells).toHaveLength(25);
  });
});

describe("gridThreeEngine.applyAction", () => {
  it("rejects a move from the wrong player", () => {
    const state = initial();
    const result = gridThreeEngine.applyAction(state, { type: "place", cellIndex: 0 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("rejects placing on an occupied cell", () => {
    let state = initial();
    state = (gridThreeEngine.applyAction(state, { type: "place", cellIndex: 0 }, "p1") as { ok: true; nextState: GridThreeState }).nextState;
    const result = gridThreeEngine.applyAction(state, { type: "place", cellIndex: 0 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("detects a horizontal win on the classic board", () => {
    let state = initial();
    const moves: [number, string][] = [
      [0, "p1"],
      [3, "p2"],
      [1, "p1"],
      [4, "p2"],
      [2, "p1"], // p1 completes top row
    ];
    for (const [cellIndex, player] of moves) {
      const result = gridThreeEngine.applyAction(state, { type: "place", cellIndex }, player);
      expect(result.ok).toBe(true);
      state = (result as { ok: true; nextState: GridThreeState }).nextState;
    }
    expect(state.winnerPlayerId).toBe("p1");
    expect(state.winningLine).toEqual([0, 1, 2]);
  });

  it("detects a draw when the board fills with no winner", () => {
    let state = initial();
    // X | O | X
    // X | O | O
    // O | X | X
    const moves: [number, string][] = [
      [0, "p1"],
      [1, "p2"],
      [3, "p1"],
      [4, "p2"],
      [8, "p1"],
      [5, "p2"],
      [2, "p1"],
      [6, "p2"],
      [7, "p1"],
    ];
    for (const [cellIndex, player] of moves) {
      const result = gridThreeEngine.applyAction(state, { type: "place", cellIndex }, player);
      state = (result as { ok: true; nextState: GridThreeState }).nextState;
    }
    expect(state.isDraw).toBe(true);
    expect(state.winnerPlayerId).toBeNull();
  });

  it("rejects further moves once the match has ended", () => {
    let state = initial();
    const moves: [number, string][] = [
      [0, "p1"],
      [3, "p2"],
      [1, "p1"],
      [4, "p2"],
      [2, "p1"],
    ];
    for (const [cellIndex, player] of moves) {
      state = (gridThreeEngine.applyAction(state, { type: "place", cellIndex }, player) as { ok: true; nextState: GridThreeState }).nextState;
    }
    const result = gridThreeEngine.applyAction(state, { type: "place", cellIndex: 8 }, "p2");
    expect(result.ok).toBe(false);
  });
});

describe("pickGridThreeBotMove", () => {
  it("takes an immediate winning move on medium difficulty", () => {
    const state: GridThreeState = {
      ...initial(),
      cells: ["p1", "p1", null, "p2", "p2", null, null, null, null],
      currentTurnPlayerId: "p1",
    };
    const move = pickGridThreeBotMove(state, "p1", "medium");
    expect(move).toEqual({ type: "place", cellIndex: 2 });
  });

  it("blocks the opponent's immediate winning move on medium difficulty", () => {
    const state: GridThreeState = {
      ...initial(),
      cells: ["p2", "p2", null, "p1", null, null, null, null, null],
      currentTurnPlayerId: "p1",
    };
    const move = pickGridThreeBotMove(state, "p1", "medium");
    expect(move).toEqual({ type: "place", cellIndex: 2 });
  });

  it("never returns an occupied cell across many random easy moves", () => {
    const state: GridThreeState = {
      ...initial(),
      cells: ["p1", null, "p2", null, null, null, null, null, null],
    };
    for (let i = 0; i < 25; i++) {
      const move = pickGridThreeBotMove(state, "p1", "easy");
      expect(state.cells[move.cellIndex]).toBeNull();
    }
  });
});
