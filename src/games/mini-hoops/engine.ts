import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { createSeededRng } from "@/games/core/rng";
import { simulateProjectile, velocityFromAimPower, windForShot } from "@/games/core/physics";
import {
  DT,
  GRAVITY,
  GROUND_Y,
  HOOP_RADIUS,
  HOOP_Y,
  MAX_SHOT_SPEED,
  MAX_STEPS,
  MAX_WIND,
  SHOOTER_X,
  SHOOTER_Y,
  SHOTS_PER_PLAYER,
  hoopXForShot,
} from "./constants";
import { pickMiniHoopsShot } from "./bot";
import type { MiniHoopsAction, MiniHoopsState } from "./types";

export function shotSeed(seed: string, shotIndex: number): string {
  return `${seed}:hoops-shot:${shotIndex}`;
}

export const miniHoopsEngine: GameEngine<MiniHoopsState, MiniHoopsAction> = {
  gameId: "mini-hoops",

  createInitialState({ seed, players, modifiers }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    return {
      players: ordered,
      seed,
      windEnabled: modifiers.windEnabled === true,
      shotsPerPlayer: SHOTS_PER_PLAYER,
      shotIndex: 0,
      makesByPlayer: Object.fromEntries(ordered.map((p) => [p.playerId, 0])),
      currentTurnPlayerId: ordered[0].playerId,
      lastShot: null,
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<MiniHoopsState> {
    if (state.winnerPlayerId || state.isDraw) {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "shoot") {
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
      return { ok: false, reason: "invalid_move", message: "That shot is out of range." };
    }

    const rng = createSeededRng(shotSeed(state.seed, state.shotIndex));
    const wind = state.windEnabled ? windForShot(rng, MAX_WIND) : 0;
    const hoopX = hoopXForShot(state.shotIndex);
    const velocity = velocityFromAimPower(action.angle, action.power, MAX_SHOT_SPEED);

    let made = false;
    const result = simulateProjectile({
      start: { x: SHOOTER_X, y: SHOOTER_Y },
      velocity,
      gravity: GRAVITY,
      wind,
      dt: DT,
      maxSteps: MAX_STEPS,
      groundHeightAt: () => GROUND_Y,
      onStep: (position, velocityNow) => {
        const descending = velocityNow.y > 0;
        const nearHoop = Math.abs(position.x - hoopX) <= HOOP_RADIUS && Math.abs(position.y - HOOP_Y) <= HOOP_RADIUS;
        if (descending && nearHoop) {
          made = true;
          return "stop";
        }
      },
    });

    const makesByPlayer = made
      ? { ...state.makesByPlayer, [fromPlayerId]: (state.makesByPlayer[fromPlayerId] ?? 0) + 1 }
      : state.makesByPlayer;

    const shotIndex = state.shotIndex + 1;
    const totalShots = state.shotsPerPlayer * state.players.length;
    const nextPlayer = state.players[shotIndex % state.players.length];

    let winnerPlayerId: string | null = null;
    let isDraw = false;
    if (shotIndex >= totalShots) {
      const scores = state.players.map((p) => makesByPlayer[p.playerId] ?? 0);
      const maxScore = Math.max(...scores);
      const leaders = state.players.filter((p) => (makesByPlayer[p.playerId] ?? 0) === maxScore);
      if (leaders.length === 1) winnerPlayerId = leaders[0].playerId;
      else isDraw = true;
    }

    return {
      ok: true,
      nextState: {
        ...state,
        shotIndex,
        makesByPlayer,
        lastShot: { playerId: fromPlayerId, angle: action.angle, power: action.power, wind, path: result.path, hoopX, made },
        winnerPlayerId,
        isDraw,
        currentTurnPlayerId: winnerPlayerId || isDraw ? state.currentTurnPlayerId : nextPlayer.playerId,
      },
    };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    if (state.isDraw) return { status: "draw" };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickMiniHoopsShot(state, difficulty);
  },
};
