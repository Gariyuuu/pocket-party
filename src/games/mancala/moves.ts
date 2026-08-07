export const PITS_PER_SIDE = 6;
export const SEEDS_PER_PIT = 4;
export const BOARD_SIZE = PITS_PER_SIDE * 2 + 2; // 14: 6 pits + 1 store, times 2 players
const STORE_FOR: readonly [number, number] = [PITS_PER_SIDE, BOARD_SIZE - 1]; // [6, 13]

export function pitsFor(playerIndex: 0 | 1): number[] {
  const start = playerIndex === 0 ? 0 : PITS_PER_SIDE + 1;
  return Array.from({ length: PITS_PER_SIDE }, (_, i) => start + i);
}

export function storeFor(playerIndex: 0 | 1): number {
  return STORE_FOR[playerIndex];
}

function opponentStoreFor(playerIndex: 0 | 1): number {
  return STORE_FOR[playerIndex === 0 ? 1 : 0];
}

/** The pit directly across the board — capturing it plus your own landing seed is the core Mancala/Kalah tactic. Works for either side since the board is symmetric around this formula. */
export function oppositePit(pit: number): number {
  return PITS_PER_SIDE * 2 - pit;
}

/** The next cell in sowing order for `sowingPlayerIndex`, skipping the opponent's store (you never sow into the other side's store). */
export function nextCell(cell: number, sowingPlayerIndex: 0 | 1): number {
  let next = (cell + 1) % BOARD_SIZE;
  if (next === opponentStoreFor(sowingPlayerIndex)) next = (next + 1) % BOARD_SIZE;
  return next;
}
