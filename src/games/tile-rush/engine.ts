import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { createSeededRng } from "@/games/core/rng";
import { generateInitialBoard } from "./board-gen";
import { clearAndRefill, columnIndices, findConnectedGroup, rowIndices, shuffleColors } from "./matching";
import { BOARD_SIZE, CHAIN_BONUS_PER_TILE, FREEZE_DURATION_MS, MIN_GROUP_SIZE, MULTIPLIER_CHARGES_GRANTED, ROUND_DURATION_MS } from "./constants";
import type { PlayerBoard, PowerUpType, TileRushAction, TileRushState } from "./types";

export const tileRushEngine: GameEngine<TileRushState, TileRushAction> = {
  gameId: "tile-rush",

  createInitialState({ seed, players, now }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const sharedBoard = generateInitialBoard(createSeededRng(`${seed}:tile-rush:board`));

    const boardsByPlayer: Record<string, PlayerBoard> = {};
    for (const p of ordered) {
      boardsByPlayer[p.playerId] = {
        tiles: sharedBoard.map((t) => ({ ...t })),
        score: 0,
        moveCount: 0,
        multiplierCharges: 0,
        freezeUntil: 0,
        lastClear: null,
      };
    }

    return {
      players: ordered,
      seed,
      roundEndsAt: now + ROUND_DURATION_MS,
      roundDurationMs: ROUND_DURATION_MS,
      boardsByPlayer,
      status: "active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<TileRushState> {
    if (state.status !== "active") {
      return { ok: false, reason: "match_not_active", message: "This round already ended." };
    }

    if (action.type === "end-round") {
      const scores = state.players.map((p) => state.boardsByPlayer[p.playerId]?.score ?? 0);
      const maxScore = Math.max(...scores);
      const leaders = state.players.filter((p) => (state.boardsByPlayer[p.playerId]?.score ?? 0) === maxScore);
      return {
        ok: true,
        nextState: {
          ...state,
          status: "completed",
          isDraw: leaders.length > 1,
          winnerPlayerId: leaders.length === 1 ? leaders[0].playerId : null,
        },
      };
    }

    if (action.type !== "clear-tile") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }

    const board = state.boardsByPlayer[fromPlayerId];
    if (!board) {
      return { ok: false, reason: "wrong_player", message: "You don't have a board in this match." };
    }
    if (
      !Number.isInteger(action.row) ||
      !Number.isInteger(action.col) ||
      action.row < 0 ||
      action.row >= BOARD_SIZE ||
      action.col < 0 ||
      action.col >= BOARD_SIZE
    ) {
      return { ok: false, reason: "invalid_move", message: "That's off the board." };
    }

    const startIndex = action.row * BOARD_SIZE + action.col;
    const group = findConnectedGroup(board.tiles, startIndex);
    if (group.length < MIN_GROUP_SIZE) {
      return { ok: false, reason: "invalid_move", message: "No match there." };
    }

    const usingMultiplier = board.multiplierCharges > 0;
    const basePoints = group.length * group.length * (usingMultiplier ? 2 : 1);

    const cleared = new Set(group);
    const powerUps = new Set<PowerUpType>();
    for (const index of group) {
      const p = board.tiles[index].powerUp;
      if (p) powerUps.add(p);
    }

    let bonusPoints = 0;
    if (powerUps.has("row-clear")) {
      for (const index of rowIndices(action.row)) {
        if (!cleared.has(index)) {
          cleared.add(index);
          bonusPoints += CHAIN_BONUS_PER_TILE;
        }
      }
    }
    if (powerUps.has("column-clear")) {
      for (const index of columnIndices(action.col)) {
        if (!cleared.has(index)) {
          cleared.add(index);
          bonusPoints += CHAIN_BONUS_PER_TILE;
        }
      }
    }

    const rng = createSeededRng(`${state.seed}:tile-rush:${fromPlayerId}:fill:${board.moveCount}`);
    let nextTiles = clearAndRefill(board.tiles, cleared, rng);
    if (powerUps.has("shuffle")) nextTiles = shuffleColors(nextTiles, rng);

    const multiplierCharges = Math.max(
      0,
      board.multiplierCharges - (usingMultiplier ? 1 : 0) + (powerUps.has("multiplier") ? MULTIPLIER_CHARGES_GRANTED : 0),
    );
    const freezeUntil = powerUps.has("freeze") ? action.now + FREEZE_DURATION_MS : board.freezeUntil;
    const points = basePoints + bonusPoints;

    const nextBoard: PlayerBoard = {
      tiles: nextTiles,
      score: board.score + points,
      moveCount: board.moveCount + 1,
      multiplierCharges,
      freezeUntil,
      lastClear: { clearedCount: cleared.size, points, powerUps: [...powerUps] },
    };

    return {
      ok: true,
      nextState: {
        ...state,
        boardsByPlayer: { ...state.boardsByPlayer, [fromPlayerId]: nextBoard },
      },
    };
  },

  checkOutcome(state) {
    if (state.status !== "completed") return { status: "active" };
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    return { status: "draw" };
  },
};
