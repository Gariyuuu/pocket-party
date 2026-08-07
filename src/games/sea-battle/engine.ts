import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { validateFleet } from "./placement";
import { BOARD_SIZE, SHIP_LENGTHS } from "./constants";
import { pickSeaBattleFire } from "./bot";
import type { SeaBattleAction, SeaBattleState, Ship } from "./types";

export const seaBattleEngine: GameEngine<SeaBattleState, SeaBattleAction> = {
  gameId: "sea-battle",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const playerIds = ordered.map((p) => p.playerId);
    return {
      players: ordered,
      boardSize: BOARD_SIZE,
      shipLengths: SHIP_LENGTHS,
      fleets: Object.fromEntries(playerIds.map((id) => [id, null])),
      shots: Object.fromEntries(playerIds.map((id) => [id, []])),
      currentTurnPlayerId: playerIds[0],
      status: "placing",
      lastShot: null,
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<SeaBattleState> {
    if (state.status === "match-ended") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }

    if (action.type === "place-ships") {
      if (state.status !== "placing") {
        return { ok: false, reason: "wrong_turn", message: "Ships are already placed." };
      }
      if (state.fleets[fromPlayerId] != null) {
        return { ok: false, reason: "duplicate_action", message: "You've already placed your fleet." };
      }
      const error = validateFleet(action.placements, state.shipLengths, state.boardSize);
      if (error) {
        return { ok: false, reason: "invalid_move", message: error };
      }

      const ships: Ship[] = action.placements.map((p) => ({ cells: p.cells, hits: [] }));
      const fleets = { ...state.fleets, [fromPlayerId]: ships };
      const everyoneReady = state.players.every((p) => fleets[p.playerId] != null);

      return {
        ok: true,
        nextState: {
          ...state,
          fleets,
          status: everyoneReady ? "battling" : "placing",
        },
      };
    }

    if (action.type === "fire") {
      if (state.status !== "battling") {
        return { ok: false, reason: "wrong_turn", message: "Ships are still being placed." };
      }
      if (fromPlayerId !== state.currentTurnPlayerId) {
        return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
      }
      const { cellIndex } = action;
      if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= state.boardSize * state.boardSize) {
        return { ok: false, reason: "invalid_move", message: "That cell is off the board." };
      }
      if (state.shots[fromPlayerId].includes(cellIndex)) {
        return { ok: false, reason: "duplicate_action", message: "You already fired there." };
      }

      const opponent = state.players.find((p) => p.playerId !== fromPlayerId)!;
      const opponentFleet = state.fleets[opponent.playerId]!;

      let hit = false;
      let sunkShipLength: number | null = null;
      const fleets = {
        ...state.fleets,
        [opponent.playerId]: opponentFleet.map((ship) => {
          if (!ship.cells.includes(cellIndex)) return ship;
          hit = true;
          const hits = [...ship.hits, cellIndex];
          if (hits.length === ship.cells.length) sunkShipLength = ship.cells.length;
          return { ...ship, hits };
        }),
      };

      const shots = { ...state.shots, [fromPlayerId]: [...state.shots[fromPlayerId], cellIndex] };
      const allSunk = fleets[opponent.playerId]!.every((ship) => ship.hits.length === ship.cells.length);

      return {
        ok: true,
        nextState: {
          ...state,
          fleets,
          shots,
          lastShot: { playerId: fromPlayerId, cellIndex, hit, sunkShipLength },
          status: allSunk ? "match-ended" : "battling",
          winnerPlayerId: allSunk ? fromPlayerId : null,
          currentTurnPlayerId: allSunk ? state.currentTurnPlayerId : opponent.playerId,
        },
      };
    }

    return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickSeaBattleFire(state, botPlayerId, difficulty);
  },
};
