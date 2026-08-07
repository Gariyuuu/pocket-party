import type { GameEngine, EnginePlayer } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { createSeededRng, pickInt } from "@/games/core/rng";
import { scoreForCategory, totalScore } from "./scoring";
import { pickYahtzeeMove } from "./bot";
import { YAHTZEE_CATEGORIES } from "./types";
import type { YahtzeeAction, YahtzeeState } from "./types";

function rollSeed(seed: string, rollCount: number): string {
  return `${seed}:yahtzee-roll:${rollCount}`;
}

function nextPlayerId(players: EnginePlayer[], currentId: string): string {
  const index = players.findIndex((p) => p.playerId === currentId);
  return players[(index + 1) % players.length].playerId;
}

export const yahtzeeEngine: GameEngine<YahtzeeState, YahtzeeAction> = {
  gameId: "yahtzee",

  createInitialState({ seed, players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const scores: YahtzeeState["scores"] = {};
    for (const p of ordered) scores[p.playerId] = {};
    return {
      players: ordered,
      seed,
      dice: [1, 1, 1, 1, 1],
      heldDice: [false, false, false, false, false],
      rollsUsedThisTurn: 0,
      rollCount: 0,
      currentTurnPlayerId: ordered[0].playerId,
      scores,
      lastEvent: null,
      status: "active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<YahtzeeState> {
    if (state.status !== "active") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }

    if (action.type === "roll") {
      if (state.rollsUsedThisTurn >= 3) {
        return { ok: false, reason: "invalid_move", message: "You've used all 3 rolls this turn." };
      }
      const rng = createSeededRng(rollSeed(state.seed, state.rollCount));
      const dice = state.dice.map((value, i) => (state.heldDice[i] ? value : pickInt(rng, 1, 6)));
      return {
        ok: true,
        nextState: {
          ...state,
          dice,
          rollsUsedThisTurn: state.rollsUsedThisTurn + 1,
          rollCount: state.rollCount + 1,
          lastEvent: { playerId: fromPlayerId, type: "roll" },
        },
      };
    }

    if (action.type === "toggle-hold") {
      if (state.rollsUsedThisTurn === 0) {
        return { ok: false, reason: "invalid_move", message: "Roll first." };
      }
      if (!Number.isInteger(action.die) || action.die < 0 || action.die > 4) {
        return { ok: false, reason: "malformed_payload", message: "Invalid die index." };
      }
      const heldDice = [...state.heldDice];
      heldDice[action.die] = !heldDice[action.die];
      return { ok: true, nextState: { ...state, heldDice } };
    }

    if (action.type === "score") {
      if (state.rollsUsedThisTurn === 0) {
        return { ok: false, reason: "invalid_move", message: "Roll at least once before scoring." };
      }
      if (!YAHTZEE_CATEGORIES.includes(action.category)) {
        return { ok: false, reason: "malformed_payload", message: "Unknown scoring category." };
      }
      if (state.scores[fromPlayerId][action.category] !== undefined) {
        return { ok: false, reason: "invalid_move", message: "You've already used that category." };
      }

      const points = scoreForCategory(state.dice, action.category);
      const scores = {
        ...state.scores,
        [fromPlayerId]: { ...state.scores[fromPlayerId], [action.category]: points },
      };

      const everyoneDone = state.players.every(
        (p) => Object.keys(scores[p.playerId]).length === YAHTZEE_CATEGORIES.length,
      );
      let status: YahtzeeState["status"] = "active";
      let winnerPlayerId: string | null = null;
      let isDraw = false;

      if (everyoneDone) {
        status = "match-ended";
        const totals = state.players.map((p) => ({ id: p.playerId, total: totalScore(scores[p.playerId]) }));
        const maxTotal = Math.max(...totals.map((t) => t.total));
        const leaders = totals.filter((t) => t.total === maxTotal);
        if (leaders.length === 1) winnerPlayerId = leaders[0].id;
        else isDraw = true;
      }

      return {
        ok: true,
        nextState: {
          ...state,
          scores,
          dice: [1, 1, 1, 1, 1],
          heldDice: [false, false, false, false, false],
          rollsUsedThisTurn: 0,
          lastEvent: { playerId: fromPlayerId, type: "score", category: action.category, score: points },
          status,
          winnerPlayerId,
          isDraw,
          currentTurnPlayerId: status === "active" ? nextPlayerId(state.players, fromPlayerId) : state.currentTurnPlayerId,
        },
      };
    }

    return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    if (state.isDraw) return { status: "draw" };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickYahtzeeMove(state, botPlayerId, difficulty);
  },
};
