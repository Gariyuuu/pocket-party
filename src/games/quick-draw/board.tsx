"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import type { QuickDrawAction, QuickDrawState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";
import type { RealtimeBroadcast } from "@/components/game-shell/game-surface";

interface StrokePoint {
  x: number;
  y: number;
  type: "start" | "move";
}

export function QuickDrawBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
  broadcast,
  hint,
}: {
  state: QuickDrawState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: QuickDrawAction) => void;
  disabled?: boolean;
  /** Present for online matches, absent for local solo-vs-bot. Kept for API symmetry with GameSurface's other boards, even though this one no longer needs it directly (broadcast's presence is the real solo/online signal now). */
  matchId?: string;
  broadcast?: RealtimeBroadcast;
  /** Solo mode only: a first-letter hint shown when the bot is "drawing" (bots can't actually draw). */
  hint?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastRound = useRef(-1);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000)));
  const advanceRequested = useRef(false);
  const [revealBanner, setRevealBanner] = useState<string | null>(null);

  const isArtist = state.artistPlayerId === myPlayerId;
  const myGuess = state.guesses[myPlayerId];
  const artistName = players.find((p) => p.playerId === state.artistPlayerId)?.nickname ?? "Someone";

  useEffect(() => {
    advanceRequested.current = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    ctx?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, [state.round]);

  // A rematch reuses this same mounted component with a fresh engine state
  // (new seed) — reset the reveal-banner tracker so round 1's reveal isn't
  // mistaken for a round already shown in the previous match.
  useEffect(() => {
    lastRound.current = -1;
  }, [state.seed]);

  useEffect(() => {
    if (state.roundHistory.length === 0 || lastRound.current >= state.roundHistory.length - 1) return;
    lastRound.current = state.roundHistory.length - 1;
    const last = state.roundHistory[state.roundHistory.length - 1];
    // The just-finished round's options array has already rotated out by the
    // time this fires, so fall back to the current prompt if it's stale.
    const answer = state.options[last.correctIndex] ?? state.promptWord;
    setRevealBanner(`The answer was "${answer}"`);
    const timeout = setTimeout(() => setRevealBanner(null), 4000);
    return () => clearTimeout(timeout);
  }, [state.roundHistory, state.options, state.promptWord]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && state.status === "drawing" && !advanceRequested.current) {
        advanceRequested.current = true;
        onAction({ type: "advance-round", now: Date.now() });
      }
    }, 250);
    return () => clearInterval(interval);
  }, [state.roundEndsAt, state.status, onAction]);

  // Everyone finished guessing early? Advance without waiting out the clock.
  useEffect(() => {
    if (state.status !== "drawing" || advanceRequested.current) return;
    const guessersNeeded = state.players.length - 1;
    if (Object.keys(state.guesses).length >= guessersNeeded && guessersNeeded > 0) {
      advanceRequested.current = true;
      onAction({ type: "advance-round", now: Date.now() });
    }
  }, [state.guesses, state.players.length, state.status, onAction]);

  useEffect(() => {
    if (isArtist || !broadcast) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let last: { x: number; y: number } | null = null;

    const unsubStroke = broadcast.onBroadcast("stroke", (payload) => {
      const point = payload as StrokePoint;
      if (point.type === "start") {
        last = { x: point.x, y: point.y };
        return;
      }
      if (last) {
        ctx.strokeStyle = "currentColor";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      last = { x: point.x, y: point.y };
    });
    const unsubClear = broadcast.onBroadcast("clear", () => ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));

    return () => {
      unsubStroke();
      unsubClear();
    };
  }, [isArtist, broadcast, state.round]);

  function broadcastStroke(point: StrokePoint) {
    broadcast?.sendBroadcast("stroke", point);
  }

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isArtist || disabled) return;
    drawing.current = true;
    const p = pointFromEvent(e);
    broadcastStroke({ ...p, type: "start" });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isArtist || !drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const p = pointFromEvent(e);
    ctx.strokeStyle = "currentColor";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    broadcastStroke({ ...p, type: "move" });
  }

  function handlePointerUp() {
    drawing.current = false;
  }

  function handleClearCanvas() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    broadcast?.sendBroadcast("clear", {});
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          Round {state.round}/{state.totalRounds}
        </Badge>
        <Badge variant={secondsLeft <= 10 ? "destructive" : "outline"} className="tabular-nums">
          {secondsLeft}s
        </Badge>
      </div>

      {isArtist ? (
        <p className="text-center font-medium">
          Draw: <span className="font-display text-lg font-bold">{state.promptWord}</span>
        </p>
      ) : (
        <p className="text-center font-medium">
          {artistName} is drawing{hint ? ` — hint: starts with "${hint}"` : "…"}
        </p>
      )}

      {revealBanner && <Badge variant="outline">{revealBanner}</Badge>}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-surface w-full max-w-xl touch-none rounded-2xl border bg-card"
        role="img"
        aria-label={isArtist ? "Your drawing canvas — draw with your mouse or finger" : "The artist's drawing, appearing live"}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {isArtist && (
        <Button variant="ghost" size="sm" onClick={handleClearCanvas}>
          Clear
        </Button>
      )}

      {!isArtist && (
        <div className="grid w-full max-w-md grid-cols-2 gap-2">
          {state.options.map((option, index) => (
            <Button
              key={option}
              variant={myGuess?.answerIndex === index ? "default" : "outline"}
              disabled={!!myGuess || disabled}
              onClick={() => onAction({ type: "submit-guess", answerIndex: index, now: Date.now() })}
            >
              {option}
            </Button>
          ))}
        </div>
      )}

      <ol className="flex w-full max-w-md flex-col gap-1">
        {[...state.players]
          .sort((a, b) => (state.totalScores[b.playerId] ?? 0) - (state.totalScores[a.playerId] ?? 0))
          .map((p, i) => (
            <li key={p.playerId} className="flex items-center justify-between rounded-lg border px-3 py-1 text-sm">
              <span>
                {i + 1}. {players.find((rp) => rp.playerId === p.playerId)?.nickname ?? p.nickname}
              </span>
              <span className="font-display font-bold tabular-nums">{state.totalScores[p.playerId] ?? 0}</span>
            </li>
          ))}
      </ol>
    </div>
  );
}
