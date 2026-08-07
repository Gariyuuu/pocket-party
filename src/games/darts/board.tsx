"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { velocityFromAimPower, simulateProjectile } from "@/games/core/physics";
import { resolveCssVars } from "@/games/core/canvas-color";
import { CANVAS_HEIGHT, CANVAS_WIDTH, DARTS_PER_TURN, GRAVITY, MAX_SHOT_SPEED, RINGS, SHOOTER_X, SHOOTER_Y, TARGET_X, TARGET_Y } from "./constants";
import type { DartsAction, DartsState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

export function DartsBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: DartsState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: DartsAction) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(70);
  const [animatedStep, setAnimatedStep] = useState<number | null>(null);
  const lastThrowKey = useRef<string | null>(null);

  const isMyTurn = state.currentTurnPlayerId === myPlayerId && state.status === "active";
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);

  useEffect(() => {
    if (!state.lastThrow) return;
    const key = `${state.turnsPlayed}:${state.dartsThrownThisTurn}:${state.lastThrow.playerId}`;
    if (lastThrowKey.current === key) return;
    lastThrowKey.current = key;
    let frame = 0;
    let raf: number;
    const step = () => {
      frame += 4;
      setAnimatedStep(frame);
      if (frame < state.lastThrow!.path.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [state.lastThrow, state.turnsPlayed, state.dartsThrownThisTurn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / CANVAS_WIDTH;
    const TAU = Math.PI * 2;

    const [violet, cyan, pink, lime] = resolveCssVars(canvas, [
      "--color-party-violet",
      "--color-party-cyan",
      "--color-party-pink",
      "--color-party-lime",
    ]);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `color-mix(in oklch, ${violet} 12%, transparent)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Board rings, outermost first so each one draws over the last cleanly.
    const ringColors = [lime, cyan, "#ffffff", cyan, lime];
    for (let i = RINGS.length - 1; i >= 0; i--) {
      ctx.beginPath();
      ctx.arc(TARGET_X * scale, TARGET_Y * scale, RINGS[i].radius * scale, 0, TAU);
      ctx.fillStyle = ringColors[i % ringColors.length];
      ctx.fill();
    }
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 2;
    for (const ring of RINGS) {
      ctx.beginPath();
      ctx.arc(TARGET_X * scale, TARGET_Y * scale, ring.radius * scale, 0, TAU);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(SHOOTER_X * scale, SHOOTER_Y * scale, 6, 0, TAU);
    ctx.fillStyle = cyan;
    ctx.fill();

    if (isMyTurn && !disabled) {
      const preview = simulateProjectile({
        start: { x: SHOOTER_X, y: SHOOTER_Y },
        velocity: velocityFromAimPower(angle, power, MAX_SHOT_SPEED),
        gravity: GRAVITY,
        wind: 0,
        dt: 1 / 60,
        maxSteps: 300,
        groundHeightAt: () => CANVAS_HEIGHT + 40,
        onStep: (position) => {
          if (position.x >= TARGET_X) return "stop";
        },
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

    if (state.lastThrow && animatedStep !== null) {
      const visible = state.lastThrow.path.slice(0, animatedStep);
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
      const dart = visible[visible.length - 1];
      if (dart) {
        ctx.beginPath();
        ctx.arc(dart.x * scale, dart.y * scale, 5, 0, TAU);
        ctx.fillStyle = pink;
        ctx.fill();
      }
    }
  }, [state.lastThrow, animatedStep, angle, power, isMyTurn, disabled]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge variant="secondary">Dart {state.dartsThrownThisTurn + 1}/{DARTS_PER_TURN}</Badge>
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
              ? "Your throw"
              : `${currentPlayer?.nickname ?? "Opponent"}'s throw`}
      </p>

      {state.lastThrow && (
        <Badge variant={state.lastThrow.score > 0 ? "default" : "outline"}>
          {state.lastThrow.ringLabel ? `${state.lastThrow.ringLabel} — ${state.lastThrow.score}pts` : "Missed the board"}
        </Badge>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-surface w-full max-w-2xl rounded-2xl border bg-card"
        role="img"
        aria-label="Darts board — use the angle and power sliders below to aim"
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
          <Button onClick={() => onAction({ type: "throw", angle, power })}>Throw</Button>
        </div>
      )}
    </div>
  );
}
