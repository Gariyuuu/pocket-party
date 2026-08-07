import { describe, expect, it } from "vitest";
import { tileRushEngine } from "@/games/tile-rush/engine";
import { BOARD_SIZE, CHAIN_BONUS_PER_TILE, FREEZE_DURATION_MS, MULTIPLIER_CHARGES_GRANTED } from "@/games/tile-rush/constants";
import type { PlayerBoard, Tile, TileRushState } from "@/games/tile-rush/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial() {
  return tileRushEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 1_000 });
}

/** A uniform color-1 background so any group we hand-place elsewhere stays isolated. */
function backgroundBoard(): Tile[] {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => ({ color: 1, powerUp: null }));
}

function withBoard(state: TileRushState, playerId: string, board: Partial<PlayerBoard>): TileRushState {
  return {
    ...state,
    boardsByPlayer: {
      ...state.boardsByPlayer,
      [playerId]: { ...state.boardsByPlayer[playerId], ...board },
    },
  };
}

describe("tileRushEngine.createInitialState", () => {
  it("gives every player the identical starting board", () => {
    const state = initial();
    expect(state.boardsByPlayer.p1.tiles.map((t) => t.color)).toEqual(
      state.boardsByPlayer.p2.tiles.map((t) => t.color),
    );
    expect(state.boardsByPlayer.p1.score).toBe(0);
  });
});

describe("tileRushEngine.applyAction — clear-tile", () => {
  it("rejects a click on a tile with no same-color neighbor", () => {
    const tiles = backgroundBoard();
    tiles[3 * BOARD_SIZE + 3] = { color: 2, powerUp: null };
    const state = withBoard(initial(), "p1", { tiles });
    const result = tileRushEngine.applyAction(state, { type: "clear-tile", row: 3, col: 3, now: 2000 }, "p1");
    expect(result.ok).toBe(false);
  });

  it("scores a plain group as groupSize squared", () => {
    const tiles = backgroundBoard();
    tiles[3 * BOARD_SIZE + 3] = { color: 2, powerUp: null };
    tiles[3 * BOARD_SIZE + 4] = { color: 2, powerUp: null };
    const state = withBoard(initial(), "p1", { tiles });
    const result = tileRushEngine.applyAction(state, { type: "clear-tile", row: 3, col: 3, now: 2000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.boardsByPlayer.p1.score).toBe(4); // 2x2
      expect(result.nextState.boardsByPlayer.p1.moveCount).toBe(1);
    }
  });

  it("triggers a row-clear power-up and awards a bonus for the extra tiles", () => {
    const tiles = backgroundBoard();
    tiles[3 * BOARD_SIZE + 3] = { color: 2, powerUp: "row-clear" };
    tiles[3 * BOARD_SIZE + 4] = { color: 2, powerUp: null };
    const state = withBoard(initial(), "p1", { tiles });
    const result = tileRushEngine.applyAction(state, { type: "clear-tile", row: 3, col: 3, now: 2000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      // 2x2 base + 6 other row-3 tiles at the flat chain bonus.
      expect(result.nextState.boardsByPlayer.p1.score).toBe(4 + 6 * CHAIN_BONUS_PER_TILE);
    }
  });

  it("banks multiplier charges that double a later clear, then spends one", () => {
    const tiles = backgroundBoard();
    tiles[3 * BOARD_SIZE + 3] = { color: 2, powerUp: "multiplier" };
    tiles[3 * BOARD_SIZE + 4] = { color: 2, powerUp: null };
    tiles[0] = { color: 3, powerUp: null }; // untouched by the first clear's column refill
    tiles[1] = { color: 3, powerUp: null };
    const state = withBoard(initial(), "p1", { tiles });

    const first = tileRushEngine.applyAction(state, { type: "clear-tile", row: 3, col: 3, now: 2000 }, "p1") as {
      ok: true;
      nextState: TileRushState;
    };
    expect(first.nextState.boardsByPlayer.p1.score).toBe(4);
    expect(first.nextState.boardsByPlayer.p1.multiplierCharges).toBe(MULTIPLIER_CHARGES_GRANTED);

    const second = tileRushEngine.applyAction(first.nextState, { type: "clear-tile", row: 0, col: 0, now: 2100 }, "p1");
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.nextState.boardsByPlayer.p1.score).toBe(4 + 8); // 2x2 doubled
      expect(second.nextState.boardsByPlayer.p1.multiplierCharges).toBe(MULTIPLIER_CHARGES_GRANTED - 1);
    }
  });

  it("sets a freeze deadline when a freeze power-up is cleared", () => {
    const tiles = backgroundBoard();
    tiles[0] = { color: 2, powerUp: "freeze" };
    tiles[1] = { color: 2, powerUp: null };
    const state = withBoard(initial(), "p1", { tiles });
    const result = tileRushEngine.applyAction(state, { type: "clear-tile", row: 0, col: 0, now: 5000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.boardsByPlayer.p1.freezeUntil).toBe(5000 + FREEZE_DURATION_MS);
    }
  });

  it("rejects a clear for a player with no board in the match", () => {
    const result = tileRushEngine.applyAction(initial(), { type: "clear-tile", row: 0, col: 0, now: 1000 }, "not-a-player");
    expect(result.ok).toBe(false);
  });
});

describe("tileRushEngine.applyAction — end-round", () => {
  it("declares the highest-scoring player the winner", () => {
    let state = withBoard(initial(), "p1", { score: 50 });
    state = withBoard(state, "p2", { score: 30 });
    const result = tileRushEngine.applyAction(state, { type: "end-round", now: 9000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.status).toBe("completed");
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("declares a draw on a tied score", () => {
    let state = withBoard(initial(), "p1", { score: 40 });
    state = withBoard(state, "p2", { score: 40 });
    const result = tileRushEngine.applyAction(state, { type: "end-round", now: 9000 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.isDraw).toBe(true);
      expect(result.nextState.winnerPlayerId).toBeNull();
    }
  });

  it("rejects further clears once the round has ended", () => {
    const state: TileRushState = { ...initial(), status: "completed", winnerPlayerId: "p1" };
    const result = tileRushEngine.applyAction(state, { type: "clear-tile", row: 0, col: 0, now: 1000 }, "p2");
    expect(result.ok).toBe(false);
  });
});

describe("tileRushEngine.checkOutcome", () => {
  it("is active while the round is running", () => {
    expect(tileRushEngine.checkOutcome(initial())).toEqual({ status: "active" });
  });
});
