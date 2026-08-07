/** Longer words score disproportionately more, rewarding real word-building over dumping short words. */
export function wordScore(length: number): number {
  if (length < 3) return 0;
  const table: Record<number, number> = { 3: 1, 4: 2, 5: 4, 6: 6, 7: 9, 8: 12 };
  return table[length] ?? 12 + (length - 8) * 4;
}

export interface ScoreRoundInput {
  /** playerId -> distinct words that player submitted this round. */
  submissionsByPlayer: Record<string, string[]>;
}

export interface ScoreRoundResult {
  scoringWords: Record<string, string[]>;
  scores: Record<string, number>;
}

/**
 * A word found by more than one player cancels out for everyone who found
 * it — same convention as Boggle/Scattergories "matching answers score
 * zero." Rewards finding words your opponents miss, not just long words.
 */
export function scoreRound({ submissionsByPlayer }: ScoreRoundInput): ScoreRoundResult {
  const wordCounts = new Map<string, number>();
  for (const words of Object.values(submissionsByPlayer)) {
    for (const word of words) {
      const key = word.toUpperCase();
      wordCounts.set(key, (wordCounts.get(key) ?? 0) + 1);
    }
  }

  const scoringWords: Record<string, string[]> = {};
  const scores: Record<string, number> = {};

  for (const [playerId, words] of Object.entries(submissionsByPlayer)) {
    const unique = words.filter((word) => wordCounts.get(word.toUpperCase()) === 1);
    scoringWords[playerId] = unique;
    scores[playerId] = unique.reduce((sum, word) => sum + wordScore(word.length), 0);
  }

  return { scoringWords, scores };
}
