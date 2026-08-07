export const TABLE_WIDTH = 760;
export const TABLE_HEIGHT = 380;
export const BALL_RADIUS = 11;
export const POCKET_RADIUS = 20;
export const FRICTION_PER_SECOND = 0.65; // fraction of speed lost per second
export const WALL_RESTITUTION = 0.85;
export const MIN_SPEED = 4;
export const MAX_SHOT_SPEED = 620;
export const DT = 1 / 120;
export const MAX_STEPS = 1200;
export const PATH_SAMPLE_STRIDE = 4;

export const CUE_BALL_ID = "cue";
export const COMET_BALL_ID = "comet";

export const POCKETS = [
  { x: 0, y: 0 },
  { x: TABLE_WIDTH / 2, y: -6 },
  { x: TABLE_WIDTH, y: 0 },
  { x: 0, y: TABLE_HEIGHT },
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + 6 },
  { x: TABLE_WIDTH, y: TABLE_HEIGHT },
];
