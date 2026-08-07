import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { BOARD_SIZE, flipsForMove, legalMoves } from "./moves";
import { pickReversiMove } from "./bot";
import type { ReversiAction, ReversiState } from "./types";

function initialBoard(playerIds: [string, string]): (string | null)[] {
  const board: (string | null)[] = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  const mid = BOARD_SIZE / 2;
  board[(mid - 1) * BOARD_SIZE + (mid - 1)] = playerIds[0];
  board[(mid - 1) * BOARD_SIZE + mid] = playerIds[1];
  board[mid * BOARD_SIZE + (mid - 1)] = playerIds[1];
  board[mid * BOARD_SIZE + mid] = playerIds[0];
  return board;
}

export const reversiEngine: GameEngine<ReversiState, ReversiAction> = {
  gameId: "reversi",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const playerIds: [string, string] = [ordered[0].playerId, ordered[1].playerId];
    return {
      players: ordered,
      board: initialBoard(playerIds),
      currentTurnPlayerId: playerIds[0],
      lastMove: null,
      status: "active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<ReversiState> {
    if (state.status !== "active") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "place") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }

    const playerIds = state.players.map((p) => p.playerId);
    const opponentId = playerIds.find((id) => id !== fromPlayerId)!;
    const flipped = flipsForMove(state.board, action.cell, fromPlayerId, opponentId);
    if (flipped.length === 0) {
      return { ok: false, reason: "invalid_move", message: "That's not a legal move." };
    }

    const board = [...state.board];
    board[action.cell] = fromPlayerId;
    for (const cell of flipped) board[cell] = fromPlayerId;

    // No explicit "pass" action exists — if a player has zero legal moves,
    // their turn is skipped automatically rather than requiring them to
    // submit a pass. Standard Reversi rules; this is just a UX simplification
    // (the outcome is identical either way).
    const boardFull = board.every((cell) => cell !== null);
    const opponentMoves = boardFull ? [] : legalMoves(board, opponentId, fromPlayerId);
    const myMovesAfter = boardFull ? [] : legalMoves(board, fromPlayerId, opponentId);

    let status: ReversiState["status"] = "active";
    let winnerPlayerId: string | null = null;
    let isDraw = false;
    let nextTurn = state.currentTurnPlayerId;

    if (boardFull || (opponentMoves.length === 0 && myMovesAfter.length === 0)) {
      status = "finished";
      const myCount = board.filter((cell) => cell === fromPlayerId).length;
      const opponentCount = board.filter((cell) => cell === opponentId).length;
      if (myCount === opponentCount) isDraw = true;
      else winnerPlayerId = myCount > opponentCount ? fromPlayerId : opponentId;
    } else if (opponentMoves.length > 0) {
      nextTurn = opponentId;
    } else {
      nextTurn = fromPlayerId;
    }

    return {
      ok: true,
      nextState: {
        ...state,
        board,
        lastMove: { playerId: fromPlayerId, cell: action.cell, flipped },
        status,
        winnerPlayerId,
        isDraw,
        currentTurnPlayerId: nextTurn,
      },
    };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    if (state.isDraw) return { status: "draw" };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickReversiMove(state, botPlayerId, difficulty);
  },
};
