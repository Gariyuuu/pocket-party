import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { throwDart } from "./scoring";
import { DARTS_PER_TURN, TOTAL_ROUNDS } from "./constants";
import { pickDartsThrow } from "./bot";
import type { DartsAction, DartsState } from "./types";

export const dartsEngine: GameEngine<DartsState, DartsAction> = {
  gameId: "darts",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    return {
      players: ordered,
      totalRounds: TOTAL_ROUNDS,
      dartsThrownThisTurn: 0,
      turnScore: 0,
      turnsPlayed: 0,
      totalScores: Object.fromEntries(ordered.map((p) => [p.playerId, 0])),
      currentTurnPlayerId: ordered[0].playerId,
      lastThrow: null,
      status: "active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<DartsState> {
    if (state.status !== "active") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "throw") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }
    if (
      !Number.isFinite(action.angle) ||
      !Number.isFinite(action.power) ||
      action.angle < 5 ||
      action.angle > 85 ||
      action.power < 1 ||
      action.power > 100
    ) {
      return { ok: false, reason: "invalid_move", message: "That throw is out of range." };
    }

    const result = throwDart(action.angle, action.power);
    const dartsThrownThisTurn = state.dartsThrownThisTurn + 1;
    const turnScore = state.turnScore + result.score;
    const lastThrow = { playerId: fromPlayerId, angle: action.angle, power: action.power, path: result.path, score: result.score, ringLabel: result.ringLabel };

    if (dartsThrownThisTurn < DARTS_PER_TURN) {
      return {
        ok: true,
        nextState: { ...state, dartsThrownThisTurn, turnScore, lastThrow },
      };
    }

    // Turn complete — bank the score, pass to the next player, and check for match end.
    const totalScores = { ...state.totalScores, [fromPlayerId]: state.totalScores[fromPlayerId] + turnScore };
    const turnsPlayed = state.turnsPlayed + 1;
    const matchEnded = turnsPlayed >= state.players.length * state.totalRounds;

    const currentIndex = state.players.findIndex((p) => p.playerId === fromPlayerId);
    const nextPlayer = state.players[(currentIndex + 1) % state.players.length];

    if (matchEnded) {
      const maxScore = Math.max(...state.players.map((p) => totalScores[p.playerId]));
      const leaders = state.players.filter((p) => totalScores[p.playerId] === maxScore);
      return {
        ok: true,
        nextState: {
          ...state,
          dartsThrownThisTurn: 0,
          turnScore: 0,
          turnsPlayed,
          totalScores,
          lastThrow,
          status: "match-ended",
          winnerPlayerId: leaders.length === 1 ? leaders[0].playerId : null,
          isDraw: leaders.length > 1,
        },
      };
    }

    return {
      ok: true,
      nextState: {
        ...state,
        dartsThrownThisTurn: 0,
        turnScore: 0,
        turnsPlayed,
        totalScores,
        lastThrow,
        currentTurnPlayerId: nextPlayer.playerId,
      },
    };
  },

  checkOutcome(state) {
    if (state.status !== "match-ended") return { status: "active" };
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    return { status: "draw" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickDartsThrow(botPlayerId, difficulty);
  },
};
