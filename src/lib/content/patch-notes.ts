export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
}

/** Manually curated per release — not auto-generated from commits. */
export const PATCH_NOTES: PatchNote[] = [
  {
    version: "0.7.0",
    title: "Polish pass",
    date: "2026-08-06",
    highlights: [
      "New settings menu: sound, music, vibration, and high-contrast toggles",
      "A short procedural ambient music loop, off by default until you toggle it on",
      "Colorblind-safe fixes across Fourfall, Tank Tactics, Orb Hockey, Pocket Shots, and Tile Rush — shapes and labels now back up every color",
      "Keyboard support for Orb Hockey's paddle (arrow keys)",
      "Screen-reader labels added to every game board that was missing one",
      "A landscape-orientation hint on physics-heavy games, and a fullscreen toggle in the game header",
      "Custom error and \"not found\" pages instead of framework defaults",
      "Idle rooms now actually get cleaned up on a schedule (they always had the code, just never a trigger)",
    ],
  },
  {
    version: "0.6.0",
    title: "Accounts and progression",
    date: "2026-08-05",
    highlights: [
      "Link an email or Google account to a guest session without losing any stats — same profile, same history",
      "Achievements: first win, a 3-win streak in one room, wins across 5+ games, a big Word Clash round, a fast Grid Three win",
      "Match history, recent opponents, and a favorite game, all tracked automatically",
      "Per-game leaderboards instead of one mixed list",
      "Fixed a real bug where finished matches could disappear from history within 30 minutes",
    ],
  },
  {
    version: "0.5.0",
    title: "Quick Draw & Tile Rush",
    date: "2026-08-05",
    highlights: [
      "Quick Draw: rotating-artist drawing and guessing, live stroke sync, speed-based scoring",
      "Tile Rush: match-and-clear puzzle race with row/column clears, shuffle, multiplier, and a progress-hiding freeze power-up",
      "Bots for both, so solo mode works even for games built around multiple players",
    ],
  },
  {
    version: "0.4.0",
    title: "Pocket Shots & Orb Hockey",
    date: "2026-08-05",
    highlights: [
      "Pocket Shots: an original 8-ball-style billiards game with real ball-collision physics",
      "Orb Hockey: the platform's first real-time game — live paddle sync over Supabase Realtime Broadcast, not just turn-based actions",
    ],
  },
  {
    version: "0.3.0",
    title: "Physics games",
    date: "2026-08-05",
    highlights: [
      "Bounce Cup, Mini Hoops, and Tank Tactics — all sharing one deterministic projectile physics engine",
      "Five distinct shell types in Tank Tactics, each with real physics differences",
      "A shared seed means every shot replays identically for every spectator",
    ],
  },
  {
    version: "0.2.0",
    title: "First playable games",
    date: "2026-08-05",
    highlights: [
      "Grid Three, Fourfall, and Word Clash — fully multiplayer, with bots for solo play",
      "The server-authoritative match engine every later game builds on",
      "Procedurally generated sound effects — no external audio files anywhere on the platform",
    ],
  },
  {
    version: "0.1.0",
    title: "Foundation",
    date: "2026-08-05",
    highlights: [
      "Create a room, share a code, join without an account",
      "Guests are real (anonymous) accounts under the hood, so stats aren't fake and RLS is real",
      "The design system, lobby, and reconnection handling everything else was built on",
    ],
  },
];
