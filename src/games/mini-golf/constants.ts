export const COURSE_WIDTH = 700;
export const COURSE_HEIGHT = 380;
export const BALL_RADIUS = 8;
export const HOLE_RADIUS = 13;
export const FRICTION_PER_SECOND = 0.9;
export const WALL_RESTITUTION = 0.7;
export const MIN_SPEED = 3;
// Under this friction model, a ball's total travel distance before stopping
// is ~MAX_SHOT_SPEED / FRICTION_PER_SECOND — this needs enough headroom
// (~720) to cross the longest course's start-to-hole distance (~620) at full power.
export const MAX_SHOT_SPEED = 650;
export const DT = 1 / 120;
export const MAX_STEPS = 1500;
/** Force a hole-out (like real mini golf's "pick it up and move on") after this many strokes, so one stuck player can't stall the match forever. */
export const MAX_STROKES_PER_HOLE = 8;
