import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { BOARD_SIZE, hasAnyCapture, hasAnyLegalMove, jumpOptions, rowColOf, stepOptions } from "./moves";
import { pickCheckersMove } from "./bot";
import type { CheckersAction, CheckersPiece, CheckersState } from "./types";

function initialBoard(playerIds: string[]): (CheckersPiece | null)[] {
  const board: (CheckersPiece | null)[] = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 0) continue; // only dark squares are ever occupied
      if (row <= 2) board[row * BOARD_SIZE + col] = { playerId: playerIds[0], isKing: false };
      else if (row >= 5) board[row * BOARD_SIZE + col] = { playerId: playerIds[1], isKing: false };
    }
  }
  return board;
}

function makeForwardRowDeltaFor(playerIds: string[]) {
  return (playerId: string) => (playerId === playerIds[0] ? 1 : -1);
}

export const checkersEngine: GameEngine<CheckersState, CheckersAction> = {
  gameId: "checkers",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const playerIds = ordered.map((p) => p.playerId);
    return {
      players: ordered,
      board: initialBoard(playerIds),
      currentTurnPlayerId: playerIds[0],
      lastMove: null,
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<CheckersState> {
    if (state.winnerPlayerId || state.isDraw) {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "move") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }

    const playerIds = state.players.map((p) => p.playerId);
    const forwardRowDeltaFor = makeForwardRowDeltaFor(playerIds);
    const { from, path } = action;
    const piece = state.board[from];
    if (!piece || piece.playerId !== fromPlayerId || !Array.isArray(path) || path.length === 0) {
      return { ok: false, reason: "invalid_move", message: "That's not a piece you can move." };
    }

    const mustCapture = hasAnyCapture(state.board, fromPlayerId, forwardRowDeltaFor);
    const board = [...state.board];
    let current = from;
    let currentPiece: CheckersPiece = piece;
    const captured: number[] = [];
    let tookAnyJump = false;

    for (const to of path) {
      const forwardRowDelta = forwardRowDeltaFor(fromPlayerId);
      const jump = jumpOptions(board, current, currentPiece, forwardRowDelta).find((j) => j.to === to);
      if (jump) {
        board[jump.captured] = null;
        board[current] = null;
        board[to] = currentPiece;
        captured.push(jump.captured);
        current = to;
        tookAnyJump = true;
        continue;
      }
      const step = stepOptions(board, current, currentPiece, forwardRowDelta).find((s) => s.to === to);
      if (step && path.length === 1 && !mustCapture) {
        board[current] = null;
        board[to] = currentPiece;
        current = to;
        continue;
      }
      return { ok: false, reason: "invalid_move", message: mustCapture ? "A capture is available — you must take it." : "That's not a legal move." };
    }

    if (mustCapture && !tookAnyJump) {
      return { ok: false, reason: "invalid_move", message: "A capture is available — you must take it." };
    }

    const [finalRow] = rowColOf(current);
    const homeRow = fromPlayerId === playerIds[0] ? BOARD_SIZE - 1 : 0;
    let crowned = false;
    if (!currentPiece.isKing && finalRow === homeRow) {
      currentPiece = { ...currentPiece, isKing: true };
      board[current] = currentPiece;
      crowned = true;
    }

    const opponentId = playerIds.find((id) => id !== fromPlayerId)!;
    const opponentPieceCount = board.filter((p) => p?.playerId === opponentId).length;
    const opponentHasMoves = opponentPieceCount > 0 && hasAnyLegalMove(board, opponentId, forwardRowDeltaFor);
    const winnerPlayerId = opponentPieceCount === 0 || !opponentHasMoves ? fromPlayerId : null;

    return {
      ok: true,
      nextState: {
        ...state,
        board,
        lastMove: { from, path, captured, crowned },
        winnerPlayerId,
        currentTurnPlayerId: winnerPlayerId ? state.currentTurnPlayerId : opponentId,
      },
    };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    if (state.isDraw) return { status: "draw" };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickCheckersMove(state, botPlayerId, difficulty);
  },
};
