import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { COUNTDOWN_MS, WIN_SCORE } from "./constants";
import type { OrbHockeyAction, OrbHockeyState } from "./types";

/**
 * Deliberately tracks only the discrete, server-authoritative parts of the
 * match: score, serve/countdown status, and the win condition. The
 * continuous part — paddle and puck motion — is real-time, client-rendered,
 * and synced over Supabase Realtime Broadcast (see board.tsx); it never
 * touches this reducer or Postgres, the same way you wouldn't persist every
 * frame of a live video call. This engine is what makes goals count.
 */
export const orbHockeyEngine: GameEngine<OrbHockeyState, OrbHockeyAction> = {
  gameId: "orb-hockey",

  createInitialState({ players, now }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    return {
      players: ordered,
      scoreByPlayer: Object.fromEntries(ordered.map((p) => [p.playerId, 0])),
      status: "countdown",
      countdownEndsAt: now + COUNTDOWN_MS,
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  // Who's allowed to report a goal is enforced by the caller (only the
  // fixed seat-1/host client — see match-runtime.ts), not by this reducer.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyAction(state, action, fromPlayerId): ActionValidationResult<OrbHockeyState> {
    if (state.winnerPlayerId) {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }

    if (action.type === "start-serve") {
      if (state.status !== "countdown") {
        return { ok: false, reason: "match_not_active", message: "Already live." };
      }
      return { ok: true, nextState: { ...state, status: "live" } };
    }

    if (action.type === "score-goal") {
      if (state.status !== "live") {
        return { ok: false, reason: "match_not_active", message: "No goal can be scored right now." };
      }
      if (!state.scoreByPlayer[action.scoringPlayerId] && state.scoreByPlayer[action.scoringPlayerId] !== 0) {
        return { ok: false, reason: "invalid_move", message: "Unknown scoring player." };
      }

      const scoreByPlayer = {
        ...state.scoreByPlayer,
        [action.scoringPlayerId]: state.scoreByPlayer[action.scoringPlayerId] + 1,
      };
      const won = scoreByPlayer[action.scoringPlayerId] >= WIN_SCORE;

      return {
        ok: true,
        nextState: {
          ...state,
          scoreByPlayer,
          status: won ? "completed" : "countdown",
          countdownEndsAt: action.now + COUNTDOWN_MS,
          winnerPlayerId: won ? action.scoringPlayerId : null,
        },
      };
    }

    return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    return { status: "active" };
  },
};
