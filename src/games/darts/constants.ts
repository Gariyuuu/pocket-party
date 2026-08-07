export const CANVAS_WIDTH = 700;
export const CANVAS_HEIGHT = 400;
export const SHOOTER_X = 60;
export const SHOOTER_Y = 300;
export const TARGET_X = 620;
export const TARGET_Y = 150;
/** Innermost to outermost ring radius (px) and its score. */
export const RINGS: { radius: number; score: number; label: string }[] = [
  { radius: 18, score: 50, label: "Bullseye" },
  { radius: 40, score: 25, label: "Inner ring" },
  { radius: 70, score: 15, label: "Triple ring" },
  { radius: 110, score: 10, label: "Double ring" },
  { radius: 160, score: 5, label: "Outer ring" },
];
export const GRAVITY = 500;
export const MAX_SHOT_SPEED = 900;
export const DT = 1 / 120;
export const MAX_STEPS = 400;
export const DARTS_PER_TURN = 3;
export const TOTAL_ROUNDS = 5;
