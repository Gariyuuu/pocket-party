"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FourfallAction, FourfallState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";
import { landingRow } from "./lines";

interface FourfallBoardProps {
  state: FourfallState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: FourfallAction) => void;
  disabled?: boolean;
}

function tokenSeat(state: FourfallState, playerId: string): number {
  return state.players.findIndex((p) => p.playerId === playerId);
}

function tokenColor(state: FourfallState, playerId: string): string {
  return tokenSeat(state, playerId) === 0 ? "var(--color-party-cyan)" : "var(--color-party-pink)";
}

export function FourfallBoard({ state, myPlayerId, players, onAction, disabled }: FourfallBoardProps) {
  const [hoverColumn, setHoverColumn] = useState<number | null>(null);
  const isMyTurn = state.currentTurnPlayerId === myPlayerId && !state.winnerPlayerId && !state.isDraw;
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);
  const canPlay = !disabled && isMyTurn;

  const previewRow = hoverColumn !== null ? landingRow(state.cells, state.columns, state.rows, hoverColumn) : null;

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
              ? "Your turn — pick a column"
              : `${currentPlayer?.nickname ?? "Opponent"}'s turn`}
      </p>

      <div className="inline-flex flex-col gap-1 rounded-2xl border bg-card p-3">
        <div className="flex gap-1">
          {Array.from({ length: state.columns }, (_, col) => (
            <button
              key={col}
              type="button"
              aria-label={`Drop in column ${col + 1}`}
              disabled={!canPlay || landingRow(state.cells, state.columns, state.rows, col) === null}
              onMouseEnter={() => setHoverColumn(col)}
              onMouseLeave={() => setHoverColumn(null)}
              onClick={() => onAction({ type: "drop", column: col })}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-0 sm:size-10"
            >
              <ChevronDown className="size-4" />
            </button>
          ))}
        </div>

        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))` }}
          role="grid"
          aria-label="Fourfall board"
        >
          {Array.from({ length: state.rows }, (_, displayRow) => {
            const actualRow = state.rows - 1 - displayRow;
            return Array.from({ length: state.columns }, (_, col) => {
              const index = actualRow * state.columns + col;
              const owner = state.cells[index];
              const isWinning = state.winningLine?.includes(index) ?? false;
              const isPreview = previewRow === actualRow && hoverColumn === col && !owner;

              return (
                <div
                  key={index}
                  role="gridcell"
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full bg-muted sm:size-11",
                    isWinning && "ring-2 ring-party-lime",
                  )}
                >
                  <AnimatePresence>
                    {owner && (
                      <motion.div
                        initial={{ y: -240, opacity: 0.6 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className="relative flex size-7 items-center justify-center rounded-full sm:size-9"
                        style={{ backgroundColor: tokenColor(state, owner) }}
                      >
                        {/* Colorblind-safe: a shape, not just a color, marks each seat. */}
                        {tokenSeat(state, owner) === 0 ? (
                          <span className="size-2 rounded-full bg-white/90 sm:size-2.5" />
                        ) : (
                          <span className="size-2 bg-white/90 sm:size-2.5" style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
                        )}
                      </motion.div>
                    )}
                    {isPreview && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.35 }}
                        className="size-7 rounded-full sm:size-9"
                        style={{ backgroundColor: tokenColor(state, myPlayerId) }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
