import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { tossBag } from "./scoring";
import { BAGS_PER_TURN, TOTAL_ROUNDS } from "./constants";
import { pickCornholeToss } from "./bot";
import type { CornholeAction, CornholeState } from "./types";

export const cornholeEngine: GameEngine<CornholeState, CornholeAction> = {
  gameId: "cornhole",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    return {
      players: ordered,
      totalRounds: TOTAL_ROUNDS,
      bagsThrownThisTurn: 0,
      turnScore: 0,
      turnsPlayed: 0,
      totalScores: Object.fromEntries(ordered.map((p) => [p.playerId, 0])),
      currentTurnPlayerId: ordered[0].playerId,
      lastToss: null,
      status: "active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<CornholeState> {
    if (state.status !== "active") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "toss") {
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
      return { ok: false, reason: "invalid_move", message: "That toss is out of range." };
    }

    const result = tossBag(action.angle, action.power);
    const bagsThrownThisTurn = state.bagsThrownThisTurn + 1;
    const turnScore = state.turnScore + result.score;
    const lastToss = { playerId: fromPlayerId, angle: action.angle, power: action.power, path: result.path, score: result.score, label: result.label };

    if (bagsThrownThisTurn < BAGS_PER_TURN) {
      return { ok: true, nextState: { ...state, bagsThrownThisTurn, turnScore, lastToss } };
    }

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
          bagsThrownThisTurn: 0,
          turnScore: 0,
          turnsPlayed,
          totalScores,
          lastToss,
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
        bagsThrownThisTurn: 0,
        turnScore: 0,
        turnsPlayed,
        totalScores,
        lastToss,
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
    return pickCornholeToss(botPlayerId, difficulty);
  },
};
