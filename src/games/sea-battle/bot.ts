import type { SeaBattleAction, SeaBattleState } from "./types";

function neighbors(cell: number, boardSize: number): number[] {
  const row = Math.floor(cell / boardSize);
  const col = cell % boardSize;
  const candidates: [number, number][] = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ];
  return candidates
    .filter(([r, c]) => r >= 0 && r < boardSize && c >= 0 && c < boardSize)
    .map(([r, c]) => r * boardSize + c);
}

/**
 * Classic Battleship AI: after landing a hit on a ship that isn't sunk yet,
 * "hunt" its neighbors before firing anywhere else. Absent a live hit to
 * hunt, harder difficulties prefer a checkerboard pattern (every ship is at
 * least 2 cells long, so a checkerboard guarantees eventually hitting every
 * ship while roughly halving the search space) over pure random.
 */
export function pickSeaBattleFire(
  state: SeaBattleState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): SeaBattleAction {
  const boardSize = state.boardSize;
  const opponent = state.players.find((p) => p.playerId !== botPlayerId)!;
  const opponentFleet = state.fleets[opponent.playerId] ?? [];
  const alreadyFired = new Set(state.shots[botPlayerId] ?? []);

  const available = (cell: number) => cell >= 0 && cell < boardSize * boardSize && !alreadyFired.has(cell);

  if (difficulty !== "easy") {
    const huntTargets = new Set<number>();
    for (const ship of opponentFleet) {
      const sunk = ship.hits.length === ship.cells.length;
      if (sunk) continue;
      for (const hitCell of ship.hits) {
        for (const n of neighbors(hitCell, boardSize)) {
          if (available(n)) huntTargets.add(n);
        }
      }
    }
    if (huntTargets.size > 0) {
      const pool = [...huntTargets];
      return { type: "fire", cellIndex: pool[Math.floor(Math.random() * pool.length)] };
    }
  }

  if (difficulty === "hard") {
    const checkerboard: number[] = [];
    for (let cell = 0; cell < boardSize * boardSize; cell++) {
      const row = Math.floor(cell / boardSize);
      const col = cell % boardSize;
      if ((row + col) % 2 === 0 && available(cell)) checkerboard.push(cell);
    }
    if (checkerboard.length > 0) {
      return { type: "fire", cellIndex: checkerboard[Math.floor(Math.random() * checkerboard.length)] };
    }
  }

  const remaining: number[] = [];
  for (let cell = 0; cell < boardSize * boardSize; cell++) {
    if (available(cell)) remaining.push(cell);
  }
  return { type: "fire", cellIndex: remaining[Math.floor(Math.random() * remaining.length)] };
}
