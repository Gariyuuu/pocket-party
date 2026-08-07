"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { velocityFromAimPower, simulateProjectile } from "@/games/core/physics";
import { terrainHeightAt, TERRAIN_WIDTH } from "./terrain";
import { PROJECTILE_CONFIG } from "./projectiles";
import { DT, GRAVITY, MAX_SHOT_SPEED, MAX_STEPS } from "./constants";
import type { ProjectileType, TankTacticsAction, TankTacticsState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

const CANVAS_HEIGHT = 380;
const PROJECTILE_TYPES: ProjectileType[] = ["standard", "split", "heavy", "bounce", "smoke"];
const TANK_COLORS = ["var(--color-player-1)", "var(--color-player-2)", "var(--color-player-3)", "var(--color-player-4)"];

export function TankTacticsBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: TankTacticsState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: TankTacticsAction) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(60);
  const [projectileType, setProjectileType] = useState<ProjectileType>("standard");
  const [animatedStep, setAnimatedStep] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((state.turnEndsAt - Date.now()) / 1000)));
  const lastTurnCount = useRef(-1);
  const skipRequested = useRef(false);

  const myTank = state.tanks.find((t) => t.playerId === myPlayerId);
  const isMyTurn = state.currentTurnPlayerId === myPlayerId && !state.winnerPlayerId && !state.isDraw;
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);

  useEffect(() => {
    skipRequested.current = false;
  }, [state.turnCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((state.turnEndsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !state.winnerPlayerId && !state.isDraw && !skipRequested.current) {
        skipRequested.current = true;
        onAction({ type: "skip-turn", now: Date.now() });
      }
    }, 500);
    return () => clearInterval(interval);
  }, [state.turnEndsAt, state.winnerPlayerId, state.isDraw, onAction]);

  useEffect(() => {
    if (!state.lastShot || state.turnCount - 1 === lastTurnCount.current) return;
    lastTurnCount.current = state.turnCount - 1;
    let frame = 0;
    let raf: number;
    const step = () => {
      frame += 5;
      setAnimatedStep(frame);
      if (frame < state.lastShot!.path.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [state.lastShot, state.turnCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / TERRAIN_WIDTH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "color-mix(in oklch, var(--color-party-lime) 25%, transparent)";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= TERRAIN_WIDTH; x += 8) {
      ctx.lineTo(x * scale, terrainHeightAt(state.terrainHeights, x) * scale);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    state.tanks.forEach((tank, i) => {
      if (!tank.alive) return;
      const y = terrainHeightAt(state.terrainHeights, tank.x) * scale;
      ctx.fillStyle = TANK_COLORS[i % TANK_COLORS.length];
      ctx.fillRect(tank.x * scale - 10, y - 12, 20, 12);
      ctx.fillRect(tank.x * scale - 3, y - 20, 6, 10);
      // Colorblind-safe: a seat number, not just a color, marks each tank.
      ctx.fillStyle = "white";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), tank.x * scale, y - 4);
      // Health bar.
      ctx.fillStyle = "color-mix(in oklch, currentColor 20%, transparent)";
      ctx.fillRect(tank.x * scale - 14, y - 30, 28, 4);
      ctx.fillStyle = tank.health > 40 ? "var(--color-party-lime)" : "var(--color-party-pink)";
      ctx.fillRect(tank.x * scale - 14, y - 30, 28 * (tank.health / 100), 4);
    });

    for (const cloud of state.smokeClouds) {
      ctx.fillStyle = "color-mix(in oklch, currentColor 30%, transparent)";
      ctx.beginPath();
      ctx.arc(cloud.x * scale, terrainHeightAt(state.terrainHeights, cloud.x) * scale - 20, cloud.radius * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isMyTurn && !disabled && myTank) {
      const config = PROJECTILE_CONFIG[projectileType];
      const startY = terrainHeightAt(state.terrainHeights, myTank.x);
      const preview = simulateProjectile({
        start: { x: myTank.x, y: startY - 10 },
        velocity: velocityFromAimPower(angle, power, MAX_SHOT_SPEED * config.powerMultiplier),
        gravity: GRAVITY,
        wind: 0,
        dt: DT,
        maxSteps: MAX_STEPS,
        groundHeightAt: (x) => terrainHeightAt(state.terrainHeights, x),
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
      ctx.strokeStyle = "var(--color-party-amber)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      visible.forEach((p, i) => {
        const x = p.x * scale;
        const y = p.y * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      for (const impact of state.lastShot.impacts) {
        ctx.fillStyle = "color-mix(in oklch, var(--color-party-pink) 40%, transparent)";
        ctx.beginPath();
        ctx.arc(impact.x * scale, impact.y * scale, impact.radius * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [state, animatedStep, angle, power, projectileType, isMyTurn, disabled, myTank]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {state.tanks.map((tank, i) => (
          <Badge
            key={tank.playerId}
            variant={tank.alive ? "outline" : "secondary"}
            className={cn(!tank.alive && "opacity-50")}
            style={{ borderColor: TANK_COLORS[i % TANK_COLORS.length] }}
          >
            {players.find((p) => p.playerId === tank.playerId)?.nickname ?? "Player"}: {tank.health}
          </Badge>
        ))}
      </div>

      <p className="text-center font-medium" aria-live="polite">
        {state.winnerPlayerId
          ? state.winnerPlayerId === myPlayerId
            ? "Last tank standing — you won!"
            : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : state.isDraw
            ? "Everyone was knocked out — it's a draw"
            : isMyTurn
              ? `Your turn — ${secondsLeft}s left`
              : `${currentPlayer?.nickname ?? "Opponent"}'s turn`}
      </p>

      <canvas
        ref={canvasRef}
        width={TERRAIN_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-surface w-full max-w-3xl rounded-2xl border bg-card"
        role="img"
        aria-label="Tank Tactics terrain showing every tank's position and health — use the controls below to aim and fire"
      />

      {isMyTurn && !disabled && (
        <div className="flex w-full max-w-md flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {PROJECTILE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setProjectileType(type)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs capitalize transition-colors",
                  projectileType === type ? "border-primary bg-primary/10" : "border-border",
                )}
                title={PROJECTILE_CONFIG[type].description}
              >
                {PROJECTILE_CONFIG[type].label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Angle {Math.round(angle)}°</label>
            <Slider min={1} max={179} value={[angle]} onValueChange={(v) => setAngle(Array.isArray(v) ? v[0] : v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Power {Math.round(power)}</label>
            <Slider min={1} max={100} value={[power]} onValueChange={(v) => setPower(Array.isArray(v) ? v[0] : v)} />
          </div>
          <Button onClick={() => onAction({ type: "fire", angle, power, projectileType, now: Date.now() })}>
            Fire
          </Button>
        </div>
      )}
    </div>
  );
}
