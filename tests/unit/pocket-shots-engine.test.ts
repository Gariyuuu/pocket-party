import { describe, expect, it } from "vitest";
import { pocketShotsEngine } from "@/games/pocket-shots/engine";
import { CUE_BALL_ID, COMET_BALL_ID, TABLE_HEIGHT, TABLE_WIDTH } from "@/games/pocket-shots/constants";
import type { PocketShotsState } from "@/games/pocket-shots/types";

const PLAYERS = [
  { playerId: "p1", seat: 1, nickname: "Alice" },
  { playerId: "p2", seat: 2, nickname: "Bob" },
];

const CUE_RESPAWN = { x: TABLE_WIDTH * 0.22, y: TABLE_HEIGHT / 2 };

function initial(): PocketShotsState {
  return pocketShotsEngine.createInitialState({ seed: "seed-1", players: PLAYERS, modifiers: {}, now: 0 });
}

describe("pocketShotsEngine.createInitialState", () => {
  it("racks 8 balls with an open (unassigned) table", () => {
    const state = initial();
    expect(state.balls).toHaveLength(8);
    expect(state.assignments.p1).toBeNull();
    expect(state.assignments.p2).toBeNull();
    expect(state.currentTurnPlayerId).toBe("p1");
  });
});

describe("pocketShotsEngine.applyAction", () => {
  it("rejects a shot from the wrong player", () => {
    const result = pocketShotsEngine.applyAction(initial(), { type: "shoot", angle: 0, power: 50 }, "p2");
    expect(result.ok).toBe(false);
  });

  it("assigns groups the first time a player legally pots a ball", () => {
    const state = initial();
    const balls = state.balls.map((b) =>
      b.id === "orb-0" ? { ...b, x: 10, y: 10 } : b, // already inside pocket(0,0)'s capture radius
    );
    const result = pocketShotsEngine.applyAction({ ...state, balls }, { type: "shoot", angle: 180, power: 1 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.lastShot?.pocketedIds).toContain("orb-0");
      expect(result.nextState.assignments.p1).toBe("orb");
      expect(result.nextState.assignments.p2).toBe("ring");
    }
  });

  it("calls a scratch a foul and respawns the cue ball", () => {
    const state = initial();
    const balls = state.balls.map((b) => (b.id === CUE_BALL_ID ? { ...b, x: 5, y: 5 } : b));
    const result = pocketShotsEngine.applyAction({ ...state, balls }, { type: "shoot", angle: 0, power: 1 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.lastShot?.foul).toMatch(/scratch/i);
      const cue = result.nextState.balls.find((b) => b.id === CUE_BALL_ID)!;
      expect(cue.pocketed).toBe(false);
      expect(cue).toMatchObject(CUE_RESPAWN);
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
    }
  });

  it("fouls a player who hits the opponent's assigned group first", () => {
    const state = initial();
    const balls = state.balls.map((b) => {
      if (b.id === CUE_BALL_ID) return { ...b, x: 100, y: 190 };
      if (b.id === "ring-0") return { ...b, x: 130, y: 190 };
      return { ...b, x: 400, y: 40 }; // move everything else well out of the way
    });
    const withAssignments: PocketShotsState = {
      ...state,
      balls,
      assignments: { p1: "orb", p2: "ring" },
    };
    const result = pocketShotsEngine.applyAction(withAssignments, { type: "shoot", angle: 0, power: 60 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.lastShot?.foul).toMatch(/opponent/i);
      expect(result.nextState.currentTurnPlayerId).toBe("p2");
    }
  });

  it("lets the shooter continue after legally potting one of their own balls", () => {
    const state = initial();
    const balls = state.balls.map((b) => {
      if (b.id === CUE_BALL_ID) return { ...b, x: 100, y: 190 };
      if (b.id === "orb-0") return { ...b, x: 130, y: 190 }; // legal first contact, own group
      if (b.id === "orb-1") return { ...b, x: 10, y: 10 }; // pocketed regardless of the shot
      return { ...b, x: 400, y: 40 };
    });
    const withAssignments: PocketShotsState = { ...state, balls, assignments: { p1: "orb", p2: "ring" } };
    const result = pocketShotsEngine.applyAction(withAssignments, { type: "shoot", angle: 0, power: 60 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.lastShot?.foul).toBeNull();
      expect(result.nextState.currentTurnPlayerId).toBe("p1");
    }
  });

  it("loses instantly for pocketing the Comet before clearing your own group", () => {
    const state = initial();
    const balls = state.balls.map((b) => (b.id === COMET_BALL_ID ? { ...b, x: 10, y: 10 } : b));
    const withAssignments: PocketShotsState = { ...state, balls, assignments: { p1: "orb", p2: "ring" } };
    const result = pocketShotsEngine.applyAction(withAssignments, { type: "shoot", angle: 90, power: 1 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.winnerPlayerId).toBe("p2");
    }
  });

  it("wins for legally pocketing the Comet after clearing your own group", () => {
    const state = initial();
    const balls = state.balls.map((b) => {
      if (b.id === COMET_BALL_ID) return { ...b, x: 10, y: 10 };
      if (b.group === "orb") return { ...b, pocketed: true, x: -100, y: -100 };
      return b;
    });
    const withAssignments: PocketShotsState = { ...state, balls, assignments: { p1: "orb", p2: "ring" } };
    const result = pocketShotsEngine.applyAction(withAssignments, { type: "shoot", angle: 90, power: 1 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.winnerPlayerId).toBe("p1");
    }
  });

  it("still loses if the shooter scratches on the same shot that pots a cleared Comet", () => {
    const state = initial();
    const balls = state.balls.map((b) => {
      if (b.id === COMET_BALL_ID) return { ...b, x: 10, y: 10 };
      if (b.id === CUE_BALL_ID) return { ...b, x: TABLE_WIDTH - 10, y: TABLE_HEIGHT - 10 };
      if (b.group === "orb") return { ...b, pocketed: true, x: -100, y: -100 };
      return b;
    });
    const withAssignments: PocketShotsState = { ...state, balls, assignments: { p1: "orb", p2: "ring" } };
    const result = pocketShotsEngine.applyAction(withAssignments, { type: "shoot", angle: 90, power: 1 }, "p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextState.winnerPlayerId).toBe("p2");
    }
  });

  it("rejects further shots once the match has ended", () => {
    const state: PocketShotsState = { ...initial(), winnerPlayerId: "p1" };
    const result = pocketShotsEngine.applyAction(state, { type: "shoot", angle: 0, power: 50 }, "p2");
    expect(result.ok).toBe(false);
  });
});
