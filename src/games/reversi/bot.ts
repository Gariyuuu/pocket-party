import { BOARD_SIZE, flipsForMove, legalMoves, rowColOf } from "./moves";
import type { ReversiAction, ReversiState } from "./types";

/** Standard Reversi positional heuristic: corners are the most valuable (unflippable once taken), the squares diagonally adjacent to a corner are dangerous (taking one often hands the opponent the corner), plain edges are good, everything else is neutral. */
function positionWeight(cell: number): number {
  const [row, col] = rowColOf(cell);
  const last = BOARD_SIZE - 1;
  const isCorner = (row === 0 || row === last) && (col === 0 || col === last);
  if (isCorner) return 25;
  const isNearCorner =
    ((row === 0 || row === last) && (col === 1 || col === last - 1)) ||
    ((col === 0 || col === last) && (row === 1 || row === last - 1));
  if (isNearCorner) return -12;
  const isEdge = row === 0 || row === last || col === 0 || col === last;
  if (isEdge) return 6;
  return 1;
}

/** Solo-mode opponent for Reversi. The engine only ever calls this on the bot's own turn, and it auto-skips any player with zero legal moves — so `moves` below is guaranteed non-empty. */
export function pickReversiMove(
  state: ReversiState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): ReversiAction {
  const opponentId = state.players.map((p) => p.playerId).find((id) => id !== botPlayerId)!;
  const moves = legalMoves(state.board, botPlayerId, opponentId);

  if (difficulty === "easy") {
    return { type: "place", cell: moves[Math.floor(Math.random() * moves.length)] };
  }

  if (difficulty === "medium") {
    let best = moves[0];
    let bestFlips = -1;
    for (const cell of moves) {
      const flips = flipsForMove(state.board, cell, botPlayerId, opponentId).length;
      if (flips > bestFlips) {
        bestFlips = flips;
        best = cell;
      }
    }
    return { type: "place", cell: best };
  }

  let best = moves[0];
  let bestScore = -Infinity;
  for (const cell of moves) {
    const flips = flipsForMove(state.board, cell, botPlayerId, opponentId).length;
    const score = positionWeight(cell) * 4 + flips;
    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }
  return { type: "place", cell: best };
}
