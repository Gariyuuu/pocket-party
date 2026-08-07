"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isRealWord } from "@/games/core/dictionary";
import type { WordBitesAction, WordBitesState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

interface WordBitesPanelProps {
  state: WordBitesState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: WordBitesAction) => void;
  disabled?: boolean;
}

// One color per source-word group, cycling — tiles chopped from the same
// original word always share a color, so the rack reads as a strip of
// colorful puzzle pieces rather than plain text chips, and it's visually
// obvious which neighboring bites came from the same word.
const BITE_COLORS = [
  "var(--color-player-1)",
  "var(--color-player-2)",
  "var(--color-player-3)",
  "var(--color-player-4)",
  "var(--color-party-violet)",
  "var(--color-party-pink)",
  "var(--color-party-cyan)",
  "var(--color-party-amber)",
];

export function WordBitesPanel({ state, myPlayerId, players, onAction, disabled }: WordBitesPanelProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000)));
  const advanceRequested = useRef(false);

  useEffect(() => {
    setSelected([]);
    setInlineError(null);
  }, [state.rack.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && state.status === "round-active" && !advanceRequested.current) {
        advanceRequested.current = true;
        onAction({ type: "advance-round", now: Date.now() });
      }
    }, 250);
    return () => clearInterval(interval);
  }, [state.roundEndsAt, state.status, onAction]);

  function handleTileClick(index: number) {
    if (disabled) return;
    setInlineError(null);
    setSelected((prev) => {
      if (prev.length === 0) return [index];
      const min = prev[0];
      const max = prev[prev.length - 1];
      if (index === max + 1) return [...prev, index];
      if (index === min - 1) return [index, ...prev];
      if (prev.includes(index)) {
        if (index === min) return [];
        if (index === max) return prev.slice(0, -1);
        return prev;
      }
      return [index];
    });
  }

  async function handleSubmit() {
    if (selected.length === 0) return;
    const word = selected.map((i) => state.rack[i].letters).join("");
    setInlineError(null);
    if (word.length < 3) {
      setInlineError("That's not long enough to be a word.");
      return;
    }
    if (!(await isRealWord(word))) {
      setInlineError("Not a real word.");
      return;
    }
    onAction({ type: "submit-word", tileIds: selected.map((i) => state.rack[i].id) });
    setSelected([]);
  }

  const myClaims = state.claimed.filter((c) => c.playerId === myPlayerId);
  const selectedWord = selected.map((i) => state.rack[i]?.letters ?? "").join("");
  const canExtendLeft = selected.length > 0 ? selected[0] - 1 : null;
  const canExtendRight = selected.length > 0 ? selected[selected.length - 1] + 1 : null;

  const rankedPlayers = useMemo(
    () => [...state.players].sort((a, b) => (state.scores[b.playerId] ?? 0) - (state.scores[a.playerId] ?? 0)),
    [state.players, state.scores],
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">Word Bites</Badge>
        <Badge variant={secondsLeft <= 15 ? "destructive" : "outline"} className="tabular-nums">
          {secondsLeft}s
        </Badge>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Matching colors were chopped from the same word — tap left to right, only touching tiles, to piece one back together.
      </p>

      {/* A single scrollable row, never wraps — wrapping would put tile N+1
          on a different line than tile N, breaking the "left/right of the
          tile next to it" mental model entirely. */}
      <div
        className="flex w-full max-w-2xl gap-2 overflow-x-auto rounded-2xl border bg-card/50 p-3"
        aria-label="Bite rack"
        role="group"
      >
        {state.rack.map((tile, index) => {
          const isSelected = selected.includes(index);
          const isExtendHint = !isSelected && (index === canExtendLeft || index === canExtendRight);
          const color = BITE_COLORS[tile.groupId % BITE_COLORS.length];
          return (
            <button
              key={tile.id}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`Bite ${tile.letters}${isSelected ? ", selected" : isExtendHint ? ", tap to extend your selection" : ""}`}
              onClick={() => handleTileClick(index)}
              className={cn(
                "flex h-14 min-w-14 shrink-0 items-center justify-center rounded-xl border-2 px-2 font-display text-xl font-bold text-white shadow-sm transition-transform",
                isSelected ? "-translate-y-1.5 scale-105 border-white" : "border-transparent",
                isExtendHint && "ring-2 ring-white ring-offset-2 ring-offset-background animate-pulse",
              )}
              style={{ backgroundColor: color, opacity: isSelected || isExtendHint || selected.length === 0 ? 1 : 0.55 }}
            >
              {tile.letters}
            </button>
          );
        })}
      </div>

      {!disabled && state.status === "round-active" && (
        <div className="flex w-full max-w-sm flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="min-h-8 font-display text-lg font-bold tabular-nums">{selectedWord || "—"}</span>
            <Button onClick={handleSubmit} disabled={selected.length === 0}>
              Submit
            </Button>
            {selected.length > 0 && (
              <Button variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
            )}
          </div>
          {inlineError && <p className="text-sm text-destructive">{inlineError}</p>}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-1.5">
        {myClaims.map((c, i) => (
          <Badge key={`${c.word}-${i}`} variant="outline">
            {c.word} · {c.points}pt
          </Badge>
        ))}
      </div>

      <ol className="flex w-full max-w-sm flex-col gap-1">
        {rankedPlayers.map((p, i) => (
          <li key={p.playerId} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
            <span>
              {i + 1}. {players.find((rp) => rp.playerId === p.playerId)?.nickname ?? p.nickname}
              {p.playerId === myPlayerId && " (you)"}
            </span>
            <span className="font-display font-bold tabular-nums">{state.scores[p.playerId] ?? 0}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
