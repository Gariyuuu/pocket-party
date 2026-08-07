import { findFourfallWin, isFourfallFull, landingRow } from "./lines";
import type { FourfallAction, FourfallState } from "./types";

const DEPTH_BY_DIFFICULTY = { easy: 2, medium: 4, hard: 6 } as const;

function validColumns(cells: (string | null)[], columns: number, rows: number): number[] {
  const result: number[] = [];
  for (let col = 0; col < columns; col++) {
    if (landingRow(cells, columns, rows, col) !== null) result.push(col);
  }
  return result;
}

function drop(
  cells: (string | null)[],
  columns: number,
  rows: number,
  column: number,
  playerId: string,
): (string | null)[] {
  const row = landingRow(cells, columns, rows, column)!;
  const next = [...cells];
  next[row * columns + column] = playerId;
  return next;
}

/** Counts favorable windows of 4 for a simple, fast positional heuristic. */
function evaluate(
  cells: (string | null)[],
  columns: number,
  rows: number,
  botId: string,
  opponentId: string,
): number {
  let score = 0;
  const centerCol = Math.floor(columns / 2);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if (cells[row * columns + col] === botId) {
        score += 3 - Math.abs(col - centerCol);
      }
    }
  }

  const windows: [number, number][][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= columns - 4; col++) {
      windows.push([
        [row, col],
        [row, col + 1],
        [row, col + 2],
        [row, col + 3],
      ]);
    }
  }
  for (let col = 0; col < columns; col++) {
    for (let row = 0; row <= rows - 4; row++) {
      windows.push([
        [row, col],
        [row + 1, col],
        [row + 2, col],
        [row + 3, col],
      ]);
    }
  }
  for (let row = 0; row <= rows - 4; row++) {
    for (let col = 0; col <= columns - 4; col++) {
      windows.push([
        [row, col],
        [row + 1, col + 1],
        [row + 2, col + 2],
        [row + 3, col + 3],
      ]);
      windows.push([
        [row + 3, col],
        [row + 2, col + 1],
        [row + 1, col + 2],
        [row, col + 3],
      ]);
    }
  }

  for (const window of windows) {
    const values = window.map(([r, c]) => cells[r * columns + c]);
    const botCount = values.filter((v) => v === botId).length;
    const opponentCount = values.filter((v) => v === opponentId).length;
    if (botCount > 0 && opponentCount === 0) score += [0, 1, 5, 20][botCount] ?? 0;
    if (opponentCount > 0 && botCount === 0) score -= [0, 1, 5, 20][opponentCount] ?? 0;
  }

  return score;
}

function minimax(
  cells: (string | null)[],
  columns: number,
  rows: number,
  depth: number,
  maximizing: boolean,
  alpha: number,
  beta: number,
  botId: string,
  opponentId: string,
): { score: number; column: number | null } {
  const win = findFourfallWin(cells, columns, rows);
  if (win?.playerId === botId) return { score: 1_000_000 + depth, column: null };
  if (win?.playerId === opponentId) return { score: -1_000_000 - depth, column: null };
  if (isFourfallFull(cells)) return { score: 0, column: null };
  if (depth === 0) return { score: evaluate(cells, columns, rows, botId, opponentId), column: null };

  const columnsToTry = validColumns(cells, columns, rows);
  let bestColumn = columnsToTry[0];
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const column of columnsToTry) {
    const next = drop(cells, columns, rows, column, maximizing ? botId : opponentId);
    const result = minimax(next, columns, rows, depth - 1, !maximizing, alpha, beta, botId, opponentId);

    if (maximizing) {
      if (result.score > bestScore) {
        bestScore = result.score;
        bestColumn = column;
      }
      alpha = Math.max(alpha, bestScore);
    } else {
      if (result.score < bestScore) {
        bestScore = result.score;
        bestColumn = column;
      }
      beta = Math.min(beta, bestScore);
    }
    if (alpha >= beta) break;
  }

  return { score: bestScore, column: bestColumn };
}

export function pickFourfallBotMove(
  state: FourfallState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): FourfallAction {
  const opponent = state.players.find((p) => p.playerId !== botPlayerId)!;
  const depth = DEPTH_BY_DIFFICULTY[difficulty];

  const result = minimax(
    state.cells,
    state.columns,
    state.rows,
    depth,
    true,
    -Infinity,
    Infinity,
    botPlayerId,
    opponent.playerId,
  );

  const fallback = validColumns(state.cells, state.columns, state.rows)[0];
  return { type: "drop", column: result.column ?? fallback };
}
