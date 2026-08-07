"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  centerPuck,
  clampPaddleToHalf,
  stepOrbHockey,
  type PuckState,
  type Vec2,
} from "./physics";
import { PADDLE_RADIUS, PUCK_RADIUS, GOAL_WIDTH, TABLE_HEIGHT, TABLE_WIDTH } from "./constants";
import type { OrbHockeyAction, OrbHockeyState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";
import type { RealtimeBroadcast } from "@/components/game-shell/game-surface";

const CANVAS_DISPLAY_HEIGHT = 460;
const PADDLE_BROADCAST_MS = 50;
const PUCK_BROADCAST_MS = 80;

interface OrbHockeyBoardProps {
  state: OrbHockeyState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: OrbHockeyAction) => void;
  disabled?: boolean;
  matchId?: string;
  broadcast?: RealtimeBroadcast;
  botDifficulty?: "easy" | "medium" | "hard";
}

export function OrbHockeyBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
  matchId,
  broadcast,
  botDifficulty = "medium",
}: OrbHockeyBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mySide = state.players.findIndex((p) => p.playerId === myPlayerId) === 0 ? "bottom" : "top";
  const opponentSide = mySide === "bottom" ? "top" : "bottom";
  const isSolo = !matchId;
  const isHost = isSolo || mySide === "bottom"; // the "seat 1" player is always the puck-simulation authority

  const myPaddle = useRef<Vec2>(defaultPaddlePosition(mySide));
  const myPaddleVelocity = useRef<Vec2>({ x: 0, y: 0 });
  const opponentPaddle = useRef<Vec2>(defaultPaddlePosition(opponentSide));
  const puck = useRef<PuckState>(centerPuck());
  const lastFrameTime = useRef<number | null>(null);
  const lastPaddleBroadcast = useRef(0);
  const lastPuckBroadcast = useRef(0);
  const serveRequested = useRef(false);
  const [, forceRender] = useState(0);

  useEffect(() => {
    serveRequested.current = false;
  }, [state.status]);

  // Countdown → live transition, same wall-clock-gated pattern as other timed games.
  useEffect(() => {
    if (state.status !== "countdown" || state.winnerPlayerId) return;
    const interval = setInterval(() => {
      if (Date.now() >= state.countdownEndsAt && !serveRequested.current) {
        serveRequested.current = true;
        puck.current = centerPuck();
        onAction({ type: "start-serve", now: Date.now() });
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.status, state.countdownEndsAt, state.winnerPlayerId, onAction]);

  useEffect(() => {
    if (isSolo || !broadcast) return;
    const unsubPaddle = broadcast.onBroadcast("paddle", (payload) => {
      opponentPaddle.current = payload as Vec2;
    });
    const unsubPuck = broadcast.onBroadcast("puck-sync", (payload) => {
      if (!isHost) puck.current = payload as PuckState;
    });
    const unsubServe = broadcast.onBroadcast("serve", () => {
      puck.current = centerPuck();
    });
    return () => {
      unsubPaddle();
      unsubPuck();
      unsubServe();
    };
  }, [broadcast, isSolo, isHost]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf: number;

    function frame(now: number) {
      const dt = lastFrameTime.current ? Math.min(0.05, (now - lastFrameTime.current) / 1000) : 1 / 60;
      lastFrameTime.current = now;

      if (isSolo) {
        moveBotPaddle(opponentPaddle.current, puck.current, opponentSide, botDifficulty, dt);
      }

      if (state.status === "live" && !state.winnerPlayerId) {
        const bottomInput = {
          position: mySide === "bottom" ? myPaddle.current : opponentPaddle.current,
          velocity: mySide === "bottom" ? myPaddleVelocity.current : { x: 0, y: 0 },
        };
        const topInput = {
          position: mySide === "top" ? myPaddle.current : opponentPaddle.current,
          velocity: mySide === "top" ? myPaddleVelocity.current : { x: 0, y: 0 },
        };

        if (isHost) {
          const result = stepOrbHockey(puck.current, dt, bottomInput, topInput);
          puck.current = result.puck;

          if (result.goalScoredAgainst) {
            const scoringSide = result.goalScoredAgainst === "top" ? "bottom" : "top";
            const scoringPlayerId = state.players[scoringSide === "bottom" ? 0 : 1].playerId;
            puck.current = centerPuck();
            if (broadcast) broadcast.sendBroadcast("serve", {});
            onAction({ type: "score-goal", scoringPlayerId, now: Date.now() });
          } else if (broadcast && now - lastPuckBroadcast.current > PUCK_BROADCAST_MS) {
            lastPuckBroadcast.current = now;
            broadcast.sendBroadcast("puck-sync", puck.current);
          }
        }
      }

      if (broadcast && now - lastPaddleBroadcast.current > PADDLE_BROADCAST_MS) {
        lastPaddleBroadcast.current = now;
        broadcast.sendBroadcast("paddle", myPaddle.current);
      }

      render(canvas!, state, myPaddle.current, opponentPaddle.current, puck.current, mySide, players, myPlayerId);
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.winnerPlayerId, mySide, isHost, isSolo, broadcast, botDifficulty]);

  function movePaddleTo(raw: Vec2) {
    const clamped = clampPaddleToHalf(raw, mySide);
    myPaddleVelocity.current = {
      x: (clamped.x - myPaddle.current.x) / (1 / 60),
      y: (clamped.y - myPaddle.current.y) / (1 / 60),
    };
    myPaddle.current = clamped;
    forceRender((n) => n + 1);
  }

  function handlePointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    movePaddleTo({ x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY });
  }

  const PADDLE_KEY_STEP = 22;

  function handleKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const delta: Vec2 = { x: 0, y: 0 };
    if (e.key === "ArrowLeft") delta.x = -PADDLE_KEY_STEP;
    else if (e.key === "ArrowRight") delta.x = PADDLE_KEY_STEP;
    else if (e.key === "ArrowUp") delta.y = -PADDLE_KEY_STEP;
    else if (e.key === "ArrowDown") delta.y = PADDLE_KEY_STEP;
    else return;
    e.preventDefault();
    movePaddleTo({ x: myPaddle.current.x + delta.x, y: myPaddle.current.y + delta.y });
  }

  const opponentPlayer = players.find((p) => p.playerId !== myPlayerId);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-4 font-display text-2xl font-bold">
        <span>{state.scoreByPlayer[myPlayerId] ?? 0}</span>
        <span className="text-sm font-normal text-muted-foreground">vs {opponentPlayer?.nickname ?? "Bot"}</span>
        <span>{state.scoreByPlayer[state.players.find((p) => p.playerId !== myPlayerId)?.playerId ?? ""] ?? 0}</span>
      </div>

      {state.status === "countdown" && !state.winnerPlayerId && (
        <Badge variant="secondary">
          Serving in {Math.max(0, Math.ceil((state.countdownEndsAt - Date.now()) / 1000))}…
        </Badge>
      )}

      <canvas
        ref={canvasRef}
        width={TABLE_WIDTH}
        height={TABLE_HEIGHT}
        style={{ height: CANVAS_DISPLAY_HEIGHT, width: (CANVAS_DISPLAY_HEIGHT * TABLE_WIDTH) / TABLE_HEIGHT }}
        className="game-surface touch-none rounded-2xl border bg-card"
        tabIndex={0}
        role="application"
        aria-label="Orb Hockey table — drag, or use arrow keys, to move your paddle (A)"
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

function defaultPaddlePosition(side: "bottom" | "top"): Vec2 {
  return { x: TABLE_WIDTH / 2, y: side === "bottom" ? TABLE_HEIGHT - 80 : 80 };
}

const BOT_REACTION = { easy: 0.03, medium: 0.07, hard: 0.14 } as const;

function moveBotPaddle(
  botPaddle: Vec2,
  puckState: PuckState,
  side: "bottom" | "top",
  difficulty: "easy" | "medium" | "hard",
  dt: number,
) {
  const reaction = BOT_REACTION[difficulty];
  const targetX = puckState.x;
  const defaultY = defaultPaddlePosition(side).y;
  const targetY = side === "bottom" ? Math.min(defaultY, puckState.y + 60) : Math.max(defaultY, puckState.y - 60);

  botPaddle.x += (targetX - botPaddle.x) * Math.min(1, reaction * dt * 60);
  botPaddle.y += (targetY - botPaddle.y) * Math.min(1, reaction * dt * 60);
  const clamped = clampPaddleToHalf(botPaddle, side);
  botPaddle.x = clamped.x;
  botPaddle.y = clamped.y;
}

function render(
  canvas: HTMLCanvasElement,
  state: OrbHockeyState,
  myPaddle: Vec2,
  opponentPaddle: Vec2,
  puckState: PuckState,
  mySide: "bottom" | "top",
  players: RoomPlayer[],
  myPlayerId: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "color-mix(in oklch, var(--color-party-cyan) 10%, transparent)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "color-mix(in oklch, currentColor 20%, transparent)";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  const goalLeft = canvas.width / 2 - GOAL_WIDTH / 2;
  ctx.strokeStyle = "var(--color-party-amber)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(goalLeft, 2);
  ctx.lineTo(goalLeft + GOAL_WIDTH, 2);
  ctx.moveTo(goalLeft, canvas.height - 2);
  ctx.lineTo(goalLeft + GOAL_WIDTH, canvas.height - 2);
  ctx.stroke();

  const bottomPos = mySide === "bottom" ? myPaddle : opponentPaddle;
  const topPos = mySide === "top" ? myPaddle : opponentPaddle;

  ctx.fillStyle = "var(--color-player-1)";
  ctx.beginPath();
  ctx.arc(bottomPos.x, bottomPos.y, PADDLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "var(--color-player-2)";
  ctx.beginPath();
  ctx.arc(topPos.x, topPos.y, PADDLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Colorblind-safe: a letter, not just a color, marks each paddle.
  ctx.fillStyle = "white";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", bottomPos.x, bottomPos.y);
  ctx.fillText("B", topPos.x, topPos.y);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "var(--color-party-violet)";
  ctx.beginPath();
  ctx.arc(puckState.x, puckState.y, PUCK_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  if (state.winnerPlayerId) {
    ctx.fillStyle = "color-mix(in oklch, currentColor 60%, transparent)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    const winnerName =
      state.winnerPlayerId === myPlayerId
        ? "You win!"
        : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} wins!`;
    ctx.fillText(winnerName, canvas.width / 2, canvas.height / 2);
  }
}
