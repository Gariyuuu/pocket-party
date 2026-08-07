import { hasAnyCapture, jumpOptions, rowColOf, stepOptions, BOARD_SIZE } from "./moves";
import type { CheckersAction, CheckersPiece, CheckersState } from "./types";

interface Candidate {
  from: number;
  path: number[];
  captures: number;
  crowns: boolean;
}

function jumpChainsFrom(
  board: (CheckersPiece | null)[],
  cell: number,
  piece: CheckersPiece,
  forwardRowDelta: number,
  pathSoFar: number[],
  capturesSoFar: number,
  results: { path: number[]; captures: number }[],
) {
  const options = jumpOptions(board, cell, piece, forwardRowDelta);
  if (options.length === 0) {
    if (pathSoFar.length > 0) results.push({ path: [...pathSoFar], captures: capturesSoFar });
    return;
  }
  for (const opt of options) {
    const nextBoard = [...board];
    nextBoard[opt.captured] = null;
    nextBoard[cell] = null;
    nextBoard[opt.to] = piece;
    jumpChainsFrom(nextBoard, opt.to, piece, forwardRowDelta, [...pathSoFar, opt.to], capturesSoFar + 1, results);
  }
}

function enumerateCandidates(
  state: CheckersState,
  botPlayerId: string,
  forwardRowDeltaFor: (id: string) => number,
): Candidate[] {
  const { board } = state;
  const mustCapture = hasAnyCapture(board, botPlayerId, forwardRowDeltaFor);
  const forwardRowDelta = forwardRowDeltaFor(botPlayerId);
  const homeRow = state.players[0].playerId === botPlayerId ? BOARD_SIZE - 1 : 0;
  const candidates: Candidate[] = [];

  for (let cell = 0; cell < board.length; cell++) {
    const piece = board[cell];
    if (!piece || piece.playerId !== botPlayerId) continue;

    if (mustCapture) {
      const results: { path: number[]; captures: number }[] = [];
      jumpChainsFrom(board, cell, piece, forwardRowDelta, [], 0, results);
      for (const r of results) {
        const [finalRow] = rowColOf(r.path[r.path.length - 1]);
        candidates.push({ from: cell, path: r.path, captures: r.captures, crowns: !piece.isKing && finalRow === homeRow });
      }
    } else {
      for (const step of stepOptions(board, cell, piece, forwardRowDelta)) {
        const [finalRow] = rowColOf(step.to);
        candidates.push({ from: cell, path: [step.to], captures: 0, crowns: !piece.isKing && finalRow === homeRow });
      }
    }
  }
  return candidates;
}

export function pickCheckersMove(
  state: CheckersState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): CheckersAction {
  const forwardRowDeltaFor = (id: string) => (id === state.players[0].playerId ? 1 : -1);
  const candidates = enumerateCandidates(state, botPlayerId, forwardRowDeltaFor);
  if (candidates.length === 0) {
    // Shouldn't happen if the engine only calls this when the bot has a legal move,
    // but fall back to a no-op-shaped move rather than throwing.
    return { type: "move", from: -1, path: [] };
  }

  if (difficulty === "easy") {
    return toAction(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  const maxCaptures = Math.max(...candidates.map((c) => c.captures));
  let pool = candidates.filter((c) => c.captures === maxCaptures);
  if (difficulty === "hard") {
    const crowning = pool.filter((c) => c.crowns);
    if (crowning.length > 0) pool = crowning;
  }
  return toAction(pool[Math.floor(Math.random() * pool.length)]);
}

function toAction(candidate: Candidate): CheckersAction {
  return { type: "move", from: candidate.from, path: candidate.path };
}
