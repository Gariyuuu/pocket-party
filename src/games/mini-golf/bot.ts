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
  MIN_SPEED,
  WALL_RESTITUTION,
} from "./constants";
import type { MiniGolfAction, MiniGolfState } from "./types";

const NOISE_BY_DIFFICULTY = { easy: 12, medium: 5, hard: 1.5 } as const;
const ANGLE_CANDIDATES = Array.from({ length: 37 }, (_, i) => i * 10 - 180); // -180..180 in 10° steps
const POWER_CANDIDATES = [30, 45, 60, 75, 90, 100];

export function pickMiniGolfPutt(
  state: MiniGolfState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): MiniGolfAction {
  const ball = state.balls.find((b) => b.playerId === botPlayerId)!;
  const course = COURSES[state.holeIndex];

  let best = { angle: 0, power: 60, holedOut: false, error: Infinity };

  for (const angle of ANGLE_CANDIDATES) {
    for (const power of POWER_CANDIDATES) {
      const velocity = velocityFromAimPower(angle, power, MAX_SHOT_SPEED);
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
      const error = sim.holedOut
        ? 0
        : Math.hypot(sim.finalPosition.x - course.hole.x, sim.finalPosition.y - course.hole.y);

      if (error < best.error) {
        best = { angle, power, holedOut: sim.holedOut, error };
        if (best.holedOut && difficulty === "hard") break;
      }
    }
    if (best.holedOut && difficulty !== "easy") break;
  }

  const noise = NOISE_BY_DIFFICULTY[difficulty];
  const angle = best.angle + (Math.random() * 2 - 1) * noise;
  const power = Math.min(100, Math.max(1, best.power + (Math.random() * 2 - 1) * noise));

  return { type: "putt", angle, power };
}
