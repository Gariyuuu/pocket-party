/**
 * Shared deterministic projectile simulator for every arc-shot game (Bounce
 * Cup, Mini Hoops, Tank Tactics). A "shot" is one action (angle + power),
 * simulated in full with a fixed timestep the instant it's submitted —
 * there's no continuous real-time ball sync between clients. Every client
 * (and the server validator) runs this exact same function over the exact
 * same recorded inputs and gets the exact same path, which is what makes
 * spectator sync and replay trivial: the path is 100% derived from data
 * already sitting in match_actions, never from live position broadcasts.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface ProjectileParams {
  start: Vec2;
  velocity: Vec2;
  gravity: number;
  wind: number;
  dt: number;
  maxSteps: number;
  /** Called after each integration step; returning "stop" ends the simulation early (e.g. a hit). */
  onStep?: (position: Vec2, velocity: Vec2, step: number) => "stop" | void;
  /** Ground/terrain height (y increases downward) at a given x — simulation stops on contact. */
  groundHeightAt?: (x: number) => number;
  /** 0 = stops dead on the ground, 1 = perfectly elastic. Omit for no bouncing (stop on contact). */
  restitution?: number;
  maxBounces?: number;
}

export interface ProjectileResult {
  path: Vec2[];
  finalPosition: Vec2;
  bounces: number;
  stoppedEarly: boolean;
}

export function simulateProjectile(params: ProjectileParams): ProjectileResult {
  const { start, gravity, wind, dt, maxSteps, onStep, groundHeightAt, restitution = 0, maxBounces = 0 } = params;

  let position: Vec2 = { ...start };
  let velocity: Vec2 = { ...params.velocity };
  const path: Vec2[] = [{ ...position }];
  let bounces = 0;
  let stoppedEarly = false;

  for (let step = 0; step < maxSteps; step++) {
    velocity = { x: velocity.x + wind * dt, y: velocity.y + gravity * dt };
    position = { x: position.x + velocity.x * dt, y: position.y + velocity.y * dt };

    if (groundHeightAt) {
      const groundY = groundHeightAt(position.x);
      if (position.y >= groundY) {
        position = { ...position, y: groundY };
        if (bounces < maxBounces && restitution > 0) {
          velocity = { x: velocity.x, y: -velocity.y * restitution };
          bounces += 1;
        } else {
          path.push({ ...position });
          break;
        }
      }
    }

    path.push({ ...position });

    if (onStep) {
      const signal = onStep(position, velocity, step);
      if (signal === "stop") {
        stoppedEarly = true;
        break;
      }
    }
  }

  return { path, finalPosition: position, bounces, stoppedEarly };
}

/** Small deterministic per-shot wind gust, derived from the match seed — never Math.random(). */
export function windForShot(rng: () => number, maxWind: number): number {
  return (rng() * 2 - 1) * maxWind;
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** angle in degrees (0 = straight right, 90 = straight up), power 0-100. */
export function velocityFromAimPower(angleDeg: number, power: number, maxSpeed: number): Vec2 {
  const rad = (angleDeg * Math.PI) / 180;
  const speed = (Math.max(0, Math.min(100, power)) / 100) * maxSpeed;
  return { x: Math.cos(rad) * speed, y: -Math.sin(rad) * speed };
}
