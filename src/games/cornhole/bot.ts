import { tossBag } from "./scoring";
import type { CornholeAction } from "./types";

const NOISE_BY_DIFFICULTY = { easy: 9, medium: 4, hard: 1.2 } as const;
const ANGLE_CANDIDATES = Array.from({ length: 17 }, (_, i) => 10 + i * 5);
const POWER_CANDIDATES = [50, 60, 65, 70, 75, 80, 90, 100];

export function pickCornholeToss(_botPlayerId: string, difficulty: "easy" | "medium" | "hard"): CornholeAction {
  let best = { angle: 45, power: 70, score: -1 };
  for (const angle of ANGLE_CANDIDATES) {
    for (const power of POWER_CANDIDATES) {
      const result = tossBag(angle, power);
      if (result.score > best.score) {
        best = { angle, power, score: result.score };
        if (best.score === 3 && difficulty === "hard") break;
      }
    }
    if (best.score === 3 && difficulty === "hard") break;
  }

  const noise = NOISE_BY_DIFFICULTY[difficulty];
  const angle = best.angle + (Math.random() * 2 - 1) * noise;
  const power = Math.min(100, Math.max(1, best.power + (Math.random() * 2 - 1) * noise));
  return { type: "toss", angle, power };
}
