"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GridThreeAction, GridThreeState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

interface GridThreeBoardProps {
  state: GridThreeState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: GridThreeAction) => void;
  disabled?: boolean;
}

function symbolFor(state: GridThreeState, playerId: string) {
  const seat = state.players.findIndex((p) => p.playerId === playerId);
  return seat === 0 ? X : Circle;
}

export function GridThreeBoard({ state, myPlayerId, players, onAction, disabled }: GridThreeBoardProps) {
  const isMyTurn = state.currentTurnPlayerId === myPlayerId && !state.winnerPlayerId && !state.isDraw;
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center font-medium" aria-live="polite">
        {state.winnerPlayerId
          ? state.winnerPlayerId === myPlayerId
            ? "You won!"
            : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : state.isDraw
            ? "It's a draw"
            : isMyTurn
              ? "Your turn"
              : `${currentPlayer?.nickname ?? "Opponent"}'s turn`}
      </p>

      <div
        className={cn(
          "grid gap-2 rounded-2xl border bg-card p-3",
          state.boardSize === 3 ? "grid-cols-3" : "grid-cols-5",
        )}
        role="grid"
        aria-label="Grid Three board"
      >
        {state.cells.map((cell, index) => {
          const Symbol = cell ? symbolFor(state, cell) : null;
          const isWinning = state.winningLine?.includes(index) ?? false;
          const canPlay = !disabled && isMyTurn && cell === null;

          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              aria-label={cell ? `Occupied cell ${index + 1}` : `Empty cell ${index + 1}`}
              data-cell-index={index}
              disabled={!canPlay}
              onClick={() => onAction({ type: "place", cellIndex: index })}
              className={cn(
                "flex items-center justify-center rounded-xl border-2 border-transparent bg-muted transition-colors",
                state.boardSize === 3 ? "size-20 sm:size-24" : "size-12 sm:size-16",
                canPlay && "hover:bg-muted/70 cursor-pointer",
                isWinning && "border-party-lime bg-party-lime/10",
              )}
            >
              <AnimatePresence>
                {Symbol && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Symbol
                      className={cn(
                        state.boardSize === 3 ? "size-10" : "size-6",
                        cell === myPlayerId ? "text-primary" : "text-party-pink",
                      )}
                      strokeWidth={3}
                    />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </div>
  );
}
