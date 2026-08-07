import { describe, expect, it } from "vitest";
import { chessEngine } from "@/games/chess/engine";
import type { ChessPiece, ChessState } from "@/games/chess/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): ChessState {
  return chessEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

function emptyBoard(): (ChessPiece | null)[] {
  return Array(64).fill(null);
}

describe("chessEngine.createInitialState", () => {
  it("sets up 16 pieces per side in the standard formation", () => {
    const state = initial();
    expect(state.board.filter((p) => p?.playerId === "p1")).toHaveLength(16);
    expect(state.board.filter((p) => p?.playerId === "p2")).toHaveLength(16);
    expect(state.currentTurnPlayerId).toBe("p1");
  });
});

describe("chessEngine.applyAction — basic moves", () => {
  it("allows a standard pawn double-step opening and passes the turn", () => {
    const result = chessEngine.applyAction(initial(), { type: "move", from: 6 * 8 + 4, to: 4 * 8 + 4 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[4 * 8 + 4]?.type).toBe("pawn");
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
      expect(result.nextState.enPassantTarget).toBe(5 * 8 + 4);
    }
  });

  it("rejects a move from the wrong player", () => {
    const result = chessEngine.applyAction(initial(), { type: "move", from: 6 * 8 + 4, to: 4 * 8 + 4 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("rejects an illegal move shape", () => {
    const result = chessEngine.applyAction(initial(), { type: "move", from: 6 * 8 + 4, to: 3 * 8 + 4 }, "p1");
    expect(result.ok).toBe(false);
  });

  it("rejects a move that would expose its own king to check", () => {
    const board = emptyBoard();
    board[7 * 8 + 4] = { playerId: "p1", type: "king" };
    board[4 * 8 + 4] = { playerId: "p1", type: "knight" };
    board[0 * 8 + 4] = { playerId: "p2", type: "rook" };
    board[0 * 8 + 0] = { playerId: "p2", type: "king" };
    const state: ChessState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = chessEngine.applyAction(state, { type: "move", from: 4 * 8 + 4, to: 6 * 8 + 5 }, "p1");
    expect(result.ok).toBe(false);
  });
});

describe("chessEngine.applyAction — special moves", () => {
  it("executes an en passant capture", () => {
    const board = emptyBoard();
    board[7 * 8 + 4] = { playerId: "p1", type: "king" };
    board[0 * 8 + 4] = { playerId: "p2", type: "king" };
    board[3 * 8 + 3] = { playerId: "p1", type: "pawn" };
    board[3 * 8 + 4] = { playerId: "p2", type: "pawn" };
    const state: ChessState = { ...initial(), board, currentTurnPlayerId: "p1", enPassantTarget: 2 * 8 + 4 };
    const result = chessEngine.applyAction(state, { type: "move", from: 3 * 8 + 3, to: 2 * 8 + 4 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[3 * 8 + 4]).toBeNull();
      expect(result.nextState.board[2 * 8 + 4]?.playerId).toBe("p1");
      expect(result.nextState.lastMove?.isEnPassant).toBe(true);
    }
  });

  it("castles king-side when legal", () => {
    const board = emptyBoard();
    board[7 * 8 + 4] = { playerId: "p1", type: "king" };
    board[7 * 8 + 7] = { playerId: "p1", type: "rook" };
    board[0 * 8 + 4] = { playerId: "p2", type: "king" };
    const state: ChessState = {
      ...initial(),
      board,
      currentTurnPlayerId: "p1",
      castlingRights: { kingSide: { p1: true, p2: false }, queenSide: { p1: false, p2: false } },
    };
    const result = chessEngine.applyAction(state, { type: "move", from: 7 * 8 + 4, to: 7 * 8 + 6 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[7 * 8 + 6]?.type).toBe("king");
      expect(result.nextState.board[7 * 8 + 5]?.type).toBe("rook");
      expect(result.nextState.board[7 * 8 + 7]).toBeNull();
      expect(result.nextState.lastMove?.isCastle).toBe(true);
    }
  });

  it("rejects castling through an attacked square", () => {
    const board = emptyBoard();
    board[7 * 8 + 4] = { playerId: "p1", type: "king" };
    board[7 * 8 + 7] = { playerId: "p1", type: "rook" };
    board[0 * 8 + 4] = { playerId: "p2", type: "king" };
    board[0 * 8 + 5] = { playerId: "p2", type: "rook" }; // attacks f1/f-file all the way down, through f1=7*8+5
    const state: ChessState = {
      ...initial(),
      board,
      currentTurnPlayerId: "p1",
      castlingRights: { kingSide: { p1: true, p2: false }, queenSide: { p1: false, p2: false } },
    };
    const result = chessEngine.applyAction(state, { type: "move", from: 7 * 8 + 4, to: 7 * 8 + 6 }, "p1");
    expect(result.ok).toBe(false);
  });

  it("requires a promotion choice when a pawn reaches the far rank, and applies it", () => {
    const board = emptyBoard();
    board[7 * 8 + 4] = { playerId: "p1", type: "king" };
    board[0 * 8 + 4] = { playerId: "p2", type: "king" };
    board[1 * 8 + 0] = { playerId: "p1", type: "pawn" };
    const state: ChessState = { ...initial(), board, currentTurnPlayerId: "p1" };

    const withoutChoice = chessEngine.applyAction(state, { type: "move", from: 1 * 8 + 0, to: 0 * 8 + 0 }, "p1");
    expect(withoutChoice.ok).toBe(false);

    const result = chessEngine.applyAction(state, { type: "move", from: 1 * 8 + 0, to: 0 * 8 + 0, promotion: "queen" }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[0 * 8 + 0]?.type).toBe("queen");
      expect(result.nextState.lastMove?.promotion).toBe("queen");
    }
  });
});

describe("chessEngine.applyAction — game-ending conditions", () => {
  it("detects checkmate", () => {
    // A smothered-mate-style position: the p2 king in the corner is boxed in by its
    // own pawns and knight (none of which can reach the checking square), and a p1
    // knight delivers check from a square no p2 piece can capture or block.
    const board = emptyBoard();
    board[0 * 8 + 7] = { playerId: "p2", type: "king" };
    board[0 * 8 + 6] = { playerId: "p2", type: "knight" };
    board[1 * 8 + 6] = { playerId: "p2", type: "pawn" };
    board[1 * 8 + 7] = { playerId: "p2", type: "pawn" };
    board[7 * 8 + 4] = { playerId: "p1", type: "king" };
    board[3 * 8 + 4] = { playerId: "p1", type: "knight" };
    const state: ChessState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = chessEngine.applyAction(state, { type: "move", from: 3 * 8 + 4, to: 1 * 8 + 5 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.status).toBe("checkmate");
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("detects stalemate", () => {
    const board = emptyBoard();
    board[0 * 8 + 7] = { playerId: "p2", type: "king" };
    board[2 * 8 + 6] = { playerId: "p1", type: "queen" };
    board[7 * 8 + 1] = { playerId: "p1", type: "king" };
    const state: ChessState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = chessEngine.applyAction(state, { type: "move", from: 7 * 8 + 1, to: 7 * 8 + 0 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.status).toBe("stalemate");
      expect(result.nextState.isDraw).toBe(true);
      expect(result.nextState.winnerPlayerId).toBeNull();
    }
  });

  it("rejects further moves once the match has ended", () => {
    const state: ChessState = { ...initial(), status: "checkmate", winnerPlayerId: "p1" };
    const result = chessEngine.applyAction(state, { type: "move", from: 6 * 8 + 4, to: 4 * 8 + 4 }, "p2");
    expect(result.ok).toBe(false);
  });
});
