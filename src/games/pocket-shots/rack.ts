import { BALL_RADIUS, COMET_BALL_ID, CUE_BALL_ID, TABLE_HEIGHT, TABLE_WIDTH } from "./constants";
import type { PocketShotsBall } from "./types";

/** A hexagonal cluster — Comet in the center, three Orbs and three Rings alternating around it. */
export function createRack(): PocketShotsBall[] {
  const centerX = TABLE_WIDTH * 0.72;
  const centerY = TABLE_HEIGHT / 2;
  const ringDistance = BALL_RADIUS * 2 + 2;

  const balls: PocketShotsBall[] = [
    { id: CUE_BALL_ID, group: "cue", x: TABLE_WIDTH * 0.22, y: centerY, pocketed: false },
    { id: COMET_BALL_ID, group: "comet", x: centerX, y: centerY, pocketed: false },
  ];

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const group = i % 2 === 0 ? "orb" : "ring";
    balls.push({
      id: `${group}-${Math.floor(i / 2)}`,
      group,
      x: centerX + Math.cos(angle) * ringDistance,
      y: centerY + Math.sin(angle) * ringDistance,
      pocketed: false,
    });
  }

  return balls;
}
