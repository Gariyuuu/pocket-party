import { simulateProjectile, velocityFromAimPower, type Vec2 } from "@/games/core/physics";
import { CANVAS_HEIGHT, DT, GRAVITY, MAX_SHOT_SPEED, MAX_STEPS, RINGS, SHOOTER_X, SHOOTER_Y, TARGET_X, TARGET_Y } from "./constants";

export interface DartThrowResult {
  path: Vec2[];
  score: number;
  ringLabel: string | null;
}

/**
 * A dart flies as a normal gravity arc (reusing the shared arc simulator
 * every other physics game uses) until it either crosses the board's
 * x-plane (scored, by vertical distance from center) or falls short —
 * hits the "ground" below the board's height without ever reaching it,
 * which misses entirely. There's no separate ground plane to bounce off;
 * "falling short" is detected the same way a miss on an unreachable target
 * would be — the simulator simply runs out of steps or drops well past the
 * target's height without crossing TARGET_X.
 */
export function throwDart(angle: number, power: number): DartThrowResult {
  const result = simulateProjectile({
    start: { x: SHOOTER_X, y: SHOOTER_Y },
    velocity: velocityFromAimPower(angle, power, MAX_SHOT_SPEED),
    gravity: GRAVITY,
    wind: 0,
    dt: DT,
    maxSteps: MAX_STEPS,
    groundHeightAt: () => CANVAS_HEIGHT + 40, // well below the visible board — only a genuinely short throw ever reaches it
    onStep: (position) => {
      if (position.x >= TARGET_X) return "stop";
    },
  });

  if (!result.stoppedEarly) {
    return { path: result.path, score: 0, ringLabel: null };
  }

  const distance = Math.abs(result.finalPosition.y - TARGET_Y);
  for (const ring of RINGS) {
    if (distance <= ring.radius) {
      return { path: result.path, score: ring.score, ringLabel: ring.label };
    }
  }
  return { path: result.path, score: 0, ringLabel: null };
}
