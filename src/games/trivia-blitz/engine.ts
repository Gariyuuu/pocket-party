import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { createSeededRng, shuffle } from "@/games/core/rng";
import { TRIVIA_QUESTIONS } from "./questions";
import type { TriviaBlitzAction, TriviaBlitzState } from "./types";

export const TRIVIA_TOTAL_ROUNDS = 8;
const POINTS_FOR_CORRECT = 10;

export const triviaBlitzEngine: GameEngine<TriviaBlitzState, TriviaBlitzAction> = {
  gameId: "trivia-blitz",

  createInitialState({ seed, players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const rng = createSeededRng(`${seed}:trivia-order`);
    const allIndices = TRIVIA_QUESTIONS.map((_, i) => i);
    const questionOrder = shuffle(rng, allIndices).slice(0, TRIVIA_TOTAL_ROUNDS);
    return {
      players: ordered,
      seed,
      round: 1,
      totalRounds: questionOrder.length,
      questionOrder,
      answers: {},
      roundHistory: [],
      totalScores: Object.fromEntries(ordered.map((p) => [p.playerId, 0])),
      status: "round-active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  // Not turn-based — every player answers the same question independently,
  // and the round advances the instant everyone has (no wall-clock timer, a
  // deliberate simplification: unlike Word Clash/Tile Rush, there's no
  // "advance-round" action or room-state.ts special-casing to gate).
  applyAction(state, action, fromPlayerId): ActionValidationResult<TriviaBlitzState> {
    if (state.status !== "round-active") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "answer") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (state.answers[fromPlayerId]) {
      return { ok: false, reason: "duplicate_action", message: "You already answered this round." };
    }
    if (!Number.isInteger(action.answerIndex) || action.answerIndex < 0 || action.answerIndex > 3) {
      return { ok: false, reason: "malformed_payload", message: "Invalid answer choice." };
    }

    const questionIndex = state.questionOrder[state.round - 1];
    const question = TRIVIA_QUESTIONS[questionIndex];
    const correct = action.answerIndex === question.correctIndex;
    const pointsAwarded = correct ? POINTS_FOR_CORRECT : 0;
    const answers = {
      ...state.answers,
      [fromPlayerId]: { answerIndex: action.answerIndex, correct, pointsAwarded },
    };

    const everyoneAnswered = state.players.every((p) => answers[p.playerId] !== undefined);
    if (!everyoneAnswered) {
      return { ok: true, nextState: { ...state, answers } };
    }

    const totalScores = { ...state.totalScores };
    for (const [playerId, record] of Object.entries(answers)) {
      totalScores[playerId] = (totalScores[playerId] ?? 0) + record.pointsAwarded;
    }
    const roundHistory = [...state.roundHistory, { questionIndex, answers }];

    if (state.round >= state.totalRounds) {
      const maxScore = Math.max(...Object.values(totalScores));
      const leaders = Object.entries(totalScores).filter(([, score]) => score === maxScore);
      return {
        ok: true,
        nextState: {
          ...state,
          answers,
          totalScores,
          roundHistory,
          status: "match-ended",
          isDraw: leaders.length > 1,
          winnerPlayerId: leaders.length === 1 ? leaders[0][0] : null,
        },
      };
    }

    return {
      ok: true,
      nextState: {
        ...state,
        totalScores,
        roundHistory,
        round: state.round + 1,
        answers: {},
      },
    };
  },

  checkOutcome(state) {
    if (state.status !== "match-ended") return { status: "active" };
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    return { status: "draw" };
  },
};
