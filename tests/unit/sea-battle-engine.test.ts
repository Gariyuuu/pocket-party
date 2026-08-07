import { describe, expect, it } from "vitest";
import { seaBattleEngine } from "@/games/sea-battle/engine";
import { randomFleetPlacement, validateFleet } from "@/games/sea-battle/placement";
import type { SeaBattleState } from "@/games/sea-battle/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): SeaBattleState {
  return seaBattleEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

function placeBothFleets(state: SeaBattleState): SeaBattleState {
  let current = state;
  for (const playerId of ["p1", "p2"]) {
    const placements = randomFleetPlacement(current.shipLengths, current.boardSize);
    const result = seaBattleEngine.applyAction(current, { type: "place-ships", placements }, playerId);
    expect(result.ok).toBe(true);
    if (result.ok) current = result.nextState;
  }
  return current;
}

describe("validateFleet", () => {
  it("accepts a legal straight, non-overlapping fleet", () => {
    const placements = [{ cells: [0, 1, 2, 3, 4] }, { cells: [10, 18, 26, 34] }];
    expect(validateFleet(placements, [5, 4], 8)).toBeNull();
  });

  it("rejects a diagonal placement", () => {
    const placements = [{ cells: [0, 9, 18] }];
    expect(validateFleet(placements, [3], 8)).not.toBeNull();
  });

  it("rejects overlapping ships", () => {
    const placements = [{ cells: [0, 1, 2] }, { cells: [1, 9, 17] }];
    expect(validateFleet(placements, [3, 3], 8)).not.toBeNull();
  });

  it("rejects a ship of the wrong length", () => {
    const placements = [{ cells: [0, 1] }];
    expect(validateFleet(placements, [3], 8)).not.toBeNull();
  });
});

describe("randomFleetPlacement", () => {
  it("always produces a fleet that validateFleet accepts", () => {
    for (let i = 0; i < 20; i++) {
      const placements = randomFleetPlacement([5, 4, 3, 3, 2], 8);
      expect(validateFleet(placements, [5, 4, 3, 3, 2], 8)).toBeNull();
    }
  });
});

describe("seaBattleEngine", () => {
  it("starts in the placing phase with no fleets set", () => {
    const state = initial();
    expect(state.status).toBe("placing");
    expect(state.fleets.p1).toBeNull();
    expect(state.fleets.p2).toBeNull();
  });

  it("rejects firing before both fleets are placed", () => {
    const result = seaBattleEngine.applyAction(initial(), { type: "fire", cellIndex: 0 }, "p1");
    expect(result.ok).toBe(false);
  });

  it("moves to battling once both fleets are placed", () => {
    const state = placeBothFleets(initial());
    expect(state.status).toBe("battling");
    expect(state.currentTurnPlayerId).toBe("p1");
  });

  it("rejects a second placement attempt from the same player", () => {
    const state = initial();
    const placements = randomFleetPlacement(state.shipLengths, state.boardSize);
    const first = seaBattleEngine.applyAction(state, { type: "place-ships", placements }, "p1");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = seaBattleEngine.applyAction(first.nextState, { type: "place-ships", placements }, "p1");
    expect(second.ok).toBe(false);
  });

  it("reports a hit and passes the turn", () => {
    let state = placeBothFleets(initial());
    const targetCell = state.fleets.p2![0].cells[0];
    const result = seaBattleEngine.applyAction(state, { type: "fire", cellIndex: targetCell }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      state = result.nextState;
      expect(state.lastShot?.hit).toBe(true);
      expect(state.currentTurnPlayerId).toBe("p2");
    }
  });

  it("reports a sunk ship once every one of its cells is hit", () => {
    let state = placeBothFleets(initial());
    const ship = state.fleets.p2!.reduce((longest, s) => (s.cells.length < longest.cells.length ? s : longest));
    for (const cell of ship.cells) {
      // Rig the turn back to p1 each time so we can fire every cell of this one ship in sequence.
      state = { ...state, currentTurnPlayerId: "p1" };
      const result = seaBattleEngine.applyAction(state, { type: "fire", cellIndex: cell }, "p1");
      expect(result.ok).toBe(true);
      if (result.ok) state = result.nextState;
    }
    expect(state.lastShot?.sunkShipLength).toBe(ship.cells.length);
  });

  it("rejects firing at an already-fired-at cell", () => {
    let state = placeBothFleets(initial());
    const result1 = seaBattleEngine.applyAction(state, { type: "fire", cellIndex: 0 }, "p1");
    expect(result1.ok).toBe(true);
    if (result1.ok) state = result1.nextState;
    state = { ...state, currentTurnPlayerId: "p1" };
    const result2 = seaBattleEngine.applyAction(state, { type: "fire", cellIndex: 0 }, "p1");
    expect(result2.ok).toBe(false);
  });

  it("wins once every enemy ship is sunk", () => {
    let state = placeBothFleets(initial());
    const allEnemyCells = state.fleets.p2!.flatMap((s) => s.cells);
    for (const cell of allEnemyCells) {
      state = { ...state, currentTurnPlayerId: "p1" };
      const result = seaBattleEngine.applyAction(state, { type: "fire", cellIndex: cell }, "p1");
      expect(result.ok).toBe(true);
      if (result.ok) state = result.nextState;
    }
    expect(state.status).toBe("match-ended");
    expect(state.winnerPlayerId).toBe("p1");
  });

  it("rejects actions once the match has ended", () => {
    const state: SeaBattleState = { ...placeBothFleets(initial()), status: "match-ended", winnerPlayerId: "p1" };
    const result = seaBattleEngine.applyAction(state, { type: "fire", cellIndex: 0 }, "p2");
    expect(result.ok).toBe(false);
  });
});
