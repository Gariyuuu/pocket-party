import type { GameEngine, EnginePlayer } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { BOX_COUNT, EDGE_COUNT, boxesForEdge, edgesForBox } from "./moves";
import { pickDotsAndBoxesMove } from "./bot";
import type { DotsAndBoxesAction, DotsAndBoxesState } from "./types";

function nextPlayerId(players: EnginePlayer[], currentId: string): string {
  const index = players.findIndex((p) => p.playerId === currentId);
  return players[(index + 1) % players.length].playerId;
}

export const dotsAndBoxesEngine: GameEngine<DotsAndBoxesState, DotsAndBoxesAction> = {
  gameId: "dots-and-boxes",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    return {
      players: ordered,
      edges: Array(EDGE_COUNT).fill(false),
      boxOwners: Array(BOX_COUNT).fill(null),
      currentTurnPlayerId: ordered[0].playerId,
      lastMove: null,
      status: "active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<DotsAndBoxesState> {
    if (state.status !== "active") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "claim-edge") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }
    if (action.edge < 0 || action.edge >= EDGE_COUNT || state.edges[action.edge]) {
      return { ok: false, reason: "invalid_move", message: "That line is already taken." };
    }

    const edges = [...state.edges];
    edges[action.edge] = true;
    const boxOwners = [...state.boxOwners];
    const completedBoxes: number[] = [];
    for (const box of boxesForEdge(action.edge)) {
      if (boxOwners[box] === null && edgesForBox(box).every((edge) => edges[edge])) {
        boxOwners[box] = fromPlayerId;
        completedBoxes.push(box);
      }
    }

    // Completing at least one box earns another turn — the one rule that
    // makes Dots and Boxes about chain strategy rather than just alternating
    // clicks. Skipping straight to "no legal moves left" isn't possible here
    // (every player always has some open edge until the board is full).
    const allEdgesClaimed = edges.every(Boolean);
    let status: DotsAndBoxesState["status"] = "active";
    let winnerPlayerId: string | null = null;
    let isDraw = false;
    let nextTurn = completedBoxes.length > 0 ? fromPlayerId : nextPlayerId(state.players, fromPlayerId);

    if (allEdgesClaimed) {
      status = "finished";
      const counts = new Map<string, number>();
      for (const owner of boxOwners) if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
      const maxCount = Math.max(...counts.values());
      const leaders = [...counts.entries()].filter(([, count]) => count === maxCount).map(([id]) => id);
      if (leaders.length === 1) winnerPlayerId = leaders[0];
      else isDraw = true;
      nextTurn = state.currentTurnPlayerId;
    }

    return {
      ok: true,
      nextState: {
        ...state,
        edges,
        boxOwners,
        lastMove: { playerId: fromPlayerId, edge: action.edge, completedBoxes },
        status,
        winnerPlayerId,
        isDraw,
        currentTurnPlayerId: nextTurn,
      },
    };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    if (state.isDraw) return { status: "draw" };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickDotsAndBoxesMove(state, botPlayerId, difficulty);
  },
};
