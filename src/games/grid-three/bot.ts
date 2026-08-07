import { findWinningLine, isBoardFull } from "./lines";
import { winLengthForMode } from "./engine";
import type { GridThreeAction, GridThreeState } from "./types";

function emptyIndices(cells: (string | null)[]): number[] {
  const result: number[] = [];
  cells.forEach((c, i) => c === null && result.push(i));
  return result;
}

function simulate(cells: (string | null)[], index: number, playerId: string): (string | null)[] {
  const next = [...cells];
  next[index] = playerId;
  return next;
}

function findImmediateWin(
  state: GridThreeState,
  playerId: string,
  candidates: number[],
): number | null {
  const winLength = winLengthForMode(state.mode);
  for (const index of candidates) {
    const next = simulate(state.cells, index, playerId);
    if (findWinningLine(next, state.boardSize, winLength)?.playerId === playerId) return index;
  }
  return null;
}

function centerBias(index: number, boardSize: number): number {
  const row = Math.floor(index / boardSize);
  const col = index % boardSize;
  const center = (boardSize - 1) / 2;
  return -(Math.abs(row - center) + Math.abs(col - center));
}

/** Exact minimax for the 3x3 board — small enough to fully search every game. */
function minimax3x3(
  cells: (string | null)[],
  botId: string,
  opponentId: string,
  turn: string,
  depth: number,
): { score: number; index: number | null } {
  const win = findWinningLine(cells, 3, 3);
  if (win?.playerId === botId) return { score: 10 - depth, index: null };
  if (win?.playerId === opponentId) return { score: depth - 10, index: null };
  if (isBoardFull(cells)) return { score: 0, index: null };

  const candidates = emptyIndices(cells);
  let best = turn === botId ? -Infinity : Infinity;
  let bestIndex: number | null = null;

  for (const index of candidates) {
    const next = simulate(cells, index, turn);
    const result = minimax3x3(next, botId, opponentId, turn === botId ? opponentId : botId, depth + 1);
    if (turn === botId ? result.score > best : result.score < best) {
      best = result.score;
      bestIndex = index;
    }
  }

  return { score: best, index: bestIndex };
}

export function pickGridThreeBotMove(
  state: GridThreeState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): GridThreeAction {
  const opponent = state.players.find((p) => p.playerId !== botPlayerId)!;
  const candidates = emptyIndices(state.cells);

  if (difficulty === "easy" && Math.random() < 0.7) {
    return { type: "place", cellIndex: candidates[Math.floor(Math.random() * candidates.length)] };
  }

  if (difficulty === "hard" && state.boardSize === 3) {
    const { index } = minimax3x3(state.cells, botPlayerId, opponent.playerId, botPlayerId, 0);
    if (index !== null) return { type: "place", cellIndex: index };
  }

  const winningMove = findImmediateWin(state, botPlayerId, candidates);
  if (winningMove !== null) return { type: "place", cellIndex: winningMove };

  const blockingMove = findImmediateWin(state, opponent.playerId, candidates);
  if (blockingMove !== null) return { type: "place", cellIndex: blockingMove };

  if (difficulty === "hard") {
    // 1-ply lookahead: avoid moves that hand the opponent an immediate win next turn.
    const safeMoves = candidates.filter((index) => {
      const next = simulate(state.cells, index, botPlayerId);
      const opponentReplyCandidates = emptyIndices(next);
      return (
        findImmediateWin(
          { ...state, cells: next },
          opponent.playerId,
          opponentReplyCandidates,
        ) === null
      );
    });
    const pool = safeMoves.length > 0 ? safeMoves : candidates;
    pool.sort((a, b) => centerBias(b, state.boardSize) - centerBias(a, state.boardSize));
    return { type: "place", cellIndex: pool[0] };
  }

  const ranked = [...candidates].sort(
    (a, b) => centerBias(b, state.boardSize) - centerBias(a, state.boardSize),
  );
  return { type: "place", cellIndex: ranked[0] };
}
