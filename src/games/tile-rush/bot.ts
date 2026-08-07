import { BOARD_SIZE, MIN_GROUP_SIZE } from "./constants";
import { findConnectedGroup } from "./matching";
import type { TileRushAction, TileRushState } from "./types";

export function pickTileRushMove(
  state: TileRushState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): TileRushAction | null {
  const board = state.boardsByPlayer[botPlayerId];
  if (!board) return null;

  const scanBudget = { easy: 12, medium: 30, hard: BOARD_SIZE * BOARD_SIZE }[difficulty];
  const indices = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  let best: number[] | null = null;
  for (const index of indices.slice(0, scanBudget)) {
    const group = findConnectedGroup(board.tiles, index);
    if (group.length < MIN_GROUP_SIZE) continue;
    if (difficulty !== "hard") {
      best = group;
      break;
    }
    if (!best || group.length > best.length) best = group;
  }

  if (!best) return null;
  const row = Math.floor(best[0] / BOARD_SIZE);
  const col = best[0] % BOARD_SIZE;
  return { type: "clear-tile", row, col, now: Date.now() };
}
