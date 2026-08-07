import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { createSeededRng, shuffle } from "@/games/core/rng";
import { pickDecoys, pickPrompt } from "./prompts";
import {
  DRAWING_DURATION_MS,
  MAX_GUESS_POINTS,
  MIN_GUESS_POINTS,
  OPTION_COUNT,
  POINTS_PER_CORRECT_GUESSER,
} from "./constants";
import type { QuickDrawAction, QuickDrawState } from "./types";

function buildRound(seed: string, round: number, usedPrompts: string[]) {
  const rng = createSeededRng(`${seed}:quick-draw:${round}`);
  const promptWord = pickPrompt(rng, new Set(usedPrompts));
  const decoys = pickDecoys(rng, promptWord, OPTION_COUNT - 1);
  const options = shuffle(rng, [promptWord, ...decoys]);
  return { promptWord, options, correctIndex: options.indexOf(promptWord) };
}

export const quickDrawEngine: GameEngine<QuickDrawState, QuickDrawAction> = {
  gameId: "quick-draw",

  createInitialState({ seed, players, now }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const round1 = buildRound(seed, 1, []);

    return {
      players: ordered,
      seed,
      round: 1,
      totalRounds: ordered.length,
      artistPlayerId: ordered[0].playerId,
      promptWord: round1.promptWord,
      options: round1.options,
      correctIndex: round1.correctIndex,
      roundStartedAt: now,
      roundEndsAt: now + DRAWING_DURATION_MS,
      roundDurationMs: DRAWING_DURATION_MS,
      guesses: {},
      roundHistory: [],
      totalScores: Object.fromEntries(ordered.map((p) => [p.playerId, 0])),
      status: "drawing",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<QuickDrawState> {
    if (state.status !== "drawing") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }

    if (action.type === "submit-guess") {
      if (fromPlayerId === state.artistPlayerId) {
        return { ok: false, reason: "wrong_player", message: "The artist doesn't guess." };
      }
      if (state.guesses[fromPlayerId]) {
        return { ok: false, reason: "duplicate_action", message: "You already guessed this round." };
      }
      if (!Number.isInteger(action.answerIndex) || action.answerIndex < 0 || action.answerIndex >= state.options.length) {
        return { ok: false, reason: "invalid_move", message: "That's not a valid option." };
      }

      return {
        ok: true,
        nextState: {
          ...state,
          guesses: {
            ...state.guesses,
            [fromPlayerId]: { answerIndex: action.answerIndex, guessedAt: action.now },
          },
        },
      };
    }

    if (action.type === "advance-round") {
      const scores: Record<string, number> = {};
      let correctGuessers = 0;

      for (const [playerId, guess] of Object.entries(state.guesses)) {
        const isCorrect = guess.answerIndex === state.correctIndex;
        if (!isCorrect) {
          scores[playerId] = 0;
          continue;
        }
        correctGuessers += 1;
        const elapsed = Math.max(0, guess.guessedAt - state.roundStartedAt);
        const remainingFraction = Math.max(0, Math.min(1, 1 - elapsed / state.roundDurationMs));
        scores[playerId] = Math.round(MIN_GUESS_POINTS + (MAX_GUESS_POINTS - MIN_GUESS_POINTS) * remainingFraction);
      }
      scores[state.artistPlayerId] = correctGuessers * POINTS_PER_CORRECT_GUESSER;

      const totalScores = { ...state.totalScores };
      for (const [playerId, points] of Object.entries(scores)) {
        totalScores[playerId] = (totalScores[playerId] ?? 0) + points;
      }
      const roundHistory = [...state.roundHistory, { correctIndex: state.correctIndex, scores }];

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
      const usedPrompts = roundHistory.length > 0 ? [state.promptWord] : [];
      const built = buildRound(state.seed, nextRound, usedPrompts);
      const nextArtist = state.players[(nextRound - 1) % state.players.length];

      return {
        ok: true,
        nextState: {
          ...state,
          totalScores,
          roundHistory,
          round: nextRound,
          artistPlayerId: nextArtist.playerId,
          promptWord: built.promptWord,
          options: built.options,
          correctIndex: built.correctIndex,
          roundStartedAt: action.now,
          roundEndsAt: action.now + state.roundDurationMs,
          guesses: {},
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
