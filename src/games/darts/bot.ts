import { throwDart } from "./scoring";
import type { DartsAction } from "./types";

const NOISE_BY_DIFFICULTY = { easy: 10, medium: 4, hard: 1 } as const;
const ANGLE_CANDIDATES = Array.from({ length: 17 }, (_, i) => 10 + i * 5); // 10..90 in 5° steps
const POWER_CANDIDATES = [40, 50, 60, 70, 80, 90, 100];

/** The target never moves, so this doesn't need to look at match state — just find the best angle/power, then add difficulty-scaled noise. */
export function pickDartsThrow(_botPlayerId: string, difficulty: "easy" | "medium" | "hard"): DartsAction {
  let best = { angle: 45, power: 70, score: -1 };
  for (const angle of ANGLE_CANDIDATES) {
    for (const power of POWER_CANDIDATES) {
      const result = throwDart(angle, power);
      if (result.score > best.score) {
        best = { angle, power, score: result.score };
        if (best.score === 50 && difficulty === "hard") break;
      }
    }
    if (best.score === 50 && difficulty === "hard") break;
  }

  const noise = NOISE_BY_DIFFICULTY[difficulty];
  const angle = best.angle + (Math.random() * 2 - 1) * noise;
  const power = Math.min(100, Math.max(1, best.power + (Math.random() * 2 - 1) * noise));
  return { type: "throw", angle, power };
}
