"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { velocityFromAimPower, simulateProjectile } from "@/games/core/physics";
import { GRAVITY, MAX_SHOT_SPEED, SHOOTER_X, SHOOTER_Y, TABLE_GROUND_Y, TABLE_WIDTH } from "./constants";
import type { BounceCupAction, BounceCupState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

interface BounceCupBoardProps {
  state: BounceCupState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: BounceCupAction) => void;
  disabled?: boolean;
}

const CANVAS_HEIGHT = 220;

export function BounceCupBoard({ state, myPlayerId, players, onAction, disabled }: BounceCupBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(60);
  const [animatedStep, setAnimatedStep] = useState<number | null>(null);
  const lastMoveCount = useRef(-1);

  const isMyTurn = state.currentTurnPlayerId === myPlayerId && !state.winnerPlayerId && !state.isDraw;
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);

  useEffect(() => {
    if (!state.lastShot || state.moveCount === lastMoveCount.current) return;
    lastMoveCount.current = state.moveCount;
    let frame = 0;
    let raf: number;
    const step = () => {
      frame += 4;
      setAnimatedStep(frame);
      if (frame < state.lastShot!.path.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [state.lastShot, state.moveCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = canvas.width / TABLE_WIDTH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Table.
    ctx.strokeStyle = "color-mix(in oklch, currentColor 25%, transparent)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, TABLE_GROUND_Y * scale);
    ctx.lineTo(canvas.width, TABLE_GROUND_Y * scale);
    ctx.stroke();

    // Shooter.
    ctx.fillStyle = "var(--color-party-cyan)";
    ctx.beginPath();
    ctx.arc(SHOOTER_X * scale, SHOOTER_Y * scale, 8, 0, Math.PI * 2);
    ctx.fill();

    // Cups.
    for (const cup of state.cups) {
      ctx.fillStyle = cup.cleared
        ? "color-mix(in oklch, currentColor 10%, transparent)"
        : "var(--color-party-amber)";
      ctx.beginPath();
      ctx.arc(cup.x * scale, TABLE_GROUND_Y * scale, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aim preview (no wind — the player doesn't know the roll in advance either).
    if (isMyTurn && !disabled) {
      const preview = simulateProjectile({
        start: { x: SHOOTER_X, y: SHOOTER_Y },
        velocity: velocityFromAimPower(angle, power, MAX_SHOT_SPEED),
        gravity: GRAVITY,
        wind: 0,
        dt: 1 / 60,
        maxSteps: 600,
        groundHeightAt: () => TABLE_GROUND_Y,
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

    // Animated last shot.
    if (state.lastShot && animatedStep !== null) {
      const visible = state.lastShot.path.slice(0, animatedStep);
      ctx.strokeStyle = "var(--color-party-pink)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      visible.forEach((p, i) => {
        const x = p.x * scale;
        const y = p.y * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const ballPoint = visible[visible.length - 1];
      if (ballPoint) {
        ctx.fillStyle = "var(--color-party-pink)";
        ctx.beginPath();
        ctx.arc(ballPoint.x * scale, ballPoint.y * scale, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [state.cups, state.lastShot, animatedStep, angle, power, isMyTurn, disabled]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center font-medium" aria-live="polite">
        {state.winnerPlayerId
          ? state.winnerPlayerId === myPlayerId
            ? "You cleared the last cup — you won!"
            : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : state.isDraw
            ? "It's a draw"
            : isMyTurn
              ? "Your shot — line it up"
              : `${currentPlayer?.nickname ?? "Opponent"} is shooting`}
      </p>

      <canvas
        ref={canvasRef}
        width={TABLE_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-surface w-full max-w-2xl rounded-2xl border bg-card"
        role="img"
        aria-label="Bounce Cup table showing the cup formation and your shot preview — use the angle and power sliders below to aim"
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
