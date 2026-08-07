import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { createSeededRng } from "@/games/core/rng";
import { drawLetterPool, isFormableFromPool } from "./letter-pool";
import { scoreRound } from "./scoring";
import {
  WORD_CLASH_ROUND_DURATION_MS,
  WORD_CLASH_TOTAL_ROUNDS,
  type WordClashAction,
  type WordClashState,
} from "./types";

function poolForRound(seed: string, round: number): string[] {
  return drawLetterPool(createSeededRng(`${seed}:round:${round}`));
}

export const wordClashEngine: GameEngine<WordClashState, WordClashAction> = {
  gameId: "word-clash",

  createInitialState({ seed, players, now }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    return {
      players: ordered,
      seed,
      round: 1,
      totalRounds: WORD_CLASH_TOTAL_ROUNDS,
      letterPool: poolForRound(seed, 1),
      roundEndsAt: now + WORD_CLASH_ROUND_DURATION_MS,
      roundDurationMs: WORD_CLASH_ROUND_DURATION_MS,
      submissions: {},
      roundHistory: [],
      totalScores: Object.fromEntries(ordered.map((p) => [p.playerId, 0])),
      status: "round-active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<WordClashState> {
    if (state.status !== "round-active") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }

    if (action.type === "submit-word") {
      // Dictionary membership is checked by the caller before this runs —
      // the engine only owns pool-formability and duplicate detection.
      const word = action.word.trim().toUpperCase();
      if (word.length < 3) {
        return { ok: false, reason: "invalid_move", message: "Words need at least 3 letters." };
      }
      if (!isFormableFromPool(word, state.letterPool)) {
        return { ok: false, reason: "invalid_move", message: "That word isn't in this round's letters." };
      }
      const existing = state.submissions[fromPlayerId] ?? [];
      if (existing.some((s) => s.word === word)) {
        return { ok: false, reason: "duplicate_action", message: "You already submitted that word." };
      }

      return {
        ok: true,
        nextState: {
          ...state,
          submissions: {
            ...state.submissions,
            [fromPlayerId]: [...existing, { word, submittedAt: Date.now() }],
          },
        },
      };
    }

    if (action.type === "advance-round") {
      const submissionsByPlayer = Object.fromEntries(
        state.players.map((p) => [p.playerId, (state.submissions[p.playerId] ?? []).map((s) => s.word)]),
      );
      const result = scoreRound({ submissionsByPlayer });
      const totalScores = { ...state.totalScores };
      for (const [playerId, score] of Object.entries(result.scores)) {
        totalScores[playerId] = (totalScores[playerId] ?? 0) + score;
      }
      const roundHistory = [...state.roundHistory, result];

      if (state.round >= state.totalRounds) {
        const maxScore = Math.max(...Object.values(totalScores));
        const leaders = Object.entries(totalScores).filter(([, score]) => score === maxScore);
        return {
          ok: true,
          nextState: {
            ...state,
            totalScores,
            roundHistory,
            status: "match-ended",
            isDraw: leaders.length > 1,
            winnerPlayerId: leaders.length === 1 ? leaders[0][0] : null,
          },
        };
      }

      const nextRound = state.round + 1;
      return {
        ok: true,
        nextState: {
          ...state,
          totalScores,
          roundHistory,
          round: nextRound,
          letterPool: poolForRound(state.seed, nextRound),
          roundEndsAt: action.now + state.roundDurationMs,
          submissions: {},
        },
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
