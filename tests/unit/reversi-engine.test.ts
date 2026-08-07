import { describe, expect, it } from "vitest";
import { reversiEngine } from "@/games/reversi/engine";
import { legalMoves } from "@/games/reversi/moves";
import { pickReversiMove } from "@/games/reversi/bot";
import type { ReversiState } from "@/games/reversi/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): ReversiState {
  return reversiEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

function emptyBoard(): (string | null)[] {
  return Array(64).fill(null);
}

function fillRow(board: (string | null)[], row: number, values: (string | null)[]) {
  for (let col = 0; col < 8; col++) board[row * 8 + col] = values[col];
}

describe("reversiEngine.createInitialState", () => {
  it("sets up the standard 4-disc starting position", () => {
    const state = initial();
    expect(state.board.filter((c) => c === "p1")).toHaveLength(2);
    expect(state.board.filter((c) => c === "p2")).toHaveLength(2);
    expect(state.currentTurnPlayerId).toBe("p1");
  });

  it("gives the first player exactly 4 legal opening moves", () => {
    const state = initial();
    expect(legalMoves(state.board, "p1", "p2")).toHaveLength(4);
  });
});

describe("reversiEngine.applyAction", () => {
  it("rejects a move from the wrong player", () => {
    const result = reversiEngine.applyAction(initial(), { type: "place", cell: 0 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("rejects an illegal cell", () => {
    const result = reversiEngine.applyAction(initial(), { type: "place", cell: 0 }, "p1");
    expect(result.ok).toBe(false);
  });

  it("flips sandwiched discs and passes the turn", () => {
    const state = initial();
    const moves = legalMoves(state.board, "p1", "p2");
    const result = reversiEngine.applyAction(state, { type: "place", cell: moves[0] }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.lastMove?.flipped.length).toBeGreaterThan(0);
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
    }
  });

  it("auto-skips a player with zero legal moves instead of requiring an explicit pass", () => {
    // Two isolated 1-row "pockets" (row 4 and row 6), everything else solid
    // p1. Placing in row 4's pocket flips its only p2 disc away, leaving
    // p2 with zero legal moves anywhere — but row 6's pocket still gives
    // p1 a move, so the turn should stay with p1 rather than passing.
    const board = emptyBoard();
    for (let row = 0; row < 8; row++) fillRow(board, row, Array(8).fill("p1"));
    fillRow(board, 4, ["p1", "p2", null, "p1", "p1", "p1", "p1", "p1"]);
    fillRow(board, 6, ["p1", "p2", null, "p1", "p1", "p1", "p1", "p1"]);

    const state: ReversiState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = reversiEngine.applyAction(state, { type: "place", cell: 4 * 8 + 2 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.status).toBe("active");
      expect(result.nextState.currentTurnPlayerId).toBe("p1");
      expect(legalMoves(result.nextState.board, "p2", "p1")).toHaveLength(0);
    }
  });

  it("ends the match and declares a winner once the board fills up", () => {
    const board = emptyBoard();
    board.fill("p1");
    board[0] = null;
    board[1] = "p2";
    const state: ReversiState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = reversiEngine.applyAction(state, { type: "place", cell: 0 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board.every((c) => c !== null)).toBe(true);
      expect(result.nextState.status).toBe("finished");
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("rejects further moves once the match has ended", () => {
    const state: ReversiState = { ...initial(), status: "finished", winnerPlayerId: "p1" };
    const result = reversiEngine.applyAction(state, { type: "place", cell: 20 }, "p2");
    expect(result.ok).toBe(false);
  });
});

describe("pickReversiMove", () => {
  it("always returns one of the currently legal moves, at every difficulty", () => {
    const state = initial();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const move = pickReversiMove(state, "p1", difficulty);
      expect(legalMoves(state.board, "p1", "p2")).toContain(move.cell);
    }
  });
});
