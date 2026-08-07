import { describe, expect, it } from "vitest";
import { miniGolfEngine } from "@/games/mini-golf/engine";
import { COURSES } from "@/games/mini-golf/courses";
import type { MiniGolfState } from "@/games/mini-golf/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

function initial(): MiniGolfState {
  return miniGolfEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

describe("miniGolfEngine.createInitialState", () => {
  it("starts both balls at the first course's start position, p1 first", () => {
    const state = initial();
    expect(state.holeIndex).toBe(0);
    expect(state.holeCount).toBe(COURSES.length);
    expect(state.currentTurnPlayerId).toBe("p1");
    for (const ball of state.balls) {
      expect(ball.x).toBe(COURSES[0].start.x);
      expect(ball.y).toBe(COURSES[0].start.y);
      expect(ball.strokes).toBe(0);
      expect(ball.holedOut).toBe(false);
    }
    expect(state.totalStrokes).toEqual({ p1: 0, p2: 0 });
  });
});

describe("miniGolfEngine.applyAction", () => {
  it("rejects a putt from the wrong player", () => {
    const result = miniGolfEngine.applyAction(initial(), { type: "putt", angle: 0, power: 50 }, "p2");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("wrong_turn");
  });

  it("rejects an out-of-range power", () => {
    const result = miniGolfEngine.applyAction(initial(), { type: "putt", angle: 0, power: 150 }, "p1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_move");
  });

  it("passes turn to the next player after a miss", () => {
    const result = miniGolfEngine.applyAction(initial(), { type: "putt", angle: 0, power: 5 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
      expect(result.nextState.balls.find((b) => b.playerId === "p1")!.strokes).toBe(1);
    }
  });

  it("holes out a player who reaches the hole and skips them in the rotation", () => {
    const state = initial();
    // A hard, dead-straight putt on hole 1 (no obstacles) reaches the hole.
    const result = miniGolfEngine.applyAction(state, { type: "putt", angle: 0, power: 100 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const p1Ball = result.nextState.balls.find((b) => b.playerId === "p1")!;
      expect(p1Ball.holedOut).toBe(true);
      expect(result.nextState.totalStrokes.p1).toBe(1);
      // p1 is holed out, so it should stay p2's turn even after p1's shot.
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
    }
  });

  it("advances to the next hole once every ball holes out", () => {
    let state = initial();
    let result = miniGolfEngine.applyAction(state, { type: "putt", angle: 0, power: 100 }, "p1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    state = result.nextState;
    expect(state.holeIndex).toBe(0);

    result = miniGolfEngine.applyAction(state, { type: "putt", angle: 0, power: 100 }, "p2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    state = result.nextState;

    expect(state.holeIndex).toBe(1);
    expect(state.currentTurnPlayerId).toBe("p1");
    for (const ball of state.balls) {
      expect(ball.holedOut).toBe(false);
      expect(ball.strokes).toBe(0);
      expect(ball.x).toBe(COURSES[1].start.x);
    }
    // Cumulative totals from hole 1 survive into hole 2.
    expect(state.totalStrokes).toEqual({ p1: 1, p2: 1 });
  });

  it("forces a hole-out after MAX_STROKES_PER_HOLE strokes with no progress", () => {
    let state = initial();
    // Tiny putts aimed away from the hole — repeat (alternating turns) until p1 is forced out.
    let guard = 0;
    while (!state.balls.find((b) => b.playerId === "p1")!.holedOut) {
      guard += 1;
      expect(guard).toBeLessThan(50); // safety net against an infinite loop if the engine has a bug
      const result = miniGolfEngine.applyAction(
        state,
        { type: "putt", angle: 180, power: 1 },
        state.currentTurnPlayerId,
      );
      expect(result.ok).toBe(true);
      if (result.ok) state = result.nextState;
    }
    const p1Ball = state.balls.find((b) => b.playerId === "p1")!;
    expect(p1Ball.strokes).toBe(8);
  });

  it("rejects further putts once the match has ended", () => {
    const state: MiniGolfState = { ...initial(), status: "match-ended", winnerPlayerId: "p1" };
    const result = miniGolfEngine.applyAction(state, { type: "putt", angle: 0, power: 50 }, "p1");
    expect(result.ok).toBe(false);
  });

  it("declares a winner by lowest total strokes after the final hole", () => {
    // Rig the match at the final hole rather than deriving real aiming
    // geometry for every course — p1 is already holed out with a lower
    // cumulative total, p2's ball is parked a few units from the hole so one
    // easy putt (well clear of any obstacle) finishes the match.
    const state = initial();
    const lastHoleIndex = state.holeCount - 1;
    const lastHole = COURSES[lastHoleIndex];
    const rigged: MiniGolfState = {
      ...state,
      holeIndex: lastHoleIndex,
      balls: [
        { playerId: "p1", x: lastHole.hole.x, y: lastHole.hole.y, strokes: 2, holedOut: true },
        { playerId: "p2", x: lastHole.hole.x - 20, y: lastHole.hole.y, strokes: 1, holedOut: false },
      ],
      totalStrokes: { p1: 5, p2: 6 },
      currentTurnPlayerId: "p2",
    };

    const result = miniGolfEngine.applyAction(rigged, { type: "putt", angle: 0, power: 40 }, "p2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.nextState.status).toBe("match-ended");
    expect(result.nextState.balls.find((b) => b.playerId === "p2")!.holedOut).toBe(true);
    expect(result.nextState.totalStrokes.p1).toBeLessThan(result.nextState.totalStrokes.p2);
    expect(result.nextState.winnerPlayerId).toBe("p1");
    expect(result.nextState.isDraw).toBe(false);
  });
});
