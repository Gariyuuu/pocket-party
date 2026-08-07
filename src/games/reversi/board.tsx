"use client";

import { cn } from "@/lib/utils";
import { BOARD_SIZE, legalMoves, rowColOf } from "./moves";
import type { ReversiAction, ReversiState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

export function ReversiBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: ReversiState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: ReversiAction) => void;
  disabled?: boolean;
}) {
  const isMyTurn = state.currentTurnPlayerId === myPlayerId && state.status === "active";
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);
  const opponentId = state.players.find((p) => p.playerId !== myPlayerId)?.playerId;

  const legalTargets = isMyTurn && opponentId ? legalMoves(state.board, myPlayerId, opponentId) : [];

  function handleCellClick(cell: number) {
    if (disabled || !isMyTurn || !legalTargets.includes(cell)) return;
    onAction({ type: "place", cell });
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center font-medium" aria-live="polite">
        {state.status === "finished"
          ? state.isDraw
            ? "It's a draw!"
            : state.winnerPlayerId === myPlayerId
              ? "You won!"
              : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : isMyTurn
            ? "Your turn"
            : `${currentPlayer?.nickname ?? "Opponent"}'s turn`}
      </p>

      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-white" style={{ backgroundColor: "var(--color-player-1)" }} />
          {players.find((p) => p.playerId === state.players[0].playerId)?.nickname ?? "P1"}:{" "}
          {state.board.filter((cell) => cell === state.players[0].playerId).length}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-white" style={{ backgroundColor: "var(--color-player-2)" }} />
          {players.find((p) => p.playerId === state.players[1].playerId)?.nickname ?? "P2"}:{" "}
          {state.board.filter((cell) => cell === state.players[1].playerId).length}
        </span>
      </div>

      <div
        className="grid gap-0.5 rounded-2xl border bg-party-lime/20 p-2"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Reversi board"
      >
        {state.board.map((occupant, index) => {
          const [row, col] = rowColOf(index);
          const isLegalTarget = legalTargets.includes(index);
          const isLastMove = state.lastMove?.cell === index || state.lastMove?.flipped.includes(index);
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              disabled={disabled}
              aria-label={
                occupant
                  ? `${occupant === myPlayerId ? "Your" : "Opponent's"} disc`
                  : isLegalTarget
                    ? "Legal move"
                    : "Empty square"
              }
              onClick={() => handleCellClick(index)}
              className={cn(
                "flex size-9 items-center justify-center rounded-sm bg-party-lime/40 transition-colors sm:size-11",
                (row + col) % 2 === 0 && "bg-party-lime/30",
                isLegalTarget && "ring-2 ring-inset ring-party-pink/70",
                isLastMove && occupant && "ring-2 ring-inset ring-white/80",
              )}
            >
              {occupant ? (
                <span
                  className="size-7 rounded-full border-2 border-white shadow-sm sm:size-9"
                  style={{ backgroundColor: occupant === state.players[0].playerId ? "var(--color-player-1)" : "var(--color-player-2)" }}
                />
              ) : (
                isLegalTarget && <span className="size-2.5 rounded-full bg-party-pink/70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
