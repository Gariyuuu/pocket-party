import type { YahtzeeCategory } from "./types";

const UPPER_CATEGORIES: YahtzeeCategory[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];
export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS = 35;

function countsByValue(dice: number[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0]; // index 0 unused, 1-6 are die faces
  for (const die of dice) counts[die]++;
  return counts;
}

/** Standard Yahtzee scoring for one category against the current dice. Does not consult or mutate any player's used-categories — that's the engine's job. */
export function scoreForCategory(dice: number[], category: YahtzeeCategory): number {
  const counts = countsByValue(dice);
  const sum = dice.reduce((a, b) => a + b, 0);

  switch (category) {
    case "ones":
      return counts[1] * 1;
    case "twos":
      return counts[2] * 2;
    case "threes":
      return counts[3] * 3;
    case "fours":
      return counts[4] * 4;
    case "fives":
      return counts[5] * 5;
    case "sixes":
      return counts[6] * 6;
    case "threeOfKind":
      return counts.some((count) => count >= 3) ? sum : 0;
    case "fourOfKind":
      return counts.some((count) => count >= 4) ? sum : 0;
    case "fullHouse": {
      const nonZero = counts.slice(1).filter((count) => count > 0);
      return nonZero.length === 2 && nonZero.includes(2) && nonZero.includes(3) ? 25 : 0;
    }
    case "smallStraight": {
      const unique = new Set(dice);
      const runs = [
        [1, 2, 3, 4],
        [2, 3, 4, 5],
        [3, 4, 5, 6],
      ];
      return runs.some((run) => run.every((value) => unique.has(value))) ? 30 : 0;
    }
    case "largeStraight": {
      const uniqueSorted = [...new Set(dice)].sort((a, b) => a - b);
      const isConsecutiveRun = uniqueSorted.length === 5 && uniqueSorted.every((v, i) => i === 0 || v === uniqueSorted[i - 1] + 1);
      return isConsecutiveRun ? 40 : 0;
    }
    case "yahtzee":
      return counts.some((count) => count === 5) ? 50 : 0;
    case "chance":
      return sum;
  }
}

export function upperSectionSubtotal(scores: Partial<Record<YahtzeeCategory, number>>): number {
  return UPPER_CATEGORIES.reduce((sum, category) => sum + (scores[category] ?? 0), 0);
}

/**
 * Grand total including the upper-section bonus (+35 for a 63+ upper
 * subtotal). Deliberately does not implement the "multiple Yahtzee" joker
 * bonus (an extra 100 points for rolling a 2nd-or-later Yahtzee after
 * already scoring the Yahtzee category) — a documented simplification, not
 * an oversight, kept out to avoid the joker-rules complexity it drags in for
 * scoring other categories with a second Yahtzee.
 */
export function totalScore(scores: Partial<Record<YahtzeeCategory, number>>): number {
  const rawTotal = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const bonus = upperSectionSubtotal(scores) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0;
  return rawTotal + bonus;
}
