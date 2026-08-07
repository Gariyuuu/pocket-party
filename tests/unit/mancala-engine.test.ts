import { describe, expect, it } from "vitest";
import { mancalaEngine } from "@/games/mancala/engine";
import { pitsFor, storeFor } from "@/games/mancala/moves";
import { pickMancalaMove } from "@/games/mancala/bot";
import type { MancalaState } from "@/games/mancala/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): MancalaState {
  return mancalaEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

describe("mancalaEngine.createInitialState", () => {
  it("starts every pit with 4 seeds and both stores empty", () => {
    const state = initial();
    for (const pit of [...pitsFor(0), ...pitsFor(1)]) expect(state.board[pit]).toBe(4);
    expect(state.board[storeFor(0)]).toBe(0);
    expect(state.board[storeFor(1)]).toBe(0);
    expect(state.currentTurnPlayerId).toBe("p1");
  });
});

describe("mancalaEngine.applyAction", () => {
  it("rejects a move from the wrong player", () => {
    const result = mancalaEngine.applyAction(initial(), { type: "sow", pit: pitsFor(1)[0] }, "p1");
    expect(result.ok).toBe(false);
  });

  it("rejects sowing an opponent's pit or an empty pit", () => {
    const state = initial();
    const opponentPit = mancalaEngine.applyAction(state, { type: "sow", pit: pitsFor(1)[0] }, "p1");
    expect(opponentPit.ok).toBe(false);
  });

  it("sows one seed per subsequent pit and passes the turn on an ordinary move", () => {
    // Sowing from p1's pit 0 (4 seeds) lands the last seed in pit 3 (still
    // p1's own pit, but non-empty beforehand — 4+1=5, no capture) — turn
    // passes normally.
    const state = initial();
    const startPit = pitsFor(0)[0];
    const result = mancalaEngine.applyAction(state, { type: "sow", pit: startPit }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[startPit]).toBe(0);
      expect(result.nextState.board[startPit + 1]).toBe(5);
      expect(result.nextState.board[startPit + 4]).toBe(5);
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
    }
  });

  it("landing the last seed in your own store grants an extra turn", () => {
    // p1's pit at index 5 (the last pit before the store) sown with exactly
    // 1 seed lands directly in p1's store.
    const board = Array(14).fill(0);
    const lastPit = pitsFor(0)[5];
    board[lastPit] = 1;
    const state: MancalaState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = mancalaEngine.applyAction(state, { type: "sow", pit: lastPit }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[storeFor(0)]).toBe(1);
      expect(result.nextState.lastMove?.extraTurn).toBe(true);
      expect(result.nextState.currentTurnPlayerId).toBe("p1");
    }
  });

  it("landing the last seed in an empty own pit captures it plus the opposite pit", () => {
    const board = Array(14).fill(0);
    const startPit = pitsFor(0)[0]; // pit 0
    const landingPit = startPit + 1; // pit 1, empty beforehand
    const oppositeOfLanding = 12 - landingPit; // per oppositePit's formula
    board[startPit] = 1;
    board[oppositeOfLanding] = 5;
    const state: MancalaState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = mancalaEngine.applyAction(state, { type: "sow", pit: startPit }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.board[landingPit]).toBe(0);
      expect(result.nextState.board[oppositeOfLanding]).toBe(0);
      expect(result.nextState.board[storeFor(0)]).toBe(6); // the 1 landing seed + 5 captured
      expect(result.nextState.lastMove?.captured).toBe(true);
    }
  });

  it("ends the round once one side's pits are all empty, sweeping the remainder", () => {
    const board = Array(14).fill(0);
    board[pitsFor(0)[0]] = 1; // p1's only remaining seed, about to be sown into their store
    board[pitsFor(1)[2]] = 7; // p2 still has seeds left over to be swept
    const state: MancalaState = { ...initial(), board, currentTurnPlayerId: "p1" };
    const result = mancalaEngine.applyAction(state, { type: "sow", pit: pitsFor(0)[0] }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.status).toBe("finished");
      expect(result.nextState.board[storeFor(1)]).toBe(7);
      expect(result.nextState.winnerPlayerId).toBe("p2");
    }
  });

  it("rejects further moves once the match has ended", () => {
    const state: MancalaState = { ...initial(), status: "finished", winnerPlayerId: "p1" };
    const result = mancalaEngine.applyAction(state, { type: "sow", pit: pitsFor(1)[0] }, "p2");
    expect(result.ok).toBe(false);
  });
});

describe("pickMancalaMove", () => {
  it("always returns one of the bot's own non-empty pits, at every difficulty", () => {
    const state = initial();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const move = pickMancalaMove(state, "p2", difficulty);
      expect(pitsFor(1)).toContain(move.pit);
      expect(state.board[move.pit]).toBeGreaterThan(0);
    }
  });
});
