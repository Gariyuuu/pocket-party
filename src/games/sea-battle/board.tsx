"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validateFleet, randomFleetPlacement } from "./placement";
import { SHIP_NAMES } from "./constants";
import type { SeaBattleAction, SeaBattleState, ShipPlacement } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

interface SeaBattleBoardProps {
  state: SeaBattleState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: SeaBattleAction) => void;
  disabled?: boolean;
}

export function SeaBattleBoard({ state, myPlayerId, players, onAction, disabled }: SeaBattleBoardProps) {
  const [draft, setDraft] = useState<ShipPlacement[]>([]);
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");

  const myFleet = state.fleets[myPlayerId];
  const opponent = state.players.find((p) => p.playerId !== myPlayerId);
  const opponentFleet = opponent ? state.fleets[opponent.playerId] : null;
  const isMyTurn = state.status === "battling" && state.currentTurnPlayerId === myPlayerId && !state.winnerPlayerId;
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);

  useEffect(() => {
    if (state.status !== "placing" || myFleet != null) return;
    if (draft.length < state.shipLengths.length) return;
    onAction({ type: "place-ships", placements: draft });
  }, [draft, state.status, state.shipLengths.length, myFleet, onAction]);

  if (state.status === "placing" && myFleet == null) {
    const shipIndex = draft.length;
    const length = state.shipLengths[shipIndex];
    const occupied = new Set(draft.flatMap((s) => s.cells));

    function tryPlace(startCell: number) {
      const row = Math.floor(startCell / state.boardSize);
      const col = startCell % state.boardSize;
      const cells: number[] = [];
      for (let i = 0; i < length; i++) {
        const r = orientation === "horizontal" ? row : row + i;
        const c = orientation === "horizontal" ? col + i : col;
        if (r >= state.boardSize || c >= state.boardSize) return;
        cells.push(r * state.boardSize + c);
      }
      const candidateLengths = [...draft.map((s) => s.cells.length), length];
      const error = validateFleet([...draft, { cells }], candidateLengths, state.boardSize);
      if (error) return;
      setDraft([...draft, { cells }]);
    }

    return (
      <div className="flex w-full flex-col items-center gap-4">
        <p className="text-center font-medium">
          Place your {SHIP_NAMES[shipIndex]} ({length} cells) — {orientation}
        </p>
        <div
          className="grid gap-1 rounded-2xl border bg-card p-2"
          style={{ gridTemplateColumns: `repeat(${state.boardSize}, minmax(0, 1fr))` }}
          role="grid"
          aria-label="Your fleet placement grid"
        >
          {Array.from({ length: state.boardSize * state.boardSize }, (_, i) => (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={`Placement cell ${i}`}
              onClick={() => tryPlace(i)}
              className={cn(
                "size-8 rounded-md border-2 border-transparent bg-party-cyan/20 transition-colors hover:bg-party-cyan/40 sm:size-9",
                occupied.has(i) && "bg-party-cyan text-white",
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"))}
          >
            Rotate
          </Button>
          <Button variant="outline" onClick={() => setDraft(randomFleetPlacement(state.shipLengths, state.boardSize))}>
            Randomize
          </Button>
          {draft.length > 0 && (
            <Button variant="ghost" onClick={() => setDraft([])}>
              Clear
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (state.status === "placing") {
    return <p className="text-center font-medium">Waiting for {opponent?.nickname ?? "your opponent"} to place their fleet…</p>;
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center font-medium" aria-live="polite">
        {state.winnerPlayerId
          ? state.winnerPlayerId === myPlayerId
            ? "You sank the enemy fleet — you won!"
            : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : isMyTurn
            ? "Your turn — fire on enemy waters"
            : `${currentPlayer?.nickname ?? "Opponent"}'s turn`}
      </p>

      {state.lastShot && (
        <Badge variant={state.lastShot.hit ? "destructive" : "outline"}>
          {state.lastShot.sunkShipLength
            ? `Sunk a ${state.lastShot.sunkShipLength}-cell ship!`
            : state.lastShot.hit
              ? "Hit!"
              : "Miss"}
        </Badge>
      )}

      <div className="flex flex-wrap justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Enemy waters</span>
          <div
            className="grid gap-1 rounded-2xl border bg-card p-2"
            style={{ gridTemplateColumns: `repeat(${state.boardSize}, minmax(0, 1fr))` }}
            role="grid"
            aria-label="Enemy waters — tap to fire"
          >
            {Array.from({ length: state.boardSize * state.boardSize }, (_, i) => {
              const fired = state.shots[myPlayerId]?.includes(i);
              const hit = fired && opponentFleet?.some((s) => s.cells.includes(i));
              const canFire = isMyTurn && !disabled && !fired;
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  disabled={!canFire}
                  aria-label={fired ? (hit ? "Hit" : "Miss") : "Unknown water"}
                  onClick={() => onAction({ type: "fire", cellIndex: i })}
                  className={cn(
                    "size-8 rounded-md border bg-party-cyan/15 transition-colors sm:size-9",
                    canFire && "cursor-pointer hover:bg-party-cyan/35",
                    fired && hit && "bg-party-pink text-white",
                    fired && !hit && "bg-muted",
                  )}
                >
                  {fired ? (hit ? "✕" : "•") : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Your fleet</span>
          <div
            className="grid gap-1 rounded-2xl border bg-card p-2"
            style={{ gridTemplateColumns: `repeat(${state.boardSize}, minmax(0, 1fr))` }}
            role="grid"
            aria-label="Your fleet"
          >
            {Array.from({ length: state.boardSize * state.boardSize }, (_, i) => {
              const ship = myFleet?.find((s) => s.cells.includes(i));
              const hit = ship?.hits.includes(i);
              return (
                <div
                  key={i}
                  role="gridcell"
                  aria-label={ship ? (hit ? "Your ship, hit" : "Your ship") : "Empty water"}
                  className={cn(
                    "size-8 rounded-md border sm:size-9",
                    ship ? "bg-party-violet/60" : "bg-party-cyan/10",
                    hit && "bg-party-pink",
                  )}
                >
                  {hit ? "✕" : ""}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
