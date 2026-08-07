"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BOARD_SIZE } from "./constants";
import type { TileRushAction, TileRushState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

const TILE_COLORS = [
  "var(--color-player-1)",
  "var(--color-player-2)",
  "var(--color-player-3)",
  "var(--color-player-4)",
  "var(--color-party-amber)",
];
// Colorblind-safe: matching is the whole game here, so every color also gets
// a distinct shape/symbol — never rely on hue alone to tell tiles apart.
const TILE_SHAPES = ["●", "■", "▲", "◆", "★"];
const TILE_COLOR_NAMES = ["blue", "coral", "green", "berry", "gold"];

const POWERUP_ICON: Record<string, string> = {
  "row-clear": "↔",
  "column-clear": "↕",
  shuffle: "⤨",
  freeze: "❄",
  multiplier: "×2",
};

export function TileRushBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: TileRushState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: TileRushAction) => void;
  disabled?: boolean;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000)));
  const endRequested = useRef(false);
  const myBoard = state.boardsByPlayer[myPlayerId];

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && state.status === "active" && !endRequested.current) {
        endRequested.current = true;
        onAction({ type: "end-round", now: Date.now() });
      }
    }, 250);
    return () => clearInterval(interval);
  }, [state.roundEndsAt, state.status, onAction]);

  if (!myBoard) return null;

  const now = Date.now();
  const opponents = state.players.filter((p) => p.playerId !== myPlayerId);
  const highestOpponentScore = Math.max(1, ...opponents.map((p) => state.boardsByPlayer[p.playerId]?.score ?? 0));

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <Badge variant={secondsLeft <= 15 ? "destructive" : "secondary"} className="tabular-nums">
          {secondsLeft}s
        </Badge>
        <Badge variant="outline" className="font-display text-base font-bold tabular-nums">
          {myBoard.score} pts
        </Badge>
        {myBoard.multiplierCharges > 0 && <Badge>×2 ({myBoard.multiplierCharges})</Badge>}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-1.5">
        {opponents.map((p) => {
          const board = state.boardsByPlayer[p.playerId];
          const frozen = (board?.freezeUntil ?? 0) > now;
          const name = players.find((rp) => rp.playerId === p.playerId)?.nickname ?? p.nickname;
          const pct = frozen ? 100 : Math.min(100, ((board?.score ?? 0) / highestOpponentScore) * 100);
          return (
            <div key={p.playerId} className="flex items-center gap-2 text-sm">
              <span className="w-20 truncate">{name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", frozen ? "bg-party-cyan" : "bg-party-violet")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right tabular-nums">{frozen ? "❄" : board?.score ?? 0}</span>
            </div>
          );
        })}
      </div>

      <div
        className="grid gap-1 rounded-2xl border bg-card p-2"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Tile Rush board"
      >
        {myBoard.tiles.map((tile, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const col = index % BOARD_SIZE;
          const colorIndex = tile.color % TILE_COLORS.length;
          const colorName = TILE_COLOR_NAMES[colorIndex];
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              disabled={disabled}
              aria-label={`${colorName} tile${tile.powerUp ? `, ${tile.powerUp} power-up` : ""}, row ${row + 1} column ${col + 1}`}
              onClick={() => onAction({ type: "clear-tile", row, col, now: Date.now() })}
              className="flex size-9 items-center justify-center rounded-md text-xs font-bold text-white transition-transform hover:scale-95 sm:size-10"
              style={{ backgroundColor: TILE_COLORS[colorIndex] }}
            >
              {tile.powerUp ? POWERUP_ICON[tile.powerUp] : TILE_SHAPES[colorIndex]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
