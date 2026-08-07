/**
 * Best-effort per-game numeric score for match_players.score and profile
 * stats — not every game has a meaningful running score (Grid Three,
 * Fourfall, Pocket Shots, Tank Tactics, Bounce Cup are pure win/loss), so
 * those fall through to 0 rather than guessing at something misleading.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractPlayerScore(gameId: string, state: any, playerId: string): number {
  switch (gameId) {
    case "word-clash":
    case "quick-draw":
      return state?.totalScores?.[playerId] ?? 0;
    case "tile-rush":
      return state?.boardsByPlayer?.[playerId]?.score ?? 0;
    case "mini-hoops":
      return state?.makesByPlayer?.[playerId] ?? 0;
    case "orb-hockey":
      return state?.scoreByPlayer?.[playerId] ?? 0;
    default:
      return 0;
  }
}
