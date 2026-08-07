"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { resolveCssVars } from "@/games/core/canvas-color";
import { CUE_BALL_ID, COMET_BALL_ID, POCKETS, TABLE_HEIGHT, TABLE_WIDTH } from "./constants";
import type { PocketShotsAction, PocketShotsState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

const DRAG_SCALE = 160;
const MIN_DRAG = 12;
// cue/comet are fixed literal colors; orb/ring are theme-reactive party
// accents, resolved to a real value inside the draw effect (canvas can't
// read `var(--x)` on its own — see games/core/canvas-color.ts).
const FIXED_BALL_COLORS = { cue: "#f8fafc", comet: "#1c1917" } as const;

export function PocketShotsBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: PocketShotsState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: PocketShotsAction) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [animatedStep, setAnimatedStep] = useState<number | null>(null);
  const lastTurnCount = useRef(-1);

  const isMyTurn = state.currentTurnPlayerId === myPlayerId && !state.winnerPlayerId && !state.isDraw;
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);
  const cueBall = state.balls.find((b) => b.id === CUE_BALL_ID)!;
  const myGroup = state.assignments[myPlayerId];

  useEffect(() => {
    if (!state.lastShot || state.turnCount - 1 === lastTurnCount.current) return;
    lastTurnCount.current = state.turnCount - 1;
    let frame = 0;
    let raf: number;
    const step = () => {
      frame += 3;
      setAnimatedStep(frame);
      raf = requestAnimationFrame(step);
      const maxLen = Math.max(...Object.values(state.lastShot!.paths).map((p) => p.length));
      if (frame >= maxLen) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [state.lastShot, state.turnCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / TABLE_WIDTH;
    const [violet, cyan, amber, pink] = resolveCssVars(canvas, [
      "--color-party-violet",
      "--color-party-cyan",
      "--color-party-amber",
      "--color-party-pink",
    ]);
    const ballColors = { ...FIXED_BALL_COLORS, orb: cyan, ring: amber };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `color-mix(in oklch, ${violet} 16%, transparent)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const pocket of POCKETS) {
      ctx.beginPath();
      ctx.arc(pocket.x * scale, pocket.y * scale, 20 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "color-mix(in oklch, currentColor 70%, transparent)";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const renderBalls = animatedStep !== null && state.lastShot ? state.lastShot.paths : null;

    for (const ball of state.balls) {
      let pos = { x: ball.x, y: ball.y };
      if (renderBalls) {
        const path = renderBalls[ball.id];
        const idx = Math.min(animatedStep!, path.length - 1);
        pos = path[idx];
      }
      if (ball.pocketed && !renderBalls) continue;

      const radius = 11 * scale;
      ctx.beginPath();
      ctx.arc(pos.x * scale, pos.y * scale, radius, 0, Math.PI * 2);
      ctx.fillStyle = ballColors[ball.group];
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Colorblind-safe: Rings get a literal white band, Orbs stay solid —
      // the groups differ in pattern, not just hue.
      if (ball.group === "ring") {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x * scale, pos.y * scale, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(pos.x * scale - radius, pos.y * scale - radius * 0.35, radius * 2, radius * 0.7);
        ctx.restore();
      }

      if (ball.id === COMET_BALL_ID) {
        ctx.fillStyle = "#f8fafc";
        ctx.font = `${10 * scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("C", pos.x * scale, pos.y * scale + 3 * scale);
      }
    }

    if (drag && isMyTurn && !disabled) {
      const dx = drag.x - cueBall.x;
      const dy = drag.y - cueBall.y;
      ctx.strokeStyle = pink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cueBall.x * scale, cueBall.y * scale);
      ctx.lineTo((cueBall.x - dx) * scale, (cueBall.y - dy) * scale);
      ctx.stroke();
    }
  }, [state.balls, state.lastShot, animatedStep, drag, isMyTurn, disabled, cueBall.x, cueBall.y]);

  function canvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = TABLE_WIDTH / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  }

  function handleRelease() {
    if (!drag || !isMyTurn || disabled) {
      setDrag(null);
      return;
    }
    const dx = drag.x - cueBall.x;
    const dy = drag.y - cueBall.y;
    const dist = Math.hypot(dx, dy);
    setDrag(null);
    if (dist < MIN_DRAG) return;

    const angle = (Math.atan2(dy, -dx) * 180) / Math.PI;
    const power = Math.min(100, Math.max(1, (dist / DRAG_SCALE) * 100));
    onAction({ type: "shoot", angle, power });
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Your group: {myGroup ?? "open table"}</Badge>
      </div>

      <p className="text-center font-medium" aria-live="polite">
        {state.winnerPlayerId
          ? state.winnerPlayerId === myPlayerId
            ? "You won!"
            : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : state.isDraw
            ? "It's a draw"
            : isMyTurn
              ? "Your shot — drag back from the cue ball and release"
              : `${currentPlayer?.nickname ?? "Opponent"}'s shot`}
      </p>

      {state.lastShot?.foul && <Badge variant="destructive">{state.lastShot.foul}</Badge>}

      <canvas
        ref={canvasRef}
        width={TABLE_WIDTH}
        height={TABLE_HEIGHT}
        className="game-surface w-full max-w-2xl touch-none rounded-2xl border bg-card"
        role="img"
        aria-label="Pocket Shots table — drag back from the cue ball and release to shoot"
        onPointerDown={(e) => isMyTurn && !disabled && setDrag(canvasPoint(e))}
        onPointerMove={(e) => drag && setDrag(canvasPoint(e))}
        onPointerUp={handleRelease}
        onPointerLeave={handleRelease}
      />
    </div>
  );
}
