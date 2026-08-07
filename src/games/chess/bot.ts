import { applyMoveToBoard, legalMovesForPlayer, type PseudoMove } from "./moves";
import type { ChessAction, ChessPiece, ChessState } from "./types";

const PIECE_VALUES: Record<ChessPiece["type"], number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };

function materialScore(board: (ChessPiece | null)[], forPlayerId: string): number {
  let score = 0;
  for (const piece of board) {
    if (!piece) continue;
    score += (piece.playerId === forPlayerId ? 1 : -1) * PIECE_VALUES[piece.type];
  }
  return score;
}

function movesWithPromotion(moves: PseudoMove[]): { move: PseudoMove; promotion?: ChessPiece["type"] }[] {
  return moves.map((move) => ({ move, promotion: move.isPromotion ? "queen" : undefined }));
}

export function pickChessMove(
  state: ChessState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): ChessAction {
  const playerIds: [string, string] = [state.players[0].playerId, state.players[1].playerId];
  const opponentId = playerIds.find((id) => id !== botPlayerId)!;
  const forwardRowDeltaFor = (id: string) => (id === playerIds[0] ? -1 : 1);
  const myMoves = legalMovesForPlayer(state.board, botPlayerId, opponentId, forwardRowDeltaFor, state.castlingRights, state.enPassantTarget);

  if (myMoves.length === 0) {
    // Shouldn't be reachable — the engine only calls this when the bot has a legal move.
    return { type: "move", from: 0, to: 0 };
  }

  if (difficulty === "easy") {
    const pick = myMoves[Math.floor(Math.random() * myMoves.length)];
    return toAction(pick);
  }

  const candidates = movesWithPromotion(myMoves);

  if (difficulty === "medium") {
    let best: { move: PseudoMove; promotion?: ChessPiece["type"]; score: number }[] = [];
    let bestScore = -Infinity;
    for (const c of candidates) {
      const board = applyMoveToBoard(state.board, c.move, c.promotion);
      const score = materialScore(board, botPlayerId);
      if (score > bestScore) {
        bestScore = score;
        best = [{ ...c, score }];
      } else if (score === bestScore) {
        best.push({ ...c, score });
      }
    }
    const pick = best[Math.floor(Math.random() * best.length)];
    return toAction(pick.move, pick.promotion);
  }

  // Hard: a 2-ply minimax on material — bot move, then the opponent's best reply.
  let bestScore = -Infinity;
  let bestCandidates: { move: PseudoMove; promotion?: ChessPiece["type"] }[] = [];
  for (const c of candidates) {
    const boardAfterMine = applyMoveToBoard(state.board, c.move, c.promotion);
    const opponentReplies = legalMovesForPlayer(
      boardAfterMine,
      opponentId,
      botPlayerId,
      forwardRowDeltaFor,
      state.castlingRights,
      null,
    );
    let worstCase = materialScore(boardAfterMine, botPlayerId);
    for (const reply of opponentReplies) {
      const boardAfterReply = applyMoveToBoard(boardAfterMine, reply, reply.isPromotion ? "queen" : undefined);
      worstCase = Math.min(worstCase, materialScore(boardAfterReply, botPlayerId));
    }
    if (worstCase > bestScore) {
      bestScore = worstCase;
      bestCandidates = [c];
    } else if (worstCase === bestScore) {
      bestCandidates.push(c);
    }
  }
  const pick = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
  return toAction(pick.move, pick.promotion);
}

function toAction(move: PseudoMove, promotion?: ChessPiece["type"]): ChessAction {
  return { type: "move", from: move.from, to: move.to, promotion };
}
