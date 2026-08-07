import type { ProjectileType } from "./types";

export interface ProjectileConfig {
  label: string;
  description: string;
  powerMultiplier: number;
  maxBounces: number;
  restitution: number;
  /** Impact offsets from the primary impact x (0 for a single explosion), each with its own radius/damage. */
  fragments: { offsetX: number; radius: number; damage: number }[];
  smoke?: { radius: number; turns: number };
}

export const PROJECTILE_CONFIG: Record<ProjectileType, ProjectileConfig> = {
  standard: {
    label: "Standard Shell",
    description: "A reliable, medium-damage explosion.",
    powerMultiplier: 1,
    maxBounces: 0,
    restitution: 0,
    fragments: [{ offsetX: 0, radius: 50, damage: 34 }],
  },
  split: {
    label: "Split Shell",
    description: "Bursts into three smaller explosions on impact.",
    powerMultiplier: 1,
    maxBounces: 0,
    restitution: 0,
    fragments: [
      { offsetX: -45, radius: 35, damage: 20 },
      { offsetX: 0, radius: 35, damage: 20 },
      { offsetX: 45, radius: 35, damage: 20 },
    ],
  },
  heavy: {
    label: "Heavy Shell",
    description: "Slower and harder-hitting, with a wider blast.",
    powerMultiplier: 0.75,
    maxBounces: 0,
    restitution: 0,
    fragments: [{ offsetX: 0, radius: 70, damage: 50 }],
  },
  bounce: {
    label: "Bounce Shell",
    description: "Skips off the terrain before it detonates.",
    powerMultiplier: 1,
    maxBounces: 2,
    restitution: 0.55,
    fragments: [{ offsetX: 0, radius: 45, damage: 28 }],
  },
  smoke: {
    label: "Smoke Shell",
    description: "Barely scratches, but blankets the area in smoke for a few turns.",
    powerMultiplier: 1,
    maxBounces: 0,
    restitution: 0,
    fragments: [{ offsetX: 0, radius: 30, damage: 8 }],
    smoke: { radius: 80, turns: 3 },
  },
};
