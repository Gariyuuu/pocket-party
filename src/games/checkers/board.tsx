"use client";

import { useMemo, useState } from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOARD_SIZE, hasAnyCapture, jumpOptions, rowColOf, stepOptions } from "./moves";
import type { CheckersAction, CheckersPiece, CheckersState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

function simulatePartial(board: (CheckersPiece | null)[], from: number, path: number[], forwardRowDelta: number) {
  let current = from;
  const piece = board[current]!;
  const draft = [...board];
  for (const to of path) {
    const jump = jumpOptions(draft, current, piece, forwardRowDelta).find((j) => j.to === to);
    if (jump) {
      draft[jump.captured] = null;
      draft[current] = null;
      draft[to] = piece;
      current = to;
      continue;
    }
    const step = stepOptions(draft, current, piece, forwardRowDelta).find((s) => s.to === to);
    if (step) {
      draft[current] = null;
      draft[to] = piece;
      current = to;
    }
  }
  return { board: draft, current, piece };
}

export function CheckersBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: CheckersState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: CheckersAction) => void;
  disabled?: boolean;
}) {
  const [selectedFrom, setSelectedFrom] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);

  const isMyTurn = state.currentTurnPlayerId === myPlayerId && !state.winnerPlayerId;
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);
  const forwardRowDelta = state.players[0].playerId === myPlayerId ? 1 : -1;
  const mustCapture = isMyTurn && hasAnyCapture(state.board, myPlayerId, (id) => (id === state.players[0].playerId ? 1 : -1));

  const legalDestinations = useMemo(() => {
    if (selectedFrom === null) return [] as number[];
    const { board, current, piece } = simulatePartial(state.board, selectedFrom, path, forwardRowDelta);
    const jumps = jumpOptions(board, current, piece, forwardRowDelta).map((j) => j.to);
    if (jumps.length > 0 || path.length > 0) return jumps;
    return mustCapture ? [] : stepOptions(board, current, piece, forwardRowDelta).map((s) => s.to);
  }, [selectedFrom, path, state.board, forwardRowDelta, mustCapture]);

  function submit(finalPath: number[]) {
    onAction({ type: "move", from: selectedFrom!, path: finalPath });
    setSelectedFrom(null);
    setPath([]);
  }

  function handleCellClick(cell: number) {
    if (disabled || !isMyTurn) return;
    const piece = state.board[cell];

    if (selectedFrom === null) {
      if (piece?.playerId === myPlayerId) setSelectedFrom(cell);
      return;
    }
    if (cell === selectedFrom && path.length === 0) {
      setSelectedFrom(null);
      return;
    }
    if (!legalDestinations.includes(cell)) {
      if (piece?.playerId === myPlayerId) {
        setSelectedFrom(cell);
        setPath([]);
      }
      return;
    }

    const newPath = [...path, cell];
    const { board: afterBoard, current, piece: movingPiece } = simulatePartial(state.board, selectedFrom, newPath, forwardRowDelta);
    const canContinueJump = jumpOptions(afterBoard, current, movingPiece, forwardRowDelta).length > 0;
    if (canContinueJump) {
      setPath(newPath);
    } else {
      submit(newPath);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center font-medium" aria-live="polite">
        {state.winnerPlayerId
          ? state.winnerPlayerId === myPlayerId
            ? "You won!"
            : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : isMyTurn
            ? mustCapture
              ? "Your turn — a capture is available, you must take it"
              : "Your turn"
            : `${currentPlayer?.nickname ?? "Opponent"}'s turn`}
      </p>

      {path.length > 0 && (
        <button type="button" className="text-sm text-muted-foreground underline" onClick={() => submit(path)}>
          Stop jumping here
        </button>
      )}

      <div
        className="grid gap-0.5 rounded-2xl border bg-card p-2"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Checkers board"
      >
        {state.board.map((cellPiece, index) => {
          const [row, col] = rowColOf(index);
          const isDark = (row + col) % 2 === 1;
          const isSelected = index === selectedFrom || path.includes(index);
          const isLegalTarget = legalDestinations.includes(index);
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              disabled={!isDark || disabled}
              aria-label={cellPiece ? `${cellPiece.playerId === myPlayerId ? "Your" : "Opponent"} piece${cellPiece.isKing ? ", king" : ""}` : "Empty square"}
              onClick={() => isDark && handleCellClick(index)}
              className={cn(
                "flex size-9 items-center justify-center sm:size-11",
                isDark ? "bg-party-violet/25" : "bg-card",
                isDark && isLegalTarget && "bg-party-lime/40",
                isSelected && "ring-2 ring-party-pink",
              )}
            >
              {cellPiece && (
                <span
                  className="flex size-7 items-center justify-center rounded-full border-2 border-white sm:size-9"
                  style={{
                    backgroundColor:
                      cellPiece.playerId === state.players[0].playerId ? "var(--color-player-1)" : "var(--color-player-2)",
                  }}
                >
                  {cellPiece.isKing && <Crown className="size-4 text-white" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
