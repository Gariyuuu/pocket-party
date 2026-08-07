import { velocityFromAimPower } from "@/games/core/physics";
import { simulateShot, type Ball2D } from "./physics";
import { BALL_RADIUS, COMET_BALL_ID, CUE_BALL_ID, DT, MAX_SHOT_SPEED, MAX_STEPS, POCKETS, TABLE_HEIGHT, TABLE_WIDTH } from "./constants";
import type { PocketShotsAction, PocketShotsBall, PocketShotsState } from "./types";

const NOISE_BY_DIFFICULTY = { easy: 10, medium: 4, hard: 1 } as const;
const POWER_CANDIDATES = [40, 55, 70, 85, 100];

function toBall2D(ball: PocketShotsBall): Ball2D {
  return { id: ball.id, x: ball.x, y: ball.y, vx: 0, vy: 0, radius: BALL_RADIUS, pocketed: ball.pocketed };
}

function ghostBallAimAngle(cue: { x: number; y: number }, target: { x: number; y: number }, pocket: { x: number; y: number }) {
  const dx = target.x - pocket.x;
  const dy = target.y - pocket.y;
  const mag = Math.hypot(dx, dy) || 1;
  const aimPoint = { x: target.x + (dx / mag) * BALL_RADIUS * 2, y: target.y + (dy / mag) * BALL_RADIUS * 2 };
  const ddx = aimPoint.x - cue.x;
  const ddy = aimPoint.y - cue.y;
  return (Math.atan2(-ddy, ddx) * 180) / Math.PI;
}

export function pickPocketShotsShot(
  state: PocketShotsState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): PocketShotsAction {
  const cueBall = state.balls.find((b) => b.id === CUE_BALL_ID)!;
  const assignment = state.assignments[botPlayerId];

  const targets = state.balls.filter((b) => {
    if (b.pocketed || b.id === CUE_BALL_ID) return false;
    if (assignment === null) return b.id !== COMET_BALL_ID;
    const ownRemaining = state.balls.some((o) => !o.pocketed && o.group === assignment);
    return ownRemaining ? b.group === assignment : b.id === COMET_BALL_ID;
  });

  let best: { angle: number; power: number; pocketed: boolean; error: number } = {
    angle: 0,
    power: 70,
    pocketed: false,
    error: Infinity,
  };

  for (const target of targets) {
    for (const pocket of POCKETS) {
      const angle = ghostBallAimAngle(cueBall, target, pocket);
      for (const power of POWER_CANDIDATES) {
        const velocity = velocityFromAimPower(angle, power, MAX_SHOT_SPEED);
        const simInput = state.balls.map((b) =>
          b.id === CUE_BALL_ID ? { ...toBall2D(b), vx: velocity.x, vy: velocity.y } : toBall2D(b),
        );
        const sim = simulateShot(simInput, { width: TABLE_WIDTH, height: TABLE_HEIGHT }, POCKETS, DT, MAX_STEPS);
        const pocketed = sim.pocketedIds.includes(target.id) && !sim.pocketedIds.includes(CUE_BALL_ID);
        const finalTarget = sim.balls.find((b) => b.id === target.id)!;
        const error = pocketed ? 0 : Math.hypot(finalTarget.x - pocket.x, finalTarget.y - pocket.y);

        if (pocketed || error < best.error) {
          best = { angle, power, pocketed, error };
          if (pocketed && difficulty === "hard") break;
        }
      }
      if (best.pocketed && difficulty === "hard") break;
    }
    if (best.pocketed && difficulty !== "easy") break;
  }

  const noise = NOISE_BY_DIFFICULTY[difficulty];
  const angle = best.angle + (Math.random() * 2 - 1) * noise;
  const power = Math.min(100, Math.max(1, best.power + (Math.random() * 2 - 1) * noise));

  return { type: "shoot", angle, power };
}
