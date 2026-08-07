/**
 * Central registry of every game on the platform. This is the single source
 * of truth for game ids, player counts, and rollout status — the lobby, the
 * landing page, and the multiplayer engine all read from here instead of
 * hardcoding game lists in multiple places.
 *
 * `status` reflects what's actually implemented: everything is "coming-soon"
 * until its game engine, UI, and sync are done. Flip a game to "available"
 * only in the phase that ships it — this is what the lobby's start-game
 * button and the landing page read to decide what's clickable.
 */

export type GameId =
  | "grid-three"
  | "fourfall"
  | "word-clash"
  | "bounce-cup"
  | "mini-hoops"
  | "tank-tactics"
  | "orb-hockey"
  | "pocket-shots"
  | "quick-draw"
  | "tile-rush"
  | "mini-golf"
  | "word-bites"
  | "sea-battle"
  | "checkers"
  | "chess"
  | "darts"
  | "cornhole"
  | "reversi"
  | "dots-and-boxes"
  | "yahtzee"
  | "mancala"
  | "trivia-blitz";

export type GameCategory = "classic" | "physics" | "reflex" | "puzzle";

export type GameStatus = "available" | "coming-soon";

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  category: GameCategory;
  minPlayers: number;
  maxPlayers: number;
  status: GameStatus;
  /** Whether this game needs continuous real-time sync vs. discrete turns. */
  realtime: boolean;
  accent: "violet" | "pink" | "cyan" | "amber" | "lime";
}

export const GAME_REGISTRY: Record<GameId, GameMeta> = {
  "grid-three": {
    id: "grid-three",
    name: "Grid Three",
    tagline: "Three in a row, reimagined.",
    description:
      "Claim a grid, outsmart your opponent, and line up three (or connect four on the big board).",
    category: "classic",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "violet",
  },
  fourfall: {
    id: "fourfall",
    name: "Fourfall",
    tagline: "Drop, stack, connect.",
    description:
      "Take turns dropping tokens down a seven-column tower and be first to connect four.",
    category: "classic",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "cyan",
  },
  "word-clash": {
    id: "word-clash",
    name: "Word Clash",
    tagline: "Build words before time runs out.",
    description:
      "Everyone shares the same letter pool. Build the longest, rarest words before the timer hits zero.",
    category: "puzzle",
    minPlayers: 2,
    maxPlayers: 4,
    status: "available",
    realtime: false,
    accent: "amber",
  },
  "bounce-cup": {
    id: "bounce-cup",
    name: "Bounce Cup",
    tagline: "Aim, bounce, sink it.",
    description:
      "Line up your shot and bounce the ball into shrinking cup formations.",
    category: "physics",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "pink",
  },
  "mini-hoops": {
    id: "mini-hoops",
    name: "Mini Hoops",
    tagline: "Swipe, shoot, score.",
    description: "A fast basketball shooting challenge with moving hoops and wind.",
    category: "physics",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "amber",
  },
  "tank-tactics": {
    id: "tank-tactics",
    name: "Tank Tactics",
    tagline: "Angle it. Fire it. Win it.",
    description:
      "Turn-based artillery on destructible terrain, with wind and five projectile types.",
    category: "physics",
    minPlayers: 2,
    maxPlayers: 4,
    status: "available",
    realtime: false,
    accent: "lime",
  },
  "orb-hockey": {
    id: "orb-hockey",
    name: "Orb Hockey",
    tagline: "Live paddle-vs-paddle action.",
    description: "Fast top-down air hockey with client prediction and live reconciliation.",
    category: "reflex",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: true,
    accent: "cyan",
  },
  "pocket-shots": {
    id: "pocket-shots",
    name: "Pocket Shots",
    tagline: "Top-down pocket billiards.",
    description: "Drag to aim, adjust your power, and sink your group first.",
    category: "physics",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "violet",
  },
  "quick-draw": {
    id: "quick-draw",
    name: "Quick Draw",
    tagline: "Draw it. Guess it. Fast.",
    description: "One player draws a prompt, everyone else races to guess it.",
    category: "reflex",
    minPlayers: 2,
    maxPlayers: 4,
    status: "available",
    realtime: true,
    accent: "pink",
  },
  "tile-rush": {
    id: "tile-rush",
    name: "Tile Rush",
    tagline: "Match fast, score faster.",
    description: "A two-minute competitive tile-matching sprint with power-ups.",
    category: "puzzle",
    minPlayers: 2,
    maxPlayers: 4,
    status: "available",
    realtime: false,
    accent: "lime",
  },
  "mini-golf": {
    id: "mini-golf",
    name: "Mini Golf",
    tagline: "Putt, bounce, hole out.",
    description: "Three obstacle courses, lowest total strokes wins — drag back and release to putt.",
    category: "physics",
    minPlayers: 2,
    maxPlayers: 4,
    status: "available",
    realtime: false,
    accent: "lime",
  },
  "word-bites": {
    id: "word-bites",
    name: "Word Bites",
    tagline: "Combine the bites, claim the word.",
    description: "Everyone shares one rack of letter chunks — connect adjacent bites into real words before anyone else grabs them.",
    category: "puzzle",
    minPlayers: 2,
    maxPlayers: 4,
    status: "available",
    realtime: false,
    accent: "amber",
  },
  "sea-battle": {
    id: "sea-battle",
    name: "Sea Battle",
    tagline: "Fire, hit, sink.",
    description: "Place your fleet in secret, then trade shots blind — sink every enemy ship first.",
    category: "classic",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "cyan",
  },
  checkers: {
    id: "checkers",
    name: "Checkers",
    tagline: "Jump, crown, conquer.",
    description: "Classic diagonal jumps and mandatory captures — clear the board or trap every last piece.",
    category: "classic",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "violet",
  },
  chess: {
    id: "chess",
    name: "Chess",
    tagline: "Every move, checked.",
    description: "The full game — castling, en passant, promotion, checkmate — right in the browser.",
    category: "classic",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "amber",
  },
  darts: {
    id: "darts",
    name: "Darts",
    tagline: "Aim small, score big.",
    description: "Three throws a round at a real dartboard target — highest score after five rounds wins.",
    category: "physics",
    minPlayers: 2,
    maxPlayers: 4,
    status: "available",
    realtime: false,
    accent: "pink",
  },
  cornhole: {
    id: "cornhole",
    name: "Cornhole",
    tagline: "On the board, in the hole.",
    description: "Toss bags at a tilted board — land on it for a point, sink the hole for three.",
    category: "physics",
    minPlayers: 2,
    maxPlayers: 4,
    status: "available",
    realtime: false,
    accent: "lime",
  },
  reversi: {
    id: "reversi",
    name: "Reversi",
    tagline: "Flip the board, own the board.",
    description: "Sandwich your opponent's discs to flip them to your color — whoever owns the most when the board fills wins.",
    category: "classic",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "lime",
  },
  "dots-and-boxes": {
    id: "dots-and-boxes",
    name: "Dots and Boxes",
    tagline: "Draw a line, claim a box.",
    description: "Claim the fourth side of a box to score it and go again — the classic pencil-and-paper chain game.",
    category: "classic",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "pink",
  },
  yahtzee: {
    id: "yahtzee",
    name: "Yahtzee",
    tagline: "Roll it, hold it, score it.",
    description: "Three rolls a turn, thirteen categories to fill — chase a Yahtzee or just bank a safe Chance.",
    category: "classic",
    minPlayers: 2,
    maxPlayers: 4,
    status: "available",
    realtime: false,
    accent: "cyan",
  },
  mancala: {
    id: "mancala",
    name: "Mancala",
    tagline: "Sow seeds, fill your store.",
    description: "Scoop a pit, sow around the board, and land in your own store for a bonus turn — classic Kalah rules.",
    category: "classic",
    minPlayers: 2,
    maxPlayers: 2,
    status: "available",
    realtime: false,
    accent: "amber",
  },
  "trivia-blitz": {
    id: "trivia-blitz",
    name: "Trivia Blitz",
    tagline: "Know it? Prove it.",
    description: "Eight rounds of multiple-choice trivia — everyone answers at once, fastest fingers don't matter, just being right.",
    category: "puzzle",
    minPlayers: 2,
    maxPlayers: 4,
    status: "available",
    realtime: false,
    accent: "violet",
  },
};

export const AVAILABLE_GAMES: GameMeta[] = Object.values(GAME_REGISTRY).filter(
  (g) => g.status === "available",
);

export const ALL_GAMES: GameMeta[] = Object.values(GAME_REGISTRY);

export function getGameMeta(id: GameId): GameMeta {
  return GAME_REGISTRY[id];
}
