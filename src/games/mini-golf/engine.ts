import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { velocityFromAimPower } from "@/games/core/physics";
import { simulatePutt } from "./physics";
import { COURSES } from "./courses";
import {
  BALL_RADIUS,
  COURSE_HEIGHT,
  COURSE_WIDTH,
  DT,
  FRICTION_PER_SECOND,
  HOLE_RADIUS,
  MAX_SHOT_SPEED,
  MAX_STEPS,
  MAX_STROKES_PER_HOLE,
  MIN_SPEED,
  WALL_RESTITUTION,
} from "./constants";
import { pickMiniGolfPutt } from "./bot";
import type { MiniGolfBall, MiniGolfState, MiniGolfAction } from "./types";

function nextActiveIndex(balls: MiniGolfBall[], fromIndex: number): number {
  for (let step = 1; step <= balls.length; step++) {
    const index = (fromIndex + step) % balls.length;
    if (!balls[index].holedOut) return index;
  }
  return fromIndex;
}

function ballsForHole(playerIds: string[], holeIndex: number): MiniGolfBall[] {
  const course = COURSES[holeIndex];
  return playerIds.map((playerId) => ({
    playerId,
    x: course.start.x,
    y: course.start.y,
    strokes: 0,
    holedOut: false,
  }));
}

export const miniGolfEngine: GameEngine<MiniGolfState, MiniGolfAction> = {
  gameId: "mini-golf",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const playerIds = ordered.map((p) => p.playerId);
    return {
      players: ordered,
      holeIndex: 0,
      holeCount: COURSES.length,
      balls: ballsForHole(playerIds, 0),
      totalStrokes: Object.fromEntries(playerIds.map((id) => [id, 0])),
      currentTurnPlayerId: playerIds[0],
      lastShot: null,
      status: "playing",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<MiniGolfState> {
    if (state.status !== "playing") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "putt") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }
    if (
      !Number.isFinite(action.angle) ||
      !Number.isFinite(action.power) ||
      action.power < 1 ||
      action.power > 100
    ) {
      return { ok: false, reason: "invalid_move", message: "That putt is out of range." };
    }

    const ballIndex = state.balls.findIndex((b) => b.playerId === fromPlayerId);
    const ball = state.balls[ballIndex];
    const course = COURSES[state.holeIndex];
    const velocity = velocityFromAimPower(action.angle, action.power, MAX_SHOT_SPEED);

    const sim = simulatePutt({
      start: { x: ball.x, y: ball.y },
      velocity,
      obstacles: course.obstacles,
      hole: course.hole,
      holeRadius: HOLE_RADIUS,
      ballRadius: BALL_RADIUS,
      bounds: { width: COURSE_WIDTH, height: COURSE_HEIGHT },
      frictionPerSecond: FRICTION_PER_SECOND,
      wallRestitution: WALL_RESTITUTION,
      minSpeed: MIN_SPEED,
      dt: DT,
      maxSteps: MAX_STEPS,
    });

    const strokes = ball.strokes + 1;
    const forcedHoleOut = !sim.holedOut && strokes >= MAX_STROKES_PER_HOLE;
    const holedOut = sim.holedOut || forcedHoleOut;

    const updatedBall: MiniGolfBall = {
      ...ball,
      x: sim.finalPosition.x,
      y: sim.finalPosition.y,
      strokes,
      holedOut,
    };
    const balls = state.balls.map((b, i) => (i === ballIndex ? updatedBall : b));

    const totalStrokes = holedOut
      ? { ...state.totalStrokes, [fromPlayerId]: state.totalStrokes[fromPlayerId] + strokes }
      : state.totalStrokes;

    const lastShot = {
      playerId: fromPlayerId,
      angle: action.angle,
      power: action.power,
      path: sim.path,
      holedOut,
      strokesUsed: strokes,
      forcedHoleOut,
    };

    const allHoledOut = balls.every((b) => b.holedOut);

    if (allHoledOut) {
      const isLastHole = state.holeIndex >= state.holeCount - 1;
      if (isLastHole) {
        const scores = state.players.map((p) => totalStrokes[p.playerId]);
        const minScore = Math.min(...scores);
        const leaders = state.players.filter((p) => totalStrokes[p.playerId] === minScore);
        return {
          ok: true,
          nextState: {
            ...state,
            balls,
            totalStrokes,
            lastShot,
            status: "match-ended",
            winnerPlayerId: leaders.length === 1 ? leaders[0].playerId : null,
            isDraw: leaders.length > 1,
          },
        };
      }

      const nextHoleIndex = state.holeIndex + 1;
      const playerIds = state.players.map((p) => p.playerId);
      return {
        ok: true,
        nextState: {
          ...state,
          holeIndex: nextHoleIndex,
          balls: ballsForHole(playerIds, nextHoleIndex),
          totalStrokes,
          currentTurnPlayerId: playerIds[0],
          lastShot,
        },
      };
    }

    const nextIndex = nextActiveIndex(balls, ballIndex);
    return {
      ok: true,
      nextState: {
        ...state,
        balls,
        totalStrokes,
        currentTurnPlayerId: balls[nextIndex].playerId,
        lastShot,
      },
    };
  },

  checkOutcome(state) {
    if (state.status !== "match-ended") return { status: "active" };
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    return { status: "draw" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickMiniGolfPutt(state, botPlayerId, difficulty);
  },
};
