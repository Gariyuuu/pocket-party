/**
 * Compact multi-ball 2D physics for Pocket Shots: friction, wall bounces,
 * equal-mass elastic ball-ball collisions, and pocket capture. Deliberately
 * simplified (no spin, no ball-height/jump shots) — "simplified enough to
 * work reliably in a browser multiplayer environment," per the brief.
 */
import { FRICTION_PER_SECOND, MIN_SPEED, POCKET_RADIUS, WALL_RESTITUTION } from "./constants";

export interface Ball2D {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pocketed: boolean;
}

export interface CollisionEvent {
  a: string;
  b: string;
  step: number;
}

export interface ShotSimResult {
  balls: Ball2D[];
  paths: Record<string, { x: number; y: number }[]>;
  pocketedIds: string[];
  collisions: CollisionEvent[];
}

function speed(ball: Ball2D): number {
  return Math.hypot(ball.vx, ball.vy);
}

function resolveWalls(ball: Ball2D, width: number, height: number, restitution: number) {
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx) * restitution;
  } else if (ball.x + ball.radius > width) {
    ball.x = width - ball.radius;
    ball.vx = -Math.abs(ball.vx) * restitution;
  }
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy) * restitution;
  } else if (ball.y + ball.radius > height) {
    ball.y = height - ball.radius;
    ball.vy = -Math.abs(ball.vy) * restitution;
  }
}

function resolveBallCollision(a: Ball2D, b: Ball2D) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const overlap = a.radius + b.radius - dist;
  const nx = dx / dist;
  const ny = dy / dist;

  if (overlap > 0) {
    a.x -= (nx * overlap) / 2;
    a.y -= (ny * overlap) / 2;
    b.x += (nx * overlap) / 2;
    b.y += (ny * overlap) / 2;
  }

  // Equal-mass elastic collision: swap the velocity component along the
  // collision normal, leave the tangential component untouched.
  const relVel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (relVel > 0) return; // already separating

  a.vx -= relVel * nx;
  a.vy -= relVel * ny;
  b.vx += relVel * nx;
  b.vy += relVel * ny;
}

export function simulateShot(
  initialBalls: Ball2D[],
  table: { width: number; height: number },
  pockets: { x: number; y: number }[],
  dt: number,
  maxSteps: number,
): ShotSimResult {
  const balls = initialBalls.map((b) => ({ ...b }));
  const paths: Record<string, { x: number; y: number }[]> = {};
  for (const ball of balls) paths[ball.id] = [{ x: ball.x, y: ball.y }];
  const pocketedIds: string[] = [];
  const collisions: CollisionEvent[] = [];

  for (let step = 0; step < maxSteps; step++) {
    let anyMoving = false;

    for (const ball of balls) {
      if (ball.pocketed) continue;
      const currentSpeed = speed(ball);
      if (currentSpeed > 0) {
        const decay = Math.max(0, 1 - FRICTION_PER_SECOND * dt);
        ball.vx *= decay;
        ball.vy *= decay;
      }
      if (speed(ball) < MIN_SPEED) {
        ball.vx = 0;
        ball.vy = 0;
      } else {
        anyMoving = true;
      }
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      resolveWalls(ball, table.width, table.height, WALL_RESTITUTION);
    }

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        if (a.pocketed || b.pocketed) continue;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist <= a.radius + b.radius) {
          collisions.push({ a: a.id, b: b.id, step });
          resolveBallCollision(a, b);
        }
      }
    }

    for (const ball of balls) {
      if (ball.pocketed) continue;
      for (const pocket of pockets) {
        if (Math.hypot(ball.x - pocket.x, ball.y - pocket.y) <= POCKET_RADIUS) {
          ball.pocketed = true;
          ball.vx = 0;
          ball.vy = 0;
          pocketedIds.push(ball.id);
          break;
        }
      }
    }

    if (step % 4 === 0) {
      for (const ball of balls) paths[ball.id].push({ x: ball.x, y: ball.y });
    }

    if (!anyMoving) break;
  }

  for (const ball of balls) paths[ball.id].push({ x: ball.x, y: ball.y });

  return { balls, paths, pocketedIds, collisions };
}

/** The first ball (other than the cue) the cue ball touches, in simulation order — used for foul checks. */
export function firstCueContact(collisions: CollisionEvent[], cueBallId: string): string | null {
  for (const event of collisions) {
    if (event.a === cueBallId) return event.b;
    if (event.b === cueBallId) return event.a;
  }
  return null;
}
