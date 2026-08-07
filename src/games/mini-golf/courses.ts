import { COURSE_HEIGHT, COURSE_WIDTH } from "./constants";
import type { MiniGolfCourse } from "./types";

/**
 * Three fixed courses, played in order — deliberately not seed-randomized
 * (like Mini Hoops' `hoopXForShot`, not like Bounce Cup's/Word Clash's
 * seeded draws), since a hand-placed obstacle course needs a guaranteed
 * viable path, not a procedurally generated one.
 */
export const COURSES: MiniGolfCourse[] = [
  {
    name: "Straight Shot",
    start: { x: 60, y: COURSE_HEIGHT / 2 },
    hole: { x: COURSE_WIDTH - 60, y: COURSE_HEIGHT / 2 },
    obstacles: [],
    par: 2,
  },
  {
    name: "The Wall",
    start: { x: 60, y: COURSE_HEIGHT - 80 },
    hole: { x: COURSE_WIDTH - 60, y: 80 },
    obstacles: [
      // Blocks the top ~68% of the course at mid-width — only a bottom gap gets through.
      { x: 340, y: 0, width: 26, height: 260 },
    ],
    par: 3,
  },
  {
    name: "Zigzag",
    start: { x: 60, y: COURSE_HEIGHT / 2 },
    hole: { x: COURSE_WIDTH - 60, y: COURSE_HEIGHT / 2 },
    obstacles: [
      // Gap at the bottom of the first wall, gap at the top of the second — a genuine chicane.
      { x: 220, y: 0, width: 26, height: 260 },
      { x: 460, y: 120, width: 26, height: 380 - 120 },
    ],
    par: 4,
  },
];
