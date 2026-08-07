import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { findFourfallWin, isFourfallFull, landingRow } from "./lines";
import { pickFourfallBotMove } from "./bot";
import { FOURFALL_COLUMNS, FOURFALL_ROWS, type FourfallAction, type FourfallState } from "./types";

export const fourfallEngine: GameEngine<FourfallState, FourfallAction> = {
  gameId: "fourfall",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    return {
      players: ordered,
      columns: FOURFALL_COLUMNS,
      rows: FOURFALL_ROWS,
      cells: Array(FOURFALL_COLUMNS * FOURFALL_ROWS).fill(null),
      currentTurnPlayerId: ordered[0].playerId,
      winnerPlayerId: null,
      isDraw: false,
      winningLine: null,
      lastDropColumn: null,
      lastDropRow: null,
      moveCount: 0,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<FourfallState> {
    if (state.winnerPlayerId || state.isDraw) {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "drop") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }
    if (!Number.isInteger(action.column) || action.column < 0 || action.column >= state.columns) {
      return { ok: false, reason: "invalid_move", message: "That column doesn't exist." };
    }

    const row = landingRow(state.cells, state.columns, state.rows, action.column);
    if (row === null) {
      return { ok: false, reason: "invalid_move", message: "That column is full." };
    }

    const cells = [...state.cells];
    cells[row * state.columns + action.column] = fromPlayerId;

    const win = findFourfallWin(cells, state.columns, state.rows);
    const nextPlayer = state.players.find((p) => p.playerId !== fromPlayerId)!;

    return {
      ok: true,
      nextState: {
        ...state,
        cells,
        moveCount: state.moveCount + 1,
        lastDropColumn: action.column,
        lastDropRow: row,
        winnerPlayerId: win ? win.playerId : null,
        winningLine: win ? win.cellIndices : null,
        isDraw: !win && isFourfallFull(cells),
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
    return pickFourfallBotMove(state, botPlayerId, difficulty);
  },
};
