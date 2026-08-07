import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { initialChessBoard } from "./board-setup";
import { applyMoveToBoard, cellAt, isInCheck, legalMovesForPlayer, rowColOf } from "./moves";
import { pickChessMove } from "./bot";
import type { CastlingRights, ChessAction, ChessPiece, ChessState } from "./types";

const PROMOTION_CHOICES = ["queen", "rook", "bishop", "knight"] as const;

function recomputeCastlingRights(board: (ChessPiece | null)[], playerIds: [string, string]): CastlingRights {
  const kingSide: Record<string, boolean> = {};
  const queenSide: Record<string, boolean> = {};
  for (const id of playerIds) {
    const isWhite = id === playerIds[0];
    const kingCell = isWhite ? 7 * 8 + 4 : 0 * 8 + 4;
    const kingSideRookCell = isWhite ? 7 * 8 + 7 : 0 * 8 + 7;
    const queenSideRookCell = isWhite ? 7 * 8 + 0 : 0 * 8 + 0;
    const king = board[kingCell];
    const kingInPlace = king?.type === "king" && king.playerId === id;
    const ksRook = board[kingSideRookCell];
    const qsRook = board[queenSideRookCell];
    kingSide[id] = Boolean(kingInPlace && ksRook?.type === "rook" && ksRook.playerId === id);
    queenSide[id] = Boolean(kingInPlace && qsRook?.type === "rook" && qsRook.playerId === id);
  }
  return { kingSide, queenSide };
}

export const chessEngine: GameEngine<ChessState, ChessAction> = {
  gameId: "chess",

  createInitialState({ players }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const playerIds: [string, string] = [ordered[0].playerId, ordered[1].playerId];
    const board = initialChessBoard(playerIds);
    return {
      players: ordered,
      board,
      currentTurnPlayerId: playerIds[0],
      castlingRights: recomputeCastlingRights(board, playerIds),
      enPassantTarget: null,
      halfmoveClock: 0,
      lastMove: null,
      status: "active",
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<ChessState> {
    if (state.status !== "active") {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }
    if (action.type !== "move") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }

    const playerIds: [string, string] = [state.players[0].playerId, state.players[1].playerId];
    const opponentId = playerIds.find((id) => id !== fromPlayerId)!;
    const forwardRowDeltaFor = (id: string) => (id === playerIds[0] ? -1 : 1);
    const piece = state.board[action.from];
    if (!piece || piece.playerId !== fromPlayerId) {
      return { ok: false, reason: "invalid_move", message: "That's not a piece you can move." };
    }

    const legalMoves = legalMovesForPlayer(state.board, fromPlayerId, opponentId, forwardRowDeltaFor, state.castlingRights, state.enPassantTarget);
    const move = legalMoves.find((m) => m.from === action.from && m.to === action.to);
    if (!move) {
      return { ok: false, reason: "invalid_move", message: "That's not a legal move." };
    }

    let promotion = action.promotion;
    if (move.isPromotion) {
      if (!promotion || !PROMOTION_CHOICES.includes(promotion as (typeof PROMOTION_CHOICES)[number])) {
        return { ok: false, reason: "malformed_payload", message: "Choose a piece to promote to." };
      }
    } else {
      promotion = undefined;
    }

    const capturedPiece = move.isEnPassant
      ? { type: "pawn" as const }
      : state.board[move.to]
        ? { type: state.board[move.to]!.type }
        : null;

    const board = applyMoveToBoard(state.board, move, promotion);
    const castlingRights = recomputeCastlingRights(board, playerIds);

    let enPassantTarget: number | null = null;
    const [fromRow] = rowColOf(move.from);
    const [toRow, toCol] = rowColOf(move.to);
    if (piece.type === "pawn" && Math.abs(toRow - fromRow) === 2) {
      enPassantTarget = cellAt((fromRow + toRow) / 2, toCol);
    }

    const halfmoveClock = piece.type === "pawn" || capturedPiece ? 0 : state.halfmoveClock + 1;

    const opponentLegalMoves = legalMovesForPlayer(board, opponentId, fromPlayerId, forwardRowDeltaFor, castlingRights, enPassantTarget);
    const opponentInCheck = isInCheck(board, opponentId, fromPlayerId, forwardRowDeltaFor);

    let status: ChessState["status"] = "active";
    let winnerPlayerId: string | null = null;
    let isDraw = false;
    if (opponentLegalMoves.length === 0) {
      if (opponentInCheck) {
        status = "checkmate";
        winnerPlayerId = fromPlayerId;
      } else {
        status = "stalemate";
        isDraw = true;
      }
    } else if (halfmoveClock >= 100) {
      status = "draw";
      isDraw = true;
    }

    return {
      ok: true,
      nextState: {
        ...state,
        board,
        castlingRights,
        enPassantTarget,
        halfmoveClock,
        lastMove: {
          from: move.from,
          to: move.to,
          piece: piece.type,
          captured: capturedPiece?.type ?? null,
          promotion: promotion ?? null,
          isCastle: Boolean(move.isCastleKingSide || move.isCastleQueenSide),
          isEnPassant: Boolean(move.isEnPassant),
          isCheck: opponentInCheck,
        },
        status,
        winnerPlayerId,
        isDraw,
        currentTurnPlayerId: winnerPlayerId || isDraw ? state.currentTurnPlayerId : opponentId,
      },
    };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    if (state.isDraw) return { status: "draw" };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickChessMove(state, botPlayerId, difficulty);
  },
};
