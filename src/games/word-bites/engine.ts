import type { EnginePlayer, GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { generateBiteRack } from "./board-gen";
import { WORD_BITES_ROUND_DURATION_MS } from "./constants";
import type { WordBitesAction, WordBitesState } from "./types";

/** Longer combos score disproportionately more — matches Tile Rush's group-size-squared convention, rewarding combining more bites over dumping a short one. */
function scoreForWord(length: number): number {
  return length * length;
}

function finalOutcome(players: EnginePlayer[], scores: Record<string, number>) {
  const maxScore = Math.max(...players.map((p) => scores[p.playerId] ?? 0));
  const leaders = players.filter((p) => (scores[p.playerId] ?? 0) === maxScore);
  return {
    winnerPlayerId: leaders.length === 1 ? leaders[0].playerId : null,
    isDraw: leaders.length > 1,
  } as const;
}

export const wordBitesEngine: GameEngine<WordBitesState, WordBitesAction> = {
  gameId: "word-bites",

  createInitialState({ seed, players, now }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    return {
      players: ordered,
      seed,
      rack: generateBiteRack(seed),
      claimed: [],
      scores: Object.fromEntries(ordered.map((p) => [p.playerId, 0])),
      roundEndsAt: now + WORD_BITES_ROUND_DURATION_MS,
      roundDurationMs: WORD_BITES_ROUND_DURATION_MS,
      status: "round-active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<WordBitesState> {
    if (state.status !== "round-active") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }

    if (action.type === "submit-word") {
      // Dictionary membership is checked by the caller before this runs —
      // same convention as Word Clash. This engine only owns rack-contiguity,
      // tile availability, and minimum-length validation.
      const tileIds = action.tileIds;
      if (!Array.isArray(tileIds) || tileIds.length === 0) {
        return { ok: false, reason: "malformed_payload", message: "No tiles selected." };
      }

      const indices = tileIds.map((id) => state.rack.findIndex((t) => t.id === id));
      if (indices.some((i) => i === -1)) {
        return { ok: false, reason: "invalid_move", message: "One of those tiles is no longer available." };
      }

      const sorted = [...indices].sort((a, b) => a - b);
      const sameOrder = indices.every((idx, i) => idx === sorted[i]);
      const contiguous = sorted.every((idx, i) => i === 0 || idx === sorted[i - 1] + 1);
      if (!sameOrder || !contiguous) {
        return { ok: false, reason: "invalid_move", message: "Tiles must be a connected, in-order run." };
      }

      const word = sorted.map((idx) => state.rack[idx].letters).join("");
      if (word.length < 3) {
        return { ok: false, reason: "invalid_move", message: "That's not long enough to be a word." };
      }

      const claimedTileIds = sorted.map((idx) => state.rack[idx].id);
      const points = scoreForWord(word.length);
      const rack = state.rack.filter((_, i) => !sorted.includes(i));
      const claimed = [...state.claimed, { playerId: fromPlayerId, word, tileIds: claimedTileIds, points }];
      const scores = { ...state.scores, [fromPlayerId]: (state.scores[fromPlayerId] ?? 0) + points };

      if (rack.length === 0) {
        return {
          ok: true,
          nextState: { ...state, rack, claimed, scores, status: "match-ended", ...finalOutcome(state.players, scores) },
        };
      }

      return { ok: true, nextState: { ...state, rack, claimed, scores } };
    }

    if (action.type === "advance-round") {
      return {
        ok: true,
        nextState: { ...state, status: "match-ended", ...finalOutcome(state.players, state.scores) },
      };
    }

    return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
  },

  checkOutcome(state) {
    if (state.status !== "match-ended") return { status: "active" };
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    return { status: "draw" };
  },
};
