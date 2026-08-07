"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { velocityFromAimPower, simulateProjectile } from "@/games/core/physics";
import { COURT_WIDTH, GRAVITY, GROUND_Y, HOOP_RADIUS, HOOP_Y, MAX_SHOT_SPEED, SHOOTER_X, SHOOTER_Y } from "./constants";
import type { MiniHoopsAction, MiniHoopsState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

const CANVAS_HEIGHT = 220;

export function MiniHoopsBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: MiniHoopsState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: MiniHoopsAction) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(55);
  const [power, setPower] = useState(65);
  const [animatedStep, setAnimatedStep] = useState<number | null>(null);
  const lastShotIndex = useRef(-1);

  const isMyTurn = state.currentTurnPlayerId === myPlayerId && !state.winnerPlayerId && !state.isDraw;
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);
  const hoopX = state.lastShot?.hoopX ?? state.shotIndex;

  useEffect(() => {
    if (!state.lastShot || state.shotIndex - 1 === lastShotIndex.current) return;
    lastShotIndex.current = state.shotIndex - 1;
    let frame = 0;
    let raf: number;
    const step = () => {
      frame += 4;
      setAnimatedStep(frame);
      if (frame < state.lastShot!.path.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [state.lastShot, state.shotIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / COURT_WIDTH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "color-mix(in oklch, currentColor 25%, transparent)";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y * scale);
    ctx.lineTo(canvas.width, GROUND_Y * scale);
    ctx.stroke();

    ctx.fillStyle = "var(--color-party-cyan)";
    ctx.beginPath();
    ctx.arc(SHOOTER_X * scale, SHOOTER_Y * scale, 8, 0, Math.PI * 2);
    ctx.fill();

    const currentHoopX = state.lastShot ? state.lastShot.hoopX : hoopX;
    ctx.strokeStyle = "var(--color-party-amber)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(currentHoopX * scale, HOOP_Y * scale, HOOP_RADIUS * scale, 6, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (isMyTurn && !disabled) {
      const preview = simulateProjectile({
        start: { x: SHOOTER_X, y: SHOOTER_Y },
        velocity: velocityFromAimPower(angle, power, MAX_SHOT_SPEED),
        gravity: GRAVITY,
        wind: 0,
        dt: 1 / 60,
        maxSteps: 500,
        groundHeightAt: () => GROUND_Y,
      });
      ctx.strokeStyle = "color-mix(in oklch, var(--color-party-violet) 50%, transparent)";
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

    if (state.lastShot && animatedStep !== null) {
      const visible = state.lastShot.path.slice(0, animatedStep);
      ctx.strokeStyle = state.lastShot.made ? "var(--color-party-lime)" : "var(--color-party-pink)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      visible.forEach((p, i) => {
        const x = p.x * scale;
        const y = p.y * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const ball = visible[visible.length - 1];
      if (ball) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(ball.x * scale, ball.y * scale, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [state.lastShot, state.shotIndex, animatedStep, angle, power, isMyTurn, disabled, hoopX]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">
          Shot {Math.min(state.shotIndex + 1, state.shotsPerPlayer * state.players.length)}/
          {state.shotsPerPlayer * state.players.length}
        </Badge>
        {state.players.map((p) => (
          <Badge key={p.playerId} variant="outline">
            {players.find((rp) => rp.playerId === p.playerId)?.nickname ?? p.nickname}: {state.makesByPlayer[p.playerId] ?? 0}
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
              ? "Your shot"
              : `${currentPlayer?.nickname ?? "Opponent"}'s shot`}
      </p>

      <canvas
        ref={canvasRef}
        width={COURT_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-surface w-full max-w-2xl rounded-2xl border bg-card"
        role="img"
        aria-label="Mini Hoops court showing the hoop and your shot preview — use the angle and power sliders below to aim"
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
          <Button onClick={() => onAction({ type: "shoot", angle, power })}>Shoot</Button>
        </div>
      )}
    </div>
  );
}
