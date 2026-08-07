/**
 * Single-ball top-down rolling physics for Mini Golf: friction, course-
 * boundary bounces, rectangular obstacle bounces, and hole capture.
 * Deliberately simplified (no spin, no ball-height) — same "simplified
 * enough to work reliably in a browser multiplayer environment" brief as
 * Pocket Shots' physics.ts, which this is modeled on.
 */
import type { Vec2 } from "@/games/core/physics";
import type { MiniGolfObstacle } from "./types";

export interface PuttResult {
  path: Vec2[];
  finalPosition: Vec2;
  holedOut: boolean;
}

function resolveBounds(
  ball: { x: number; y: number; vx: number; vy: number },
  radius: number,
  width: number,
  height: number,
  restitution: number,
) {
  if (ball.x - radius < 0) {
    ball.x = radius;
    ball.vx = Math.abs(ball.vx) * restitution;
  } else if (ball.x + radius > width) {
    ball.x = width - radius;
    ball.vx = -Math.abs(ball.vx) * restitution;
  }
  if (ball.y - radius < 0) {
    ball.y = radius;
    ball.vy = Math.abs(ball.vy) * restitution;
  } else if (ball.y + radius > height) {
    ball.y = height - radius;
    ball.vy = -Math.abs(ball.vy) * restitution;
  }
}

/** Closest-point circle-vs-AABB bounce — the ball approaches from outside the rectangle. */
function resolveObstacle(
  ball: { x: number; y: number; vx: number; vy: number },
  radius: number,
  obstacle: MiniGolfObstacle,
  restitution: number,
) {
  const closestX = Math.max(obstacle.x, Math.min(ball.x, obstacle.x + obstacle.width));
  const closestY = Math.max(obstacle.y, Math.min(ball.y, obstacle.y + obstacle.height));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const dist = Math.hypot(dx, dy);
  if (dist >= radius || dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = radius - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const vDotN = ball.vx * nx + ball.vy * ny;
  if (vDotN < 0) {
    ball.vx -= (1 + restitution) * vDotN * nx;
    ball.vy -= (1 + restitution) * vDotN * ny;
  }
}

export function simulatePutt(params: {
  start: Vec2;
  velocity: Vec2;
  obstacles: MiniGolfObstacle[];
  hole: Vec2;
  holeRadius: number;
  ballRadius: number;
  bounds: { width: number; height: number };
  frictionPerSecond: number;
  wallRestitution: number;
  minSpeed: number;
  dt: number;
  maxSteps: number;
}): PuttResult {
  const { obstacles, hole, holeRadius, ballRadius, bounds, frictionPerSecond, wallRestitution, minSpeed, dt, maxSteps } =
    params;
  const ball = { x: params.start.x, y: params.start.y, vx: params.velocity.x, vy: params.velocity.y };
  const path: Vec2[] = [{ x: ball.x, y: ball.y }];
  let holedOut = false;

  for (let step = 0; step < maxSteps; step++) {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0) {
      const decay = Math.max(0, 1 - frictionPerSecond * dt);
      ball.vx *= decay;
      ball.vy *= decay;
    }
    if (Math.hypot(ball.vx, ball.vy) < minSpeed) {
      ball.vx = 0;
      ball.vy = 0;
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    resolveBounds(ball, ballRadius, bounds.width, bounds.height, wallRestitution);
    for (const obstacle of obstacles) resolveObstacle(ball, ballRadius, obstacle, wallRestitution);

    if (Math.hypot(ball.x - hole.x, ball.y - hole.y) <= holeRadius) {
      holedOut = true;
      ball.x = hole.x;
      ball.y = hole.y;
      ball.vx = 0;
      ball.vy = 0;
      path.push({ x: ball.x, y: ball.y });
      break;
    }

    if (step % 4 === 0) path.push({ x: ball.x, y: ball.y });

    if (ball.vx === 0 && ball.vy === 0) break;
  }

  path.push({ x: ball.x, y: ball.y });
  return { path, finalPosition: { x: ball.x, y: ball.y }, holedOut };
}
