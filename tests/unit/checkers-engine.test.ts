import { describe, expect, it } from "vitest";
import { checkersEngine } from "@/games/checkers/engine";
import type { CheckersPiece, CheckersState } from "@/games/checkers/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): CheckersState {
  return checkersEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

function emptyBoard(): (CheckersPiece | null)[] {
  return Array(64).fill(null);
}

describe("checkersEngine.createInitialState", () => {
  it("places 12 pieces per side on dark squares only", () => {
    const state = initial();
    const p1Pieces = state.board.filter((p) => p?.playerId === "p1");
    const p2Pieces = state.board.filter((p) => p?.playerId === "p2");
    expect(p1Pieces).toHaveLength(12);
    expect(p2Pieces).toHaveLength(12);
    state.board.forEach((piece, cell) => {
      if (!piece) return;
      const row = Math.floor(cell / 8);
      const col = cell % 8;
      expect((row + col) % 2).toBe(1);
    });
  });
});

describe("checkersEngine.applyAction", () => {
  it("allows a simple diagonal step forward", () => {
    const state = initial();
    // p1 pieces start on rows 0-2, moving toward increasing rows.
    const result = checkersEngine.applyAction(state, { type: "move", from: 2 * 8 + 1, path: [3 * 8 + 2] }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[3 * 8 + 2]?.playerId).toBe("p1");
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
    }
  });

  it("rejects a move from the wrong player", () => {
    const result = checkersEngine.applyAction(initial(), { type: "move", from: 2 * 8 + 1, path: [3 * 8 + 2] }, "p2");
    expect(result.ok).toBe(false);
  });

  it("rejects a backward step for a non-king piece", () => {
    const board = emptyBoard();
    board[3 * 8 + 2] = { playerId: "p1", isKing: false };
    const state: CheckersState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = checkersEngine.applyAction(state, { type: "move", from: 3 * 8 + 2, path: [2 * 8 + 1] }, "p1");
    expect(result.ok).toBe(false);
  });

  it("captures via a jump and removes the captured piece", () => {
    const board = emptyBoard();
    board[2 * 8 + 2] = { playerId: "p1", isKing: false };
    board[3 * 8 + 3] = { playerId: "p2", isKing: false };
    const state: CheckersState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = checkersEngine.applyAction(state, { type: "move", from: 2 * 8 + 2, path: [4 * 8 + 4] }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[3 * 8 + 3]).toBeNull();
      expect(result.nextState.board[4 * 8 + 4]?.playerId).toBe("p1");
      expect(result.nextState.lastMove?.captured).toEqual([3 * 8 + 3]);
    }
  });

  it("enforces mandatory capture — a simple step is rejected when a jump is available", () => {
    const board = emptyBoard();
    board[2 * 8 + 2] = { playerId: "p1", isKing: false };
    board[3 * 8 + 3] = { playerId: "p2", isKing: false };
    board[2 * 8 + 5] = { playerId: "p1", isKing: false }; // a second p1 piece with no jump available
    const state: CheckersState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = checkersEngine.applyAction(state, { type: "move", from: 2 * 8 + 5, path: [3 * 8 + 6] }, "p1");
    expect(result.ok).toBe(false);
  });

  it("supports a chained double-jump in one action", () => {
    const board = emptyBoard();
    board[2 * 8 + 2] = { playerId: "p1", isKing: false };
    board[3 * 8 + 3] = { playerId: "p2", isKing: false };
    board[5 * 8 + 5] = { playerId: "p2", isKing: false };
    const state: CheckersState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = checkersEngine.applyAction(state, { type: "move", from: 2 * 8 + 2, path: [4 * 8 + 4, 6 * 8 + 6] }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[3 * 8 + 3]).toBeNull();
      expect(result.nextState.board[5 * 8 + 5]).toBeNull();
      expect(result.nextState.board[6 * 8 + 6]?.playerId).toBe("p1");
    }
  });

  it("crowns a piece that reaches the far row", () => {
    const board = emptyBoard();
    board[6 * 8 + 3] = { playerId: "p1", isKing: false };
    const state: CheckersState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = checkersEngine.applyAction(state, { type: "move", from: 6 * 8 + 3, path: [7 * 8 + 4] }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[7 * 8 + 4]?.isKing).toBe(true);
      expect(result.nextState.lastMove?.crowned).toBe(true);
    }
  });

  it("lets a king move backward", () => {
    const board = emptyBoard();
    board[3 * 8 + 3] = { playerId: "p1", isKing: true };
    const state: CheckersState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = checkersEngine.applyAction(state, { type: "move", from: 3 * 8 + 3, path: [2 * 8 + 2] }, "p1");
    expect(result.ok).toBe(true);
  });

  it("wins when the opponent has no pieces left", () => {
    const board = emptyBoard();
    board[2 * 8 + 2] = { playerId: "p1", isKing: false };
    board[3 * 8 + 3] = { playerId: "p2", isKing: false };
    const state: CheckersState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = checkersEngine.applyAction(state, { type: "move", from: 2 * 8 + 2, path: [4 * 8 + 4] }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("wins when the opponent has pieces but no legal move (trapped)", () => {
    const board = emptyBoard();
    // A lone non-king p2 piece on row 0 (p2's own promotion row) has no legal
    // move at all: p2 moves toward decreasing rows, and row -1 doesn't exist,
    // for both a step and a jump.
    board[0 * 8 + 1] = { playerId: "p2", isKing: false };
    board[2 * 8 + 2] = { playerId: "p1", isKing: false };
    const state: CheckersState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = checkersEngine.applyAction(state, { type: "move", from: 2 * 8 + 2, path: [3 * 8 + 3] }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("rejects further moves once the match has ended", () => {
    const state: CheckersState = { ...initial(), winnerPlayerId: "p1" };
    const result = checkersEngine.applyAction(state, { type: "move", from: 0, path: [1] }, "p2");
    expect(result.ok).toBe(false);
  });
});
