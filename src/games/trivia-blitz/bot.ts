const BOT_ACCURACY: Record<"easy" | "medium" | "hard", number> = { easy: 0.35, medium: 0.55, hard: 0.8 };

/** Picks the bot's answer for the current question. Called directly from `solo-game-shell.tsx` (like Word Clash's bot), not through `engine.getBotAction` — this game has no turn to hand off. */
export function pickTriviaAnswer(correctIndex: number, optionCount: number, difficulty: "easy" | "medium" | "hard"): number {
  if (Math.random() < BOT_ACCURACY[difficulty]) return correctIndex;
  const wrongOptions = Array.from({ length: optionCount }, (_, i) => i).filter((i) => i !== correctIndex);
  return wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
}
