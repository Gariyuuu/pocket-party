import { simulateProjectile, velocityFromAimPower } from "@/games/core/physics";
import { terrainHeightAt } from "./terrain";
import { PROJECTILE_CONFIG } from "./projectiles";
import { DT, GRAVITY, MAX_SHOT_SPEED, MAX_STEPS } from "./constants";
import type { TankTacticsAction, TankTacticsState } from "./types";

const NOISE_BY_DIFFICULTY = { easy: 10, medium: 4, hard: 1 } as const;

function landingX(
  angle: number,
  power: number,
  startX: number,
  startY: number,
  terrainHeights: number[],
  powerMultiplier: number,
): number {
  const velocity = velocityFromAimPower(angle, power, MAX_SHOT_SPEED * powerMultiplier);
  const result = simulateProjectile({
    start: { x: startX, y: startY - 10 },
    velocity,
    gravity: GRAVITY,
    wind: 0,
    dt: DT,
    maxSteps: MAX_STEPS,
    groundHeightAt: (x) => terrainHeightAt(terrainHeights, x),
  });
  return result.finalPosition.x;
}

export function pickTankTacticsAction(
  state: TankTacticsState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): TankTacticsAction {
  const self = state.tanks.find((t) => t.playerId === botPlayerId)!;
  const opponents = state.tanks.filter((t) => t.alive && t.playerId !== botPlayerId);
  const target = opponents.reduce((closest, t) =>
    Math.abs(t.x - self.x) < Math.abs(closest.x - self.x) ? t : closest,
  );

  const projectileType = difficulty === "hard" && target.health <= 50 ? "heavy" : "standard";
  const config = PROJECTILE_CONFIG[projectileType];
  const startY = terrainHeightAt(state.terrainHeights, self.x);

  let best = { angle: 45, power: 60, error: Infinity };
  for (let angle = 10; angle <= 170; angle += 5) {
    for (let power = 20; power <= 100; power += 5) {
      const x = landingX(angle, power, self.x, startY, state.terrainHeights, config.powerMultiplier);
      const error = Math.abs(x - target.x);
      if (error < best.error) best = { angle, power, error };
    }
  }

  const noise = NOISE_BY_DIFFICULTY[difficulty];
  const angle = Math.min(179, Math.max(1, best.angle + (Math.random() * 2 - 1) * noise));
  const power = Math.min(100, Math.max(1, best.power + (Math.random() * 2 - 1) * noise));

  return { type: "fire", angle, power, projectileType, now: Date.now() };
}
