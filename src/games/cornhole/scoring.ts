import { simulateProjectile, velocityFromAimPower, type Vec2 } from "@/games/core/physics";
import {
  BOARD_END_X,
  BOARD_START_X,
  BOARD_SURFACE_Y,
  DT,
  GRAVITY,
  GROUND_Y,
  HOLE_END_X,
  HOLE_START_X,
  MAX_SHOT_SPEED,
  MAX_STEPS,
  SHOOTER_X,
  SHOOTER_Y,
} from "./constants";

export interface CornholeTossResult {
  path: Vec2[];
  score: number;
  label: string | null;
}

function groundHeightAt(x: number): number {
  if (x >= BOARD_START_X && x <= BOARD_END_X) {
    if (x >= HOLE_START_X && x <= HOLE_END_X) return GROUND_Y; // the hole — the bag falls through to true ground level
    return BOARD_SURFACE_Y; // the solid board surface
  }
  return GROUND_Y + 10_000; // off the board entirely — never registers a landing, simulation just runs out of steps (a clean miss)
}

/**
 * A beanbag toss reuses the shared no-bounce arc simulator (a bag doesn't
 * bounce the way a ball does, so the default zero-restitution behavior is
 * already the right physical model, not a simplification chosen for this
 * game specifically). Scoring is read off wherever the simulation actually
 * stopped: the hole's own floor (in the hole), the board surface elsewhere
 * on the board (on the board), or nowhere at all (missed).
 */
export function tossBag(angle: number, power: number): CornholeTossResult {
  const result = simulateProjectile({
    start: { x: SHOOTER_X, y: SHOOTER_Y },
    velocity: velocityFromAimPower(angle, power, MAX_SHOT_SPEED),
    gravity: GRAVITY,
    wind: 0,
    dt: DT,
    maxSteps: MAX_STEPS,
    groundHeightAt,
  });

  const { x, y } = result.finalPosition;
  if (x >= HOLE_START_X && x <= HOLE_END_X && Math.abs(y - GROUND_Y) < 2) {
    return { path: result.path, score: 3, label: "In the hole!" };
  }
  if (x >= BOARD_START_X && x <= BOARD_END_X && Math.abs(y - BOARD_SURFACE_Y) < 2) {
    return { path: result.path, score: 1, label: "On the board" };
  }
  return { path: result.path, score: 0, label: null };
}
