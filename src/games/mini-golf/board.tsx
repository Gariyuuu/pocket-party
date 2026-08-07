"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { resolveCssVar, resolveCssVars } from "@/games/core/canvas-color";
import { COURSE_HEIGHT, COURSE_WIDTH, HOLE_RADIUS } from "./constants";
import { COURSES } from "./courses";
import type { MiniGolfAction, MiniGolfState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

const DRAG_SCALE = 140;
const MIN_DRAG = 10;
const BALL_COLOR_VARS = ["--color-player-1", "--color-player-2", "--color-player-3", "--color-player-4"];

export function MiniGolfBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: MiniGolfState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: MiniGolfAction) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [animatedStep, setAnimatedStep] = useState<number | null>(null);
  const lastShotKey = useRef<string | null>(null);

  const course = COURSES[state.holeIndex];
  const isMyTurn = state.currentTurnPlayerId === myPlayerId && state.status === "playing";
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);
  const myBall = state.balls.find((b) => b.playerId === myPlayerId);

  useEffect(() => {
    if (!state.lastShot) return;
    const key = `${state.holeIndex}:${state.lastShot.playerId}:${state.lastShot.strokesUsed}`;
    if (lastShotKey.current === key) return;
    lastShotKey.current = key;
    let frame = 0;
    let raf: number;
    const step = () => {
      frame += 3;
      setAnimatedStep(frame);
      raf = requestAnimationFrame(step);
      if (frame >= state.lastShot!.path.length) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [state.lastShot, state.holeIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / COURSE_WIDTH;
    const TAU = Math.PI * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const limeColor = resolveCssVar(canvas, "--color-party-lime");
    const amberColor = resolveCssVar(canvas, "--color-party-amber");
    const pinkColor = resolveCssVar(canvas, "--color-party-pink");
    const ballColors = resolveCssVars(canvas, BALL_COLOR_VARS);

    // A mowed-fairway look — alternating green stripes read as "colorful
    // grass," not a flat tint, and give the course visible texture/scale.
    const stripeHeight = 32 * scale;
    for (let y = 0, i = 0; y < canvas.height; y += stripeHeight, i++) {
      ctx.fillStyle =
        i % 2 === 0
          ? `color-mix(in oklch, ${limeColor} 55%, white 12%)`
          : `color-mix(in oklch, ${limeColor} 42%, black 10%)`;
      ctx.fillRect(0, y, canvas.width, stripeHeight);
    }

    for (const obstacle of course.obstacles) {
      const ox = obstacle.x * scale;
      const oy = obstacle.y * scale;
      const ow = obstacle.width * scale;
      const oh = obstacle.height * scale;
      ctx.fillStyle = amberColor;
      ctx.fillRect(ox, oy, ow, oh);
      ctx.strokeStyle = `color-mix(in oklch, ${amberColor} 55%, black 45%)`;
      ctx.lineWidth = 3 * scale;
      ctx.strokeRect(ox, oy, ow, oh);
    }

    // The hole: a bright white rim (so it never blends into the fairway),
    // a dark cup, and a flag/pin — the classic "this is the target" marker.
    const holeX = course.hole.x * scale;
    const holeY = course.hole.y * scale;
    const holeVisualRadius = HOLE_RADIUS * 1.3 * scale;
    ctx.beginPath();
    ctx.arc(holeX, holeY, holeVisualRadius + 3 * scale, 0, TAU);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(holeX, holeY, holeVisualRadius, 0, TAU);
    ctx.fillStyle = "#0a0a0a";
    ctx.fill();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(holeX, holeY);
    ctx.lineTo(holeX, holeY - 42 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(holeX, holeY - 42 * scale);
    ctx.lineTo(holeX + 18 * scale, holeY - 35 * scale);
    ctx.lineTo(holeX, holeY - 28 * scale);
    ctx.closePath();
    ctx.fillStyle = pinkColor;
    ctx.fill();

    // A dashed guide line from your own ball to the hole, shown any time
    // it's your turn — answers "where am I supposed to go" without
    // requiring a drag to already be in progress.
    if (isMyTurn && !disabled && myBall && !myBall.holedOut) {
      ctx.save();
      ctx.setLineDash([7 * scale, 7 * scale]);
      ctx.strokeStyle = "color-mix(in oklch, white 75%, transparent)";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(myBall.x * scale, myBall.y * scale);
      ctx.lineTo(holeX, holeY);
      ctx.stroke();
      ctx.restore();
    }

    const shootingPlayerIndex = state.lastShot
      ? state.balls.findIndex((b) => b.playerId === state.lastShot!.playerId)
      : -1;
    const animatingPath =
      animatedStep !== null && state.lastShot ? state.lastShot.path : null;

    state.balls.forEach((ball, index) => {
      let pos = { x: ball.x, y: ball.y };
      if (animatingPath && index === shootingPlayerIndex) {
        const idx = Math.min(animatedStep!, animatingPath.length - 1);
        pos = animatingPath[idx];
      }
      if (ball.holedOut && !(animatingPath && index === shootingPlayerIndex)) return;

      const bx = pos.x * scale;
      const by = pos.y * scale;
      // A soft dark shadow first, so a bright ball still pops against a
      // same-toned stripe behind it.
      ctx.beginPath();
      ctx.arc(bx, by, 9 * scale, 0, TAU);
      ctx.fillStyle = "color-mix(in oklch, black 35%, transparent)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx, by, 8 * scale, 0, TAU);
      ctx.fillStyle = ballColors[index % ballColors.length];
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
    });

    if (drag && isMyTurn && !disabled && myBall) {
      const dx = drag.x - myBall.x;
      const dy = drag.y - myBall.y;
      ctx.strokeStyle = pinkColor;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(myBall.x * scale, myBall.y * scale);
      ctx.lineTo((myBall.x - dx) * scale, (myBall.y - dy) * scale);
      ctx.stroke();
    }
  }, [state.balls, state.lastShot, animatedStep, drag, isMyTurn, disabled, myBall, course]);

  function canvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = COURSE_WIDTH / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  }

  function handleRelease() {
    if (!drag || !isMyTurn || disabled || !myBall) {
      setDrag(null);
      return;
    }
    const dx = drag.x - myBall.x;
    const dy = drag.y - myBall.y;
    const dist = Math.hypot(dx, dy);
    setDrag(null);
    if (dist < MIN_DRAG) return;

    const angle = (Math.atan2(dy, -dx) * 180) / Math.PI;
    const power = Math.min(100, Math.max(1, (dist / DRAG_SCALE) * 100));
    onAction({ type: "putt", angle, power });
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          Hole {state.holeIndex + 1}/{state.holeCount} — {course.name}
        </Badge>
        <Badge variant="outline">Par {course.par}</Badge>
      </div>

      <p className="text-center font-medium" aria-live="polite">
        {state.winnerPlayerId
          ? state.winnerPlayerId === myPlayerId
            ? "You won!"
            : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : state.isDraw
            ? "It's a draw"
            : isMyTurn
              ? "Your putt — drag back from your ball and release"
              : `${currentPlayer?.nickname ?? "Opponent"}'s putt`}
      </p>

      {state.lastShot?.forcedHoleOut && <Badge variant="destructive">Max strokes reached — holed out automatically</Badge>}

      <canvas
        ref={canvasRef}
        width={COURSE_WIDTH}
        height={COURSE_HEIGHT}
        className="game-surface w-full max-w-2xl touch-none rounded-2xl border bg-card"
        role="img"
        aria-label="Mini Golf course — drag back from your ball and release to putt"
        onPointerDown={(e) => isMyTurn && !disabled && setDrag(canvasPoint(e))}
        onPointerMove={(e) => drag && setDrag(canvasPoint(e))}
        onPointerUp={handleRelease}
        onPointerLeave={handleRelease}
      />

      <ol className="flex w-full max-w-2xl flex-wrap justify-center gap-1.5">
        {state.balls.map((ball, index) => {
          const player = players.find((p) => p.playerId === ball.playerId);
          const ballColorVar = `var(${BALL_COLOR_VARS[index % BALL_COLOR_VARS.length]})`;
          return (
            <li
              key={ball.playerId}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm"
              style={{ borderColor: ballColorVar }}
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: ballColorVar }} />
              <span>
                {player?.nickname ?? "Player"}
                {ball.playerId === myPlayerId && " (you)"}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {ball.strokes} this hole · {state.totalStrokes[ball.playerId]} total
              </span>
              {ball.holedOut && <Badge variant="outline">In!</Badge>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
