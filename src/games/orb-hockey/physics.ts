import {
  GOAL_WIDTH,
  PADDLE_HIT_IMPULSE,
  PADDLE_RADIUS,
  PUCK_FRICTION_PER_SECOND,
  PUCK_MAX_SPEED,
  PUCK_RADIUS,
  TABLE_HEIGHT,
  TABLE_WIDTH,
} from "./constants";

export interface Vec2 {
  x: number;
  y: number;
}

export interface PuckState extends Vec2 {
  vx: number;
  vy: number;
}

export interface PaddleInput {
  position: Vec2;
  velocity: Vec2;
}

export interface StepResult {
  puck: PuckState;
  /** Which side's goal the puck entered — that side's opponent scores. */
  goalScoredAgainst: "bottom" | "top" | null;
}

const GOAL_LEFT = TABLE_WIDTH / 2 - GOAL_WIDTH / 2;
const GOAL_RIGHT = TABLE_WIDTH / 2 + GOAL_WIDTH / 2;

function clampSpeed(vx: number, vy: number, max: number): Vec2 {
  const speed = Math.hypot(vx, vy);
  if (speed <= max) return { x: vx, y: vy };
  const scale = max / speed;
  return { x: vx * scale, y: vy * scale };
}

/** One fixed-step physics tick — pure, deterministic given its inputs, run identically by both clients. */
export function stepOrbHockey(
  puck: PuckState,
  dt: number,
  bottomPaddle: PaddleInput,
  topPaddle: PaddleInput,
): StepResult {
  const decay = Math.max(0, 1 - PUCK_FRICTION_PER_SECOND * dt);
  let vx = puck.vx * decay;
  let vy = puck.vy * decay;
  let x = puck.x + vx * dt;
  let y = puck.y + vy * dt;

  if (x - PUCK_RADIUS < 0) {
    x = PUCK_RADIUS;
    vx = Math.abs(vx);
  } else if (x + PUCK_RADIUS > TABLE_WIDTH) {
    x = TABLE_WIDTH - PUCK_RADIUS;
    vx = -Math.abs(vx);
  }

  let goalScoredAgainst: "bottom" | "top" | null = null;
  const inGoalMouth = x > GOAL_LEFT && x < GOAL_RIGHT;

  if (y - PUCK_RADIUS < 0) {
    if (inGoalMouth && y < -PUCK_RADIUS) {
      goalScoredAgainst = "top";
    } else {
      y = PUCK_RADIUS;
      vy = Math.abs(vy);
    }
  } else if (y + PUCK_RADIUS > TABLE_HEIGHT) {
    if (inGoalMouth && y > TABLE_HEIGHT + PUCK_RADIUS) {
      goalScoredAgainst = "bottom";
    } else {
      y = TABLE_HEIGHT - PUCK_RADIUS;
      vy = -Math.abs(vy);
    }
  }

  for (const paddle of [bottomPaddle, topPaddle]) {
    const dx = x - paddle.position.x;
    const dy = y - paddle.position.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = PUCK_RADIUS + PADDLE_RADIUS;
    if (dist < minDist) {
      const nx = dx / dist;
      const ny = dy / dist;
      x = paddle.position.x + nx * minDist;
      y = paddle.position.y + ny * minDist;

      const relSpeed = vx * nx + vy * ny;
      if (relSpeed < 0) {
        vx -= relSpeed * nx;
        vy -= relSpeed * ny;
      }
      vx += paddle.velocity.x * PADDLE_HIT_IMPULSE;
      vy += paddle.velocity.y * PADDLE_HIT_IMPULSE;
    }
  }

  const clamped = clampSpeed(vx, vy, PUCK_MAX_SPEED);

  return {
    puck: { x, y, vx: clamped.x, vy: clamped.y },
    goalScoredAgainst,
  };
}

export function clampPaddleToHalf(position: Vec2, side: "bottom" | "top"): Vec2 {
  const x = Math.min(TABLE_WIDTH - PADDLE_RADIUS, Math.max(PADDLE_RADIUS, position.x));
  const y =
    side === "bottom"
      ? Math.min(TABLE_HEIGHT - PADDLE_RADIUS, Math.max(TABLE_HEIGHT / 2 + PADDLE_RADIUS, position.y))
      : Math.min(TABLE_HEIGHT / 2 - PADDLE_RADIUS, Math.max(PADDLE_RADIUS, position.y));
  return { x, y };
}

export function centerPuck(): PuckState {
  return { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 2, vx: 0, vy: 0 };
}
