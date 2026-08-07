"use client";

import { cn } from "@/lib/utils";
import { BOX_COLS, BOX_ROWS, boxIndex, horizontalEdge, verticalEdge } from "./moves";
import type { DotsAndBoxesAction, DotsAndBoxesState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

export function DotsAndBoxesBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: DotsAndBoxesState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: DotsAndBoxesAction) => void;
  disabled?: boolean;
}) {
  const isMyTurn = state.currentTurnPlayerId === myPlayerId && state.status === "active";
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);

  function claim(edge: number) {
    if (disabled || !isMyTurn || state.edges[edge]) return;
    onAction({ type: "claim-edge", edge });
  }

  const gridRows = BOX_ROWS * 2 + 1;
  const gridCols = BOX_COLS * 2 + 1;

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
          <span className="size-3 rounded-sm" style={{ backgroundColor: "var(--color-player-1)" }} />
          {players.find((p) => p.playerId === state.players[0].playerId)?.nickname ?? "P1"}:{" "}
          {state.boxOwners.filter((owner) => owner === state.players[0].playerId).length}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: "var(--color-player-2)" }} />
          {players.find((p) => p.playerId === state.players[1].playerId)?.nickname ?? "P2"}:{" "}
          {state.boxOwners.filter((owner) => owner === state.players[1].playerId).length}
        </span>
      </div>

      <div
        className="grid rounded-2xl border bg-card p-4"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
          width: "min(88vw, 400px)",
          height: "min(88vw, 400px)",
        }}
        role="grid"
        aria-label="Dots and Boxes board"
      >
        {Array.from({ length: gridRows * gridCols }, (_, i) => {
          const gridRow = Math.floor(i / gridCols);
          const gridCol = i % gridCols;
          const rowIsEven = gridRow % 2 === 0;
          const colIsEven = gridCol % 2 === 0;

          if (rowIsEven && colIsEven) {
            return <div key={i} className="m-auto size-2 rounded-full bg-foreground/50" />;
          }

          if (rowIsEven && !colIsEven) {
            const edge = horizontalEdge(gridRow / 2, (gridCol - 1) / 2);
            const claimed = state.edges[edge];
            return (
              <button
                key={i}
                type="button"
                disabled={disabled || claimed || !isMyTurn}
                aria-label={claimed ? "Line claimed" : "Claim this line"}
                onClick={() => claim(edge)}
                className={cn(
                  "m-auto h-1.5 w-full rounded-full transition-colors",
                  claimed ? "bg-party-violet" : "bg-foreground/15 enabled:hover:bg-party-pink/60",
                )}
              />
            );
          }

          if (!rowIsEven && colIsEven) {
            const edge = verticalEdge((gridRow - 1) / 2, gridCol / 2);
            const claimed = state.edges[edge];
            return (
              <button
                key={i}
                type="button"
                disabled={disabled || claimed || !isMyTurn}
                aria-label={claimed ? "Line claimed" : "Claim this line"}
                onClick={() => claim(edge)}
                className={cn(
                  "m-auto h-full w-1.5 rounded-full transition-colors",
                  claimed ? "bg-party-violet" : "bg-foreground/15 enabled:hover:bg-party-pink/60",
                )}
              />
            );
          }

          const box = boxIndex((gridRow - 1) / 2, (gridCol - 1) / 2);
          const owner = state.boxOwners[box];
          return (
            <div
              key={i}
              className="m-auto size-full rounded-sm"
              style={{
                backgroundColor: owner
                  ? owner === state.players[0].playerId
                    ? "var(--color-player-1)"
                    : "var(--color-player-2)"
                  : "transparent",
                opacity: owner ? 0.4 : 1,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
