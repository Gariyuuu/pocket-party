import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { createSeededRng } from "@/games/core/rng";
import { simulateProjectile, velocityFromAimPower, windForShot } from "@/games/core/physics";
import {
  CAPTURE_RADIUS,
  CUP_DISTANCES,
  DT,
  GRAVITY,
  MAX_BOUNCES,
  MAX_SHOT_SPEED,
  MAX_STEPS,
  MAX_TURNS_BEFORE_DRAW,
  MAX_WIND,
  RESTITUTION,
  SHOOTER_X,
  SHOOTER_Y,
  TABLE_GROUND_Y,
} from "./constants";
import { pickBounceCupShot } from "./bot";
import type { BounceCupAction, BounceCupState, Cup } from "./types";

export function shotSeed(seed: string, moveCount: number): string {
  return `${seed}:shot:${moveCount}`;
}

export const bounceCupEngine: GameEngine<BounceCupState, BounceCupAction> = {
  gameId: "bounce-cup",

  createInitialState({ seed, players, modifiers }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const cups: Cup[] = CUP_DISTANCES.map((distance, id) => ({
      id,
      x: SHOOTER_X + distance,
      cleared: false,
    }));

    return {
      players: ordered,
      seed,
      windEnabled: modifiers.windEnabled === true,
      cups,
      currentTurnPlayerId: ordered[0].playerId,
      moveCount: 0,
      lastShot: null,
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<BounceCupState> {
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

    const rng = createSeededRng(shotSeed(state.seed, state.moveCount));
    const wind = state.windEnabled ? windForShot(rng, MAX_WIND) : 0;
    const velocity = velocityFromAimPower(action.angle, action.power, MAX_SHOT_SPEED);

    const result = simulateProjectile({
      start: { x: SHOOTER_X, y: SHOOTER_Y },
      velocity,
      gravity: GRAVITY,
      wind,
      dt: DT,
      maxSteps: MAX_STEPS,
      groundHeightAt: () => TABLE_GROUND_Y,
      restitution: RESTITUTION,
      maxBounces: MAX_BOUNCES,
    });

    const hitCup = state.cups.find(
      (cup) => !cup.cleared && Math.abs(result.finalPosition.x - cup.x) <= CAPTURE_RADIUS,
    );

    const cups = hitCup
      ? state.cups.map((cup) => (cup.id === hitCup.id ? { ...cup, cleared: true } : cup))
      : state.cups;

    const remainingCups = cups.filter((c) => !c.cleared).length;
    const winnerPlayerId = hitCup && remainingCups === 0 ? fromPlayerId : null;
    const nextPlayer = state.players.find((p) => p.playerId !== fromPlayerId)!;
    const moveCount = state.moveCount + 1;

    return {
      ok: true,
      nextState: {
        ...state,
        cups,
        moveCount,
        lastShot: {
          playerId: fromPlayerId,
          angle: action.angle,
          power: action.power,
          wind,
          path: result.path,
          hitCupId: hitCup?.id ?? null,
        },
        winnerPlayerId,
        isDraw: !winnerPlayerId && moveCount >= MAX_TURNS_BEFORE_DRAW,
        currentTurnPlayerId: winnerPlayerId ? state.currentTurnPlayerId : nextPlayer.playerId,
      },
    };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    if (state.isDraw) return { status: "draw" };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickBounceCupShot(state, difficulty);
  },
};
