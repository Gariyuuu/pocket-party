import { isFormableFromPool } from "./letter-pool";

const WORDS_PER_ROUND_BY_DIFFICULTY = { easy: 2, medium: 4, hard: 6 } as const;
const MIN_LENGTH_BY_DIFFICULTY = { easy: 3, medium: 4, hard: 5 } as const;

/**
 * Picks a handful of real, pool-formable words for a bot's round — used in
 * solo mode. Not a sophisticated word-finder, just a shuffled scan of the
 * bundled dictionary filtered to what's actually draw-able and long enough
 * for the chosen difficulty.
 */
export function pickWordClashBotWords(
  pool: string[],
  wordList: string[],
  difficulty: "easy" | "medium" | "hard",
): string[] {
  const minLength = MIN_LENGTH_BY_DIFFICULTY[difficulty];
  const count = WORDS_PER_ROUND_BY_DIFFICULTY[difficulty];

  const candidates = wordList.filter(
    (word) => word.length >= minLength && isFormableFromPool(word, pool),
  );

  // Deterministic-enough shuffle for a bot with no seed dependency of its
  // own — solo mode doesn't need cross-client replay of bot "thinking."
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  candidates.sort((a, b) => b.length - a.length);
  return candidates.slice(0, count * 3).slice(0, count);
}
