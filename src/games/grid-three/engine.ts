import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { findWinningLine, isBoardFull } from "./lines";
import { pickGridThreeBotMove } from "./bot";
import type { GridThreeAction, GridThreeMode, GridThreeState } from "./types";

export function winLengthForMode(mode: GridThreeMode): number {
  return mode === "classic" ? 3 : 4;
}

export function boardSizeForMode(mode: GridThreeMode): 3 | 5 {
  return mode === "classic" ? 3 : 5;
}

export const gridThreeEngine: GameEngine<GridThreeState, GridThreeAction> = {
  gameId: "grid-three",

  createInitialState({ players, modifiers }) {
    const mode: GridThreeMode = modifiers.mode === "connect-five-board" ? "connect-five-board" : "classic";
    const boardSize = boardSizeForMode(mode);
    const ordered = [...players].sort((a, b) => a.seat - b.seat);

    return {
      players: ordered,
      mode,
      boardSize,
      cells: Array(boardSize * boardSize).fill(null),
      currentTurnPlayerId: ordered[0].playerId,
      winnerPlayerId: null,
      isDraw: false,
      winningLine: null,
      moveCount: 0,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<GridThreeState> {
    if (state.winnerPlayerId || state.isDraw) {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "place") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }
    const { cellIndex } = action;
    if (
      !Number.isInteger(cellIndex) ||
      cellIndex < 0 ||
      cellIndex >= state.cells.length ||
      state.cells[cellIndex] !== null
    ) {
      return { ok: false, reason: "invalid_move", message: "That cell isn't available." };
    }

    const cells = [...state.cells];
    cells[cellIndex] = fromPlayerId;

    const winLength = winLengthForMode(state.mode);
    const win = findWinningLine(cells, state.boardSize, winLength);
    const nextPlayer = state.players.find((p) => p.playerId !== fromPlayerId)!;

    return {
      ok: true,
      nextState: {
        ...state,
        cells,
        moveCount: state.moveCount + 1,
        winnerPlayerId: win ? win.playerId : null,
        winningLine: win ? win.cellIndices : null,
        isDraw: !win && isBoardFull(cells),
        currentTurnPlayerId: win ? state.currentTurnPlayerId : nextPlayer.playerId,
      },
    };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    if (state.isDraw) return { status: "draw" };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickGridThreeBotMove(state, botPlayerId, difficulty);
  },
};
