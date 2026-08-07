export const GRAVITY = 950;
export const MAX_SHOT_SPEED = 850;
export const DT = 1 / 60;
export const MAX_STEPS = 600;
export const MAX_WIND = 45;
export const TURN_DURATION_MS = 30_000;
export const TANK_START_HEALTH = 100;
// Keeps the farthest two tanks (in a 2-player match) within MAX_SHOT_SPEED's
// range on flat terrain — see tests/unit/tank-tactics-engine.test.ts for the
// reachability check this was tuned against.
export const TANK_MARGIN = 200;
