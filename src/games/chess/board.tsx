"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { legalMovesForPlayer, rowColOf, SIZE } from "./moves";
import type { ChessAction, ChessPieceType, ChessState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

const WHITE_GLYPHS: Record<ChessPieceType, string> = {
  king: "♔",
  queen: "♕",
  rook: "♖",
  bishop: "♗",
  knight: "♘",
  pawn: "♙",
};
const BLACK_GLYPHS: Record<ChessPieceType, string> = {
  king: "♚",
  queen: "♛",
  rook: "♜",
  bishop: "♝",
  knight: "♞",
  pawn: "♟",
};
const PROMOTION_CHOICES: ChessPieceType[] = ["queen", "rook", "bishop", "knight"];

export function ChessBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: ChessState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: ChessAction) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: number; to: number } | null>(null);

  const isWhite = state.players[0].playerId === myPlayerId;
  const isMyTurn = state.currentTurnPlayerId === myPlayerId && state.status === "active";
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);
  const opponentId = state.players.find((p) => p.playerId !== myPlayerId)?.playerId;

  const forwardRowDeltaFor = (id: string) => (id === state.players[0].playerId ? -1 : 1);
  const myLegalMoves = useMemo(() => {
    if (!isMyTurn || !opponentId) return [];
    return legalMovesForPlayer(state.board, myPlayerId, opponentId, forwardRowDeltaFor, state.castlingRights, state.enPassantTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, state.board, state.castlingRights, state.enPassantTarget, myPlayerId, opponentId]);

  const destinations = selected !== null ? myLegalMoves.filter((m) => m.from === selected).map((m) => m.to) : [];

  function handleCellClick(cell: number) {
    if (disabled || !isMyTurn || pendingPromotion) return;
    const piece = state.board[cell];
    if (selected === null) {
      if (piece?.playerId === myPlayerId) setSelected(cell);
      return;
    }
    if (cell === selected) {
      setSelected(null);
      return;
    }
    if (!destinations.includes(cell)) {
      if (piece?.playerId === myPlayerId) setSelected(cell);
      else setSelected(null);
      return;
    }
    const move = myLegalMoves.find((m) => m.from === selected && m.to === cell)!;
    if (move.isPromotion) {
      setPendingPromotion({ from: selected, to: cell });
    } else {
      onAction({ type: "move", from: selected, to: cell });
    }
    setSelected(null);
  }

  function choosePromotion(piece: ChessPieceType) {
    if (!pendingPromotion) return;
    onAction({ type: "move", from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece });
    setPendingPromotion(null);
  }

  // White's own view is upside-down from Black's — always render "my" side at the bottom.
  const displayCells = useMemo(() => {
    const indices = Array.from({ length: SIZE * SIZE }, (_, i) => i);
    return isWhite ? indices : [...indices].reverse();
  }, [isWhite]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center font-medium" aria-live="polite">
        {state.status === "checkmate"
          ? state.winnerPlayerId === myPlayerId
            ? "Checkmate — you won!"
            : `Checkmate — ${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : state.status === "stalemate"
            ? "Stalemate — it's a draw"
            : state.status === "draw"
              ? "Draw"
              : isMyTurn
                ? state.lastMove?.isCheck
                  ? "Check! Your turn"
                  : "Your turn"
                : `${currentPlayer?.nickname ?? "Opponent"}'s turn`}
      </p>

      <div
        className="grid overflow-hidden rounded-2xl border"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Chess board"
      >
        {displayCells.map((cell) => {
          const [row, col] = rowColOf(cell);
          const isLight = (row + col) % 2 === 0;
          const piece = state.board[cell];
          const glyph = piece ? (piece.playerId === state.players[0].playerId ? WHITE_GLYPHS : BLACK_GLYPHS)[piece.type] : null;
          const isSelected = cell === selected;
          const isDestination = destinations.includes(cell);
          const isLastMove = state.lastMove && (cell === state.lastMove.from || cell === state.lastMove.to);
          return (
            <button
              key={cell}
              type="button"
              role="gridcell"
              disabled={disabled}
              aria-label={piece ? `${piece.playerId === myPlayerId ? "Your" : "Opponent's"} ${piece.type}` : "Empty square"}
              onClick={() => handleCellClick(cell)}
              className={cn(
                "flex size-9 items-center justify-center text-2xl transition-colors sm:size-11 sm:text-3xl",
                isLight ? "bg-party-amber/15" : "bg-party-violet/25",
                isLastMove && "bg-party-lime/30",
                isDestination && "ring-2 ring-inset ring-party-pink",
                isSelected && "ring-2 ring-inset ring-white",
              )}
            >
              {glyph}
            </button>
          );
        })}
      </div>

      {pendingPromotion && (
        <div className="flex flex-col items-center gap-2">
          <Badge variant="secondary">Promote to:</Badge>
          <div className="flex gap-2">
            {PROMOTION_CHOICES.map((choice) => (
              <Button key={choice} variant="outline" onClick={() => choosePromotion(choice)}>
                {(isWhite ? WHITE_GLYPHS : BLACK_GLYPHS)[choice]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
