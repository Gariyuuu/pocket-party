import { scoreForCategory } from "./scoring";
import { YAHTZEE_CATEGORIES } from "./types";
import type { YahtzeeAction, YahtzeeCategory, YahtzeeState } from "./types";

// When every remaining category scores 0 on the current dice, sacrifice the
// hardest-to-fill-later category first (Yahtzee/straights/full house are
// rare to complete honestly; the upper-section numbers and Chance are easy
// to eventually fill with something, however small).
const SACRIFICE_PRIORITY: YahtzeeCategory[] = [
  "yahtzee",
  "largeStraight",
  "smallStraight",
  "fullHouse",
  "fourOfKind",
  "threeOfKind",
  "sixes",
  "fives",
  "fours",
  "threes",
  "twos",
  "ones",
  "chance",
];

function bestAvailableCategory(
  dice: number[],
  usedCategories: Set<YahtzeeCategory>,
): { category: YahtzeeCategory; score: number } {
  let best: { category: YahtzeeCategory; score: number } | null = null;
  for (const category of YAHTZEE_CATEGORIES) {
    if (usedCategories.has(category)) continue;
    const score = scoreForCategory(dice, category);
    if (!best || score > best.score) best = { category, score };
  }
  // The engine only calls getBotAction on the bot's own active turn, and a
  // player's turn only comes up while they still have an unused category
  // (see engine.ts's even-rotation argument) — `best` is never null here.
  return best!;
}

/** Which dice to hold before the next reroll, chasing whichever pattern the current roll is closest to. */
function decideHolds(dice: number[]): boolean[] {
  const counts = new Map<number, number>();
  for (const die of dice) counts.set(die, (counts.get(die) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const modalValue = [...counts.entries()].find(([, count]) => count === maxCount)![0];

  if (maxCount >= 2) {
    // Chasing a pair, three/four-of-a-kind, full house, or Yahtzee — hold
    // every die that already matches the most common face.
    return dice.map((die) => die === modalValue);
  }

  const uniqueSorted = [...new Set(dice)].sort((a, b) => a - b);
  if (uniqueSorted.length >= 4) {
    // No pair at all, but the spread of distinct values means a straight is
    // realistic — hold one die per distinct value, reroll true duplicates.
    const seen = new Set<number>();
    return dice.map((die) => {
      if (seen.has(die)) return false;
      seen.add(die);
      return true;
    });
  }

  return dice.map((die) => die === modalValue);
}

const GOOD_ENOUGH_THRESHOLD: Record<"easy" | "medium" | "hard", number> = { easy: 15, medium: 20, hard: 24 };

/** Solo-mode opponent for Yahtzee. Called repeatedly (roll → hold decisions → reroll → score) across one bot turn by the generic bot-turn loop in `solo-game-shell.tsx`. */
export function pickYahtzeeMove(
  state: YahtzeeState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): YahtzeeAction {
  if (state.rollsUsedThisTurn === 0) return { type: "roll" };

  const usedCategories = new Set(Object.keys(state.scores[botPlayerId]) as YahtzeeCategory[]);
  const best = bestAvailableCategory(state.dice, usedCategories);
  const shouldStop = state.rollsUsedThisTurn >= 3 || best.score >= GOOD_ENOUGH_THRESHOLD[difficulty];

  if (shouldStop) {
    if (best.score > 0) return { type: "score", category: best.category };
    const sacrifice = SACRIFICE_PRIORITY.find((category) => !usedCategories.has(category))!;
    return { type: "score", category: sacrifice };
  }

  const targetHolds = decideHolds(state.dice);
  const mismatchIndex = targetHolds.findIndex((shouldHold, i) => shouldHold !== state.heldDice[i]);
  if (mismatchIndex !== -1) return { type: "toggle-hold", die: mismatchIndex };

  return { type: "roll" };
}
