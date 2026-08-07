"use client";

import { cn } from "@/lib/utils";
import { pitsFor, storeFor } from "./moves";
import type { MancalaAction, MancalaState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

export function MancalaBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: MancalaState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: MancalaAction) => void;
  disabled?: boolean;
}) {
  const myIndex: 0 | 1 = state.players[0].playerId === myPlayerId ? 0 : 1;
  const opponentIndex: 0 | 1 = myIndex === 0 ? 1 : 0;
  const isMyTurn = state.currentTurnPlayerId === myPlayerId && state.status === "active";
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);

  const myPits = pitsFor(myIndex);
  const opponentPits = [...pitsFor(opponentIndex)].reverse();
  const myStore = storeFor(myIndex);
  const opponentStore = storeFor(opponentIndex);

  function sow(pit: number) {
    if (disabled || !isMyTurn || state.board[pit] === 0) return;
    onAction({ type: "sow", pit });
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
            ? "Your turn — pick a pit"
            : `${currentPlayer?.nickname ?? "Opponent"}'s turn`}
      </p>

      <div
        className="grid w-full max-w-lg gap-1.5 rounded-2xl border bg-card p-3"
        style={{ gridTemplateColumns: "1.2fr repeat(6, 1fr) 1.2fr" }}
        role="grid"
        aria-label="Mancala board"
      >
        <div className="row-span-2 flex flex-col items-center justify-center gap-1 rounded-xl bg-party-violet/20 p-2">
          <span className="text-xs text-muted-foreground">Opponent</span>
          <span className="text-2xl font-bold">{state.board[opponentStore]}</span>
        </div>

        {opponentPits.map((pit) => (
          <div
            key={pit}
            role="gridcell"
            aria-label={`Opponent's pit, ${state.board[pit]} seeds`}
            className="flex aspect-square items-center justify-center rounded-full bg-party-cyan/20 text-lg font-semibold"
          >
            {state.board[pit]}
          </div>
        ))}

        <div className="row-span-2 flex flex-col items-center justify-center gap-1 rounded-xl bg-party-lime/20 p-2">
          <span className="text-xs text-muted-foreground">You</span>
          <span className="text-2xl font-bold">{state.board[myStore]}</span>
        </div>

        {myPits.map((pit) => {
          const canSow = isMyTurn && !disabled && state.board[pit] > 0;
          return (
            <button
              key={pit}
              type="button"
              role="gridcell"
              disabled={!canSow}
              aria-label={`Your pit, ${state.board[pit]} seeds`}
              onClick={() => sow(pit)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-full text-lg font-semibold transition-colors",
                canSow ? "bg-party-amber/40 hover:bg-party-amber/60" : "bg-party-amber/15",
              )}
            >
              {state.board[pit]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
