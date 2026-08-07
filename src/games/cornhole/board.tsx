"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { velocityFromAimPower, simulateProjectile } from "@/games/core/physics";
import { resolveCssVars } from "@/games/core/canvas-color";
import {
  BAGS_PER_TURN,
  BOARD_END_X,
  BOARD_START_X,
  BOARD_SURFACE_Y,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GRAVITY,
  GROUND_Y,
  HOLE_END_X,
  HOLE_START_X,
  MAX_SHOT_SPEED,
  SHOOTER_X,
  SHOOTER_Y,
} from "./constants";
import type { CornholeAction, CornholeState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

export function CornholeBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: CornholeState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: CornholeAction) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(70);
  const [animatedStep, setAnimatedStep] = useState<number | null>(null);
  const lastTossKey = useRef<string | null>(null);

  const isMyTurn = state.currentTurnPlayerId === myPlayerId && state.status === "active";
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);

  useEffect(() => {
    if (!state.lastToss) return;
    const key = `${state.turnsPlayed}:${state.bagsThrownThisTurn}:${state.lastToss.playerId}`;
    if (lastTossKey.current === key) return;
    lastTossKey.current = key;
    let frame = 0;
    let raf: number;
    const step = () => {
      frame += 4;
      setAnimatedStep(frame);
      if (frame < state.lastToss!.path.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [state.lastToss, state.turnsPlayed, state.bagsThrownThisTurn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / CANVAS_WIDTH;
    const TAU = Math.PI * 2;

    const [lime, cyan, violet, pink] = resolveCssVars(canvas, [
      "--color-party-lime",
      "--color-party-cyan",
      "--color-party-violet",
      "--color-party-pink",
    ]);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `color-mix(in oklch, ${lime} 12%, transparent)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground.
    ctx.strokeStyle = `color-mix(in oklch, ${lime} 45%, transparent)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y * scale);
    ctx.lineTo(canvas.width, GROUND_Y * scale);
    ctx.stroke();

    // The tilted board — drawn as a simple ramp from ground level up to its raised surface.
    ctx.fillStyle = `color-mix(in oklch, ${cyan} 55%, black 10%)`;
    ctx.beginPath();
    ctx.moveTo(BOARD_START_X * scale, GROUND_Y * scale);
    ctx.lineTo(BOARD_START_X * scale, BOARD_SURFACE_Y * scale);
    ctx.lineTo(BOARD_END_X * scale, BOARD_SURFACE_Y * scale);
    ctx.lineTo(BOARD_END_X * scale, GROUND_Y * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // The hole.
    ctx.beginPath();
    ctx.ellipse(((HOLE_START_X + HOLE_END_X) / 2) * scale, BOARD_SURFACE_Y * scale, ((HOLE_END_X - HOLE_START_X) / 2) * scale, 6, 0, 0, TAU);
    ctx.fillStyle = "#0a0a0a";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(SHOOTER_X * scale, SHOOTER_Y * scale, 6, 0, TAU);
    ctx.fillStyle = violet;
    ctx.fill();

    if (isMyTurn && !disabled) {
      const preview = simulateProjectile({
        start: { x: SHOOTER_X, y: SHOOTER_Y },
        velocity: velocityFromAimPower(angle, power, MAX_SHOT_SPEED),
        gravity: GRAVITY,
        wind: 0,
        dt: 1 / 60,
        maxSteps: 300,
        groundHeightAt: (x) => (x >= BOARD_START_X && x <= BOARD_END_X ? BOARD_SURFACE_Y : GROUND_Y + 10_000),
      });
      ctx.strokeStyle = `color-mix(in oklch, ${violet} 60%, transparent)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      preview.path.forEach((p, i) => {
        const x = p.x * scale;
        const y = p.y * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (state.lastToss && animatedStep !== null) {
      const visible = state.lastToss.path.slice(0, animatedStep);
      ctx.strokeStyle = pink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      visible.forEach((p, i) => {
        const x = p.x * scale;
        const y = p.y * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const bag = visible[visible.length - 1];
      if (bag) {
        ctx.beginPath();
        ctx.arc(bag.x * scale, bag.y * scale, 6, 0, TAU);
        ctx.fillStyle = pink;
        ctx.fill();
      }
    }
  }, [state.lastToss, animatedStep, angle, power, isMyTurn, disabled]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge variant="secondary">Bag {state.bagsThrownThisTurn + 1}/{BAGS_PER_TURN}</Badge>
        {state.players.map((p) => (
          <Badge key={p.playerId} variant="outline">
            {players.find((rp) => rp.playerId === p.playerId)?.nickname ?? p.nickname}: {state.totalScores[p.playerId] ?? 0}
          </Badge>
        ))}
      </div>

      <p className="text-center font-medium" aria-live="polite">
        {state.winnerPlayerId
          ? state.winnerPlayerId === myPlayerId
            ? "You won!"
            : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : state.isDraw
            ? "It's a draw"
            : isMyTurn
              ? "Your toss"
              : `${currentPlayer?.nickname ?? "Opponent"}'s toss`}
      </p>

      {state.lastToss && <Badge variant={state.lastToss.score > 0 ? "default" : "outline"}>{state.lastToss.label ?? "Missed the board"}</Badge>}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-surface w-full max-w-2xl rounded-2xl border bg-card"
        role="img"
        aria-label="Cornhole board — use the angle and power sliders below to aim"
      />

      {isMyTurn && !disabled && (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Angle {Math.round(angle)}°</label>
            <Slider min={5} max={85} value={[angle]} onValueChange={(v) => setAngle(Array.isArray(v) ? v[0] : v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Power {Math.round(power)}</label>
            <Slider min={1} max={100} value={[power]} onValueChange={(v) => setPower(Array.isArray(v) ? v[0] : v)} />
          </div>
          <Button onClick={() => onAction({ type: "toss", angle, power })}>Toss</Button>
        </div>
      )}
    </div>
  );
}
