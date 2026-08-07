export const COURT_WIDTH = 800;
export const GROUND_Y = 360;
export const SHOOTER_X = 60;
export const SHOOTER_Y = 300;
export const HOOP_Y = 160;
export const HOOP_RADIUS = 22;
export const HOOP_BASE_X = 420;
export const HOOP_AMPLITUDE = 80;
export const HOOP_FREQUENCY = 0.9;
export const GRAVITY = 900;
export const MAX_SHOT_SPEED = 800;
export const DT = 1 / 60;
export const MAX_STEPS = 500;
export const MAX_WIND = 50;
export const SHOTS_PER_PLAYER = 5;

export function hoopXForShot(shotIndex: number): number {
  return HOOP_BASE_X + Math.sin(shotIndex * HOOP_FREQUENCY) * HOOP_AMPLITUDE;
}
