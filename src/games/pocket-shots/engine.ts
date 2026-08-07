import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { velocityFromAimPower } from "@/games/core/physics";
import { simulateShot, firstCueContact, type Ball2D } from "./physics";
import { createRack } from "./rack";
import {
  BALL_RADIUS,
  CUE_BALL_ID,
  COMET_BALL_ID,
  DT,
  MAX_SHOT_SPEED,
  MAX_STEPS,
  POCKETS,
  TABLE_HEIGHT,
  TABLE_WIDTH,
} from "./constants";
import { pickPocketShotsShot } from "./bot";
import type { Assignment, PocketShotsAction, PocketShotsBall, PocketShotsState } from "./types";

const CUE_RESPAWN = { x: TABLE_WIDTH * 0.22, y: TABLE_HEIGHT / 2 };
const MAX_TURNS_BEFORE_DRAW = 60;

function toBall2D(ball: PocketShotsBall): Ball2D {
  return { id: ball.id, x: ball.x, y: ball.y, vx: 0, vy: 0, radius: BALL_RADIUS, pocketed: ball.pocketed };
}

export const pocketShotsEngine: GameEngine<PocketShotsState, PocketShotsAction> = {
  gameId: "pocket-shots",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    return {
      players: ordered,
      balls: createRack(),
      assignments: Object.fromEntries(ordered.map((p) => [p.playerId, null])) as Record<string, Assignment>,
      currentTurnPlayerId: ordered[0].playerId,
      turnCount: 0,
      lastShot: null,
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<PocketShotsState> {
    if (state.winnerPlayerId || state.isDraw) {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "shoot") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }
    if (!Number.isFinite(action.angle) || !Number.isFinite(action.power) || action.power < 1 || action.power > 100) {
      return { ok: false, reason: "invalid_move", message: "That shot is out of range." };
    }

    const cueBall = state.balls.find((b) => b.id === CUE_BALL_ID)!;
    if (cueBall.pocketed) {
      return { ok: false, reason: "invalid_move", message: "The cue ball needs to be respawned first." };
    }

    const velocity = velocityAsTopDown(action.angle, action.power);
    const simInput: Ball2D[] = state.balls.map((b) =>
      b.id === CUE_BALL_ID ? { ...toBall2D(b), vx: velocity.x, vy: velocity.y } : toBall2D(b),
    );

    const sim = simulateShot(simInput, { width: TABLE_WIDTH, height: TABLE_HEIGHT }, POCKETS, DT, MAX_STEPS);
    const firstHit = firstCueContact(sim.collisions, CUE_BALL_ID);

    let assignments = state.assignments;
    const opponent = state.players.find((p) => p.playerId !== fromPlayerId)!;
    const shooterAssignment = assignments[fromPlayerId];

    // Open table: the first non-comet, non-cue ball a player legally pockets assigns their group.
    if (shooterAssignment === null) {
      const pocketedGroups = sim.pocketedIds
        .map((id) => state.balls.find((b) => b.id === id)?.group)
        .filter((g): g is "orb" | "ring" => g === "orb" || g === "ring");
      if (pocketedGroups.length > 0) {
        const claimed = pocketedGroups[0];
        assignments = {
          ...assignments,
          [fromPlayerId]: claimed,
          [opponent.playerId]: claimed === "orb" ? "ring" : "orb",
        };
      }
    }

    const scratched = sim.pocketedIds.includes(CUE_BALL_ID);
    const noContact = firstHit === null;
    const currentShooterGroup = assignments[fromPlayerId];
    const hitOpponentGroupFirst =
      currentShooterGroup !== null &&
      firstHit !== null &&
      firstHit !== COMET_BALL_ID &&
      state.balls.find((b) => b.id === firstHit)?.group === (currentShooterGroup === "orb" ? "ring" : "orb");

    let foul: string | null = null;
    if (scratched) foul = "Scratch — the cue ball was pocketed.";
    else if (noContact) foul = "Foul — the cue ball didn't touch anything.";
    else if (hitOpponentGroupFirst) foul = "Foul — hit the opponent's ball first.";

    const cometPocketed = sim.pocketedIds.includes(COMET_BALL_ID);
    let winnerPlayerId: string | null = null;

    if (cometPocketed) {
      const remainingOwnBalls = sim.balls.filter(
        (b) => !b.pocketed && b.id !== CUE_BALL_ID && b.id !== COMET_BALL_ID && findGroup(state.balls, b.id) === currentShooterGroup,
      );
      const wonLegally = currentShooterGroup !== null && remainingOwnBalls.length === 0 && !scratched;
      winnerPlayerId = wonLegally ? fromPlayerId : opponent.playerId;
    }

    const balls: PocketShotsBall[] = state.balls.map((original) => {
      const simmed = sim.balls.find((b) => b.id === original.id)!;
      if (original.id === CUE_BALL_ID && scratched) {
        return { ...original, x: CUE_RESPAWN.x, y: CUE_RESPAWN.y, pocketed: false };
      }
      return { ...original, x: simmed.x, y: simmed.y, pocketed: simmed.pocketed };
    });

    const pocketedOwnBallLegally =
      !foul &&
      !cometPocketed &&
      sim.pocketedIds.some((id) => {
        const group = state.balls.find((b) => b.id === id)?.group;
        return group === "orb" || group === "ring";
      });

    const turnCount = state.turnCount + 1;
    const shouldPassTurn = winnerPlayerId !== null ? false : !pocketedOwnBallLegally;

    return {
      ok: true,
      nextState: {
        ...state,
        balls,
        assignments,
        turnCount,
        lastShot: {
          playerId: fromPlayerId,
          angle: action.angle,
          power: action.power,
          paths: sim.paths,
          pocketedIds: sim.pocketedIds,
          foul,
        },
        winnerPlayerId,
        isDraw: !winnerPlayerId && turnCount >= MAX_TURNS_BEFORE_DRAW,
        currentTurnPlayerId: winnerPlayerId ? state.currentTurnPlayerId : shouldPassTurn ? opponent.playerId : fromPlayerId,
      },
    };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    if (state.isDraw) return { status: "draw" };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickPocketShotsShot(state, botPlayerId, difficulty);
  },
};

function findGroup(balls: PocketShotsBall[], id: string) {
  return balls.find((b) => b.id === id)?.group ?? null;
}

/**
 * Billiards shots aim in a full circle, not just up-and-right like the arc
 * games — 0° = toward +x, 90° = toward -y (up on the table), same compass
 * convention velocityFromAimPower already uses, just with no gravity to
 * care about the sign of.
 */
function velocityAsTopDown(angleDeg: number, power: number) {
  return velocityFromAimPower(angleDeg, power, MAX_SHOT_SPEED);
}
