import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { BOARD_SIZE, SEEDS_PER_PIT, nextCell, oppositePit, pitsFor, storeFor } from "./moves";
import { pickMancalaMove } from "./bot";
import type { MancalaAction, MancalaState } from "./types";

function initialBoard(): number[] {
  const board = Array(BOARD_SIZE).fill(SEEDS_PER_PIT);
  board[storeFor(0)] = 0;
  board[storeFor(1)] = 0;
  return board;
}

export const mancalaEngine: GameEngine<MancalaState, MancalaAction> = {
  gameId: "mancala",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    return {
      players: ordered,
      board: initialBoard(),
      currentTurnPlayerId: ordered[0].playerId,
      lastMove: null,
      status: "active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<MancalaState> {
    if (state.status !== "active") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "sow") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }

    const playerIndex: 0 | 1 = state.players[0].playerId === fromPlayerId ? 0 : 1;
    const myPits = pitsFor(playerIndex);
    if (!myPits.includes(action.pit) || state.board[action.pit] === 0) {
      return { ok: false, reason: "invalid_move", message: "Pick one of your own non-empty pits." };
    }

    const board = [...state.board];
    let seeds = board[action.pit];
    board[action.pit] = 0;
    let cell = action.pit;
    while (seeds > 0) {
      cell = nextCell(cell, playerIndex);
      board[cell]++;
      seeds--;
    }

    const myStore = storeFor(playerIndex);
    let captured = false;
    // Landing the very last seed in an own pit that was empty until this
    // move captures that seed plus everything in the directly opposite pit —
    // the signature Mancala/Kalah tactic. Standard rules capture even if the
    // opposite pit happens to be empty too (a harmless no-op in that case).
    if (myPits.includes(cell) && board[cell] === 1) {
      const opposite = oppositePit(cell);
      board[myStore] += board[cell] + board[opposite];
      board[cell] = 0;
      board[opposite] = 0;
      captured = true;
    }

    const extraTurn = cell === myStore;

    // If either side's pits are now completely empty, the round ends — the
    // still-nonempty side sweeps their remaining seeds into their own store.
    const side0Empty = pitsFor(0).every((pit) => board[pit] === 0);
    const side1Empty = pitsFor(1).every((pit) => board[pit] === 0);
    let status: MancalaState["status"] = "active";
    let winnerPlayerId: string | null = null;
    let isDraw = false;

    if (side0Empty || side1Empty) {
      for (const pit of pitsFor(0)) {
        board[storeFor(0)] += board[pit];
        board[pit] = 0;
      }
      for (const pit of pitsFor(1)) {
        board[storeFor(1)] += board[pit];
        board[pit] = 0;
      }
      status = "finished";
      const store0 = board[storeFor(0)];
      const store1 = board[storeFor(1)];
      if (store0 === store1) isDraw = true;
      else winnerPlayerId = store0 > store1 ? state.players[0].playerId : state.players[1].playerId;
    }

    const opponentId = state.players.find((p) => p.playerId !== fromPlayerId)!.playerId;
    const nextTurn = status !== "active" ? state.currentTurnPlayerId : extraTurn ? fromPlayerId : opponentId;

    return {
      ok: true,
      nextState: {
        ...state,
        board,
        lastMove: { playerId: fromPlayerId, pit: action.pit, captured, extraTurn },
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
    return pickMancalaMove(state, botPlayerId, difficulty);
  },
};
