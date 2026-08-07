import { simulateProjectile, velocityFromAimPower } from "@/games/core/physics";
import {
  DT,
  GRAVITY,
  MAX_BOUNCES,
  MAX_SHOT_SPEED,
  MAX_STEPS,
  RESTITUTION,
  SHOOTER_X,
  SHOOTER_Y,
  TABLE_GROUND_Y,
} from "./constants";
import type { BounceCupAction, BounceCupState } from "./types";

const NOISE_BY_DIFFICULTY = { easy: 14, medium: 6, hard: 2 } as const;

function simulateLanding(angle: number, power: number): number {
  const velocity = velocityFromAimPower(angle, power, MAX_SHOT_SPEED);
  const result = simulateProjectile({
    start: { x: SHOOTER_X, y: SHOOTER_Y },
    velocity,
    gravity: GRAVITY,
    wind: 0,
    dt: DT,
    maxSteps: MAX_STEPS,
    groundHeightAt: () => TABLE_GROUND_Y,
    restitution: RESTITUTION,
    maxBounces: MAX_BOUNCES,
  });
  return result.finalPosition.x;
}

/** Numerically searches for the (angle, power) pair landing closest to the target x, then adds difficulty noise. */
export function pickBounceCupShot(
  state: BounceCupState,
  difficulty: "easy" | "medium" | "hard",
): BounceCupAction {
  const remaining = state.cups.filter((c) => !c.cleared);
  const target = remaining[Math.floor(Math.random() * remaining.length)] ?? state.cups[0];

  let best = { angle: 45, power: 60, error: Infinity };
  for (let angle = 15; angle <= 80; angle += 5) {
    for (let power = 20; power <= 100; power += 5) {
      const landingX = simulateLanding(angle, power);
      const error = Math.abs(landingX - target.x);
      if (error < best.error) best = { angle, power, error };
    }
  }

  const noise = NOISE_BY_DIFFICULTY[difficulty];
  const angle = Math.min(85, Math.max(5, best.angle + (Math.random() * 2 - 1) * noise));
  const power = Math.min(100, Math.max(1, best.power + (Math.random() * 2 - 1) * noise));

  return { type: "shoot", angle, power };
}
