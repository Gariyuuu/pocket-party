import { simulateProjectile, velocityFromAimPower } from "@/games/core/physics";
import { DT, GRAVITY, GROUND_Y, HOOP_Y, MAX_SHOT_SPEED, MAX_STEPS, SHOOTER_X, SHOOTER_Y, hoopXForShot } from "./constants";
import type { MiniHoopsAction, MiniHoopsState } from "./types";

const NOISE_BY_DIFFICULTY = { easy: 12, medium: 5, hard: 1.5 } as const;

function closestApproach(angle: number, power: number, hoopX: number): number {
  const velocity = velocityFromAimPower(angle, power, MAX_SHOT_SPEED);
  let best = Infinity;
  simulateProjectile({
    start: { x: SHOOTER_X, y: SHOOTER_Y },
    velocity,
    gravity: GRAVITY,
    wind: 0,
    dt: DT,
    maxSteps: MAX_STEPS,
    groundHeightAt: () => GROUND_Y,
    onStep: (position, velocityNow) => {
      if (velocityNow.y > 0) {
        const dist = Math.hypot(position.x - hoopX, position.y - HOOP_Y);
        if (dist < best) best = dist;
      }
    },
  });
  return best;
}

export function pickMiniHoopsShot(
  state: MiniHoopsState,
  difficulty: "easy" | "medium" | "hard",
): MiniHoopsAction {
  const hoopX = hoopXForShot(state.shotIndex);

  let best = { angle: 55, power: 65, error: Infinity };
  for (let angle = 30; angle <= 75; angle += 3) {
    for (let power = 30; power <= 100; power += 3) {
      const error = closestApproach(angle, power, hoopX);
      if (error < best.error) best = { angle, power, error };
    }
  }

  const noise = NOISE_BY_DIFFICULTY[difficulty];
  const angle = Math.min(85, Math.max(5, best.angle + (Math.random() * 2 - 1) * noise));
  const power = Math.min(100, Math.max(1, best.power + (Math.random() * 2 - 1) * noise));

  return { type: "shoot", angle, power };
}
