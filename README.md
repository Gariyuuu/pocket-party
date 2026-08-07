# Pocket Party

A browser-based multiplayer mini-game platform: create a room, share a
six-character code, and play fast rounds with friends — no download, no
account required.

**Status:** Feature-complete prototype, **deployed and live** at
https://pocket-party-eta.vercel.app. All twenty-two games — Grid Three,
Fourfall, Word Clash, Bounce Cup, Mini Hoops, Tank Tactics, Pocket Shots,
Orb Hockey, Quick Draw, Tile Rush, Mini Golf, Word Bites, Sea Battle,
Checkers, Chess, Darts, Cornhole, Reversi, Dots and Boxes, Yahtzee,
Mancala, and Trivia Blitz — are fully playable: real-time multiplayer, bot
opponents for solo play, rules/tutorial modals, sound, and rematch flow.
Accounts, achievements, match history, per-game leaderboards, and recent
opponents are wired end to end. Guest identity, room join/leave, and Ably
token minting are confirmed working against the live deployment — **no
human has clicked through it in a browser yet**, and a real two-person live
match hasn't been observed. See `PROJECT_STATE.md` for the exact current
state.

## Backend

Three services, all live:

- **Clerk** — real accounts. Guests never touch Clerk at all; they get a
  hand-rolled `guest_id` cookie instead (`src/lib/identity/guest-cookie.ts`),
  resolved to the same `profiles` row structure either way.
- **Neon** (serverless Postgres) via Drizzle — durable, cross-match data
  (`profiles`, `matches`, `match_players`, `achievements`,
  `profile_achievements`, `recent_players`, `leaderboard_entries`,
  `public_room_listings`), plus one table of ephemeral live state,
  `live_rooms`, holding whatever room/match is currently in progress. See
  `DATABASE.md`.
- **Ably** (hosted realtime pub/sub) — one channel per active room
  (`room:<code>`), carrying server-published room-state events and
  client-to-client broadcast events for the two high-frequency games. A
  Route Handler (`POST /api/rooms/[code]/action`) is the single place that
  validates and applies an action, persisting the result to `live_rooms` and
  publishing it to Ably. See `ARCHITECTURE.md`.

Guest → account upgrade preserves stats in place: the same `profiles.id`
row is claimed by a new Clerk user rather than replaced, the moment
`get-current-actor.ts` sees a still-unclaimed guest profile matching the
browser's `guest_id` cookie.

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Framer Motion · Zustand · Zod · Clerk (accounts) · Neon + Drizzle (database) ·
Ably (realtime) · Howler.js (procedurally generated tones, see "Audio"
below) · Vitest · Playwright

## The 22 games

- **Grid Three** — tic-tac-toe-style, classic 3x3 or a 5x5 connect-four
  variant. Bots: easy (mostly random), medium (wins/blocks immediate
  threats), hard (exact minimax on 3x3, 1-ply lookahead + threat-avoidance
  on 5x5).
- **Fourfall** — 7-column Connect Four with a falling-token animation and
  drop-column preview. Bot: minimax with alpha-beta pruning, depth 2/4/6 by
  difficulty.
- **Word Clash** — 3 timed rounds against a shared letter pool (Scrabble-ish
  tile distribution, seeded so every client draws the same pool). Words are
  checked against a bundled ~76k-word public-domain dictionary
  (`games/core/word-list.json`, shared with Word Bites). A word claimed by
  more than one player in the same round scores zero for everyone who found
  it.
- **Bounce Cup** — aim/power sliders, single-bounce table physics, a 6-cup
  rack that never refills. Bot: numerical grid search over angle/power
  against the actual physics simulator, then difficulty-scaled noise.
- **Mini Hoops** — best-of-five alternating shots at a hoop that moves
  between shots (a deterministic function of shot index). Bot: same
  grid-search approach.
- **Tank Tactics** — 2-4 tanks on a seeded random-walk terrain, 5 shell types
  (standard, split, heavy, bounce, smoke), wind that shifts every shot, a 30s
  turn timer, and craters that permanently reshape the terrain.
- **Pocket Shots** — an 8-ball-style hexagonal rack, drag-back-and-release
  aiming, a from-scratch equal-mass elastic collision solver, and a
  simplified foul set. Bot: ghost-ball aim geometry.
- **Orb Hockey** — the one genuinely real-time game with true low-latency
  physics. Score, serve/countdown, and the win condition go through the
  authoritative `POST /api/rooms/[code]/action` path; moment-to-moment
  paddle and puck motion never does — it's a generic Ably `"broadcast"`
  event published directly client-to-client (throttled to ~20/sec
  client-side), with one fixed seat-1 player as the puck-simulation
  authority and the only client the server accepts goal reports from.
- **Quick Draw** — a rotating artist draws a secret prompt while everyone
  else picks from four options. The artist's canvas strokes broadcast the
  same way Orb Hockey's paddle does; score, rounds, and the win condition
  stay server-authoritative.
- **Tile Rush** — a from-scratch match-and-clear puzzle, endless, seeded so
  every player starts from the same board and plays an independent copy for
  two minutes. Five power-ups: row clear, column clear, shuffle, a stacking
  score multiplier, and freeze.
- **Mini Golf** — three fixed obstacle courses, played in order. Each player
  putts their own ball; turns rotate, skipping anyone already holed out on
  the current hole. A per-hole stroke cap forces a hole-out so nobody can
  get stuck forever. Lowest total strokes across all three holes wins. Bot:
  grid search over angle/power against the actual rolling-friction
  simulator, obstacle bounces included.
- **Word Bites** — everyone shares one rack of letter "bites" (1-3 letter
  chunks) in a fixed left-to-right order, built at match start from a small
  curated word list and shuffled by source word (so each original word's
  bites stay connected, though a run spanning two words' boundary can spell
  something else entirely). Combine a connected, in-order run into a real
  word — checked against the same bundled dictionary Word Clash uses — to
  claim those tiles and score points. Longer combos score disproportionately
  more. Ends when the rack is fully claimed or the timer runs out.
- **Sea Battle** — classic Battleship on an 8x8 grid. Each player places a
  5-ship fleet privately (a non-turn-based phase — both players place
  independently, battling starts the instant both fleets are set), then
  takes turns firing on the opponent's grid; you only ever see your own
  hits/misses, never the opponent's unhit ships. Bot: hunts the neighbors of
  any unsunk hit, otherwise prefers a checkerboard firing pattern on hard.
- **Checkers** — 8x8, mandatory capture enforced (if a jump is available,
  only jump moves are legal), multi-jump chains with an optional stop
  partway through, kings crown on reaching the far row. Bot: prioritizes
  forced captures, then positional heuristics by difficulty.
- **Chess** — full rules: check/checkmate/stalemate detection, castling
  (both sides, with attacked-square checks), en passant, and pawn
  promotion. Board flips per viewer so your own pieces always render at the
  bottom. Bot: material evaluation plus a 2-ply minimax on hard difficulty.
- **Darts** — angle/power sliders, a real trajectory arc against a
  standard ring layout (bullseye through outer ring), 3 darts per turn.
  Bot: grid search over angle/power against the actual physics simulator.
- **Cornhole** — angle/power sliders, an elevated board-with-a-hole target,
  4 bags per turn. Bot: same grid-search approach as Darts.
- **Reversi** — classic disc-flipping on an 8x8 board. Sandwich the
  opponent's discs between two of yours (in a straight line) to flip them.
  No legal move? Your turn auto-skips — no explicit pass needed. Most
  discs when the board fills wins. Bot: standard positional-weight
  heuristic (corners valuable, the squares next to a corner risky).
- **Dots and Boxes** — claim the fourth side of a box to score it and go
  again — chain several together in one turn. Most boxes when every line
  is drawn wins. Bot: takes free boxes, stays "safe" otherwise, and on hard
  difficulty picks whichever forced sacrifice costs the fewest boxes by
  simulating the resulting chain reaction.
- **Yahtzee** — 3 rolls a turn (hold whichever dice you like between
  rolls), then lock your dice into one of 13 scoring categories. A 63+
  upper-section subtotal earns a 35-point bonus. Highest total after
  everyone fills all 13 categories wins.
- **Mancala** — classic Kalah rules on a 14-cell board. Sow a pit's seeds
  one-by-one around the board (skipping the opponent's store); land your
  last seed in your own store for another turn, or in an empty pit on your
  own side to capture it plus everything opposite. Most seeds in your
  store once one side empties out wins.
- **Trivia Blitz** — 8 rounds of multiple-choice general-knowledge
  questions. Everyone answers the same question independently — no turn
  order, no timer — and the next question appears once everyone has
  answered. Correct answers score 10 points; highest total wins.

Every turn-based game supports solo play against a bot from the landing
page's "Play Solo" button — that mode runs the same engine fully client-side
with no network calls.

All three physics games (Bounce Cup, Mini Hoops, Tank Tactics), Pocket
Shots, Mini Golf, Darts, and Cornhole share the deterministic-replay
pattern: a shot is one action, fully simulated the instant it's submitted
with a fixed timestep and a per-shot seed-derived value — never live-synced
ball positions. That's what makes the same shot replay identically for
every spectator and for server-side validation.

### Audio

There are no external sound files. `lib/audio/tone.ts` synthesizes short WAV
tone bursts (sine/square/triangle) at runtime and hands them to Howler as
data URIs — every effect is procedurally original. The ambient background
loop (`lib/audio/music.ts`) goes further: a polyphonic mixer
(`buildMixedToneDataUri`) layers a bassline, a sustained chord pad, and a
plucked melody into an 8-bar chord progression, rather than one oscillator
playing one note at a time.

## Platform features

- **App icon**: `app/icon.tsx` / `app/apple-icon.tsx` generate the favicon
  and Apple touch icon at build time via `next/og`'s `ImageResponse`.
- **Patch notes** (`/patch-notes`): a manually curated changelog in
  `lib/content/patch-notes.ts` — not auto-generated from commits.
- **Theme wheel** (Settings → Theme): three selectable palettes — Classic
  Party, Arcade Neon, Sunset Warmth — each with its own light/dark PNG
  background (landing hero + both lobby screens only, not inside game
  boards). The six PNGs are generated from scratch by
  `scripts/generate-theme-backgrounds.js` — a hand-rolled PNG encoder.
  Regenerate with `npm run generate:themes` if a palette changes.
- **Settings menu**: sound, music, vibration, and high-contrast toggles.
- **Reduced motion, colorblind-safe player distinctions, keyboard support,
  screen-reader labels, a landscape hint on narrow physics-game viewports,
  a fullscreen toggle, haptic feedback, and error boundaries** — all in
  place; see `FEATURES.md` for the full detail per feature.

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Neon, Clerk, and Ably

You need accounts with all three (free tiers work for development):

1. **Neon** — create a project, copy its pooled connection string. Run
   `npm run db:migrate` to apply `drizzle/*.sql`, then `npm run db:seed` to
   load the achievement catalog.
2. **Clerk** — create an application, copy the publishable + secret keys.
3. **Ably** — create an app, copy an API key with subscribe/publish/presence
   capability. Nothing else needs pre-registering — `src/lib/realtime/ably-server.ts`
   mints per-room-scoped tokens dynamically.

Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `ABLY_API_KEY`.

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Creating a room in one
browser and opening the invite link in another (or a private window) is the
fastest way to see the multiplayer lobby sync live.

## Database

Schema lives in `src/lib/db/schema.ts` (Drizzle) — see `DATABASE.md` for the
full table-by-table breakdown and ER diagram.

```bash
npm run db:generate   # regenerate a migration after changing schema.ts
npm run db:migrate    # apply pending migrations to DATABASE_URL
npm run db:studio     # browse the schema locally
npm run db:seed       # (re)seed the achievement catalog
```

## Testing

```bash
npm run test        # Vitest — logic/unit tests
npm run test:e2e     # Playwright — needs real Neon/Clerk/Ably credentials, see TESTING.md
```

## Deploying

A single Vercel deploy for the whole app — see `DEPLOYMENT.md` for the full
checklist:

1. Push this project to its own GitHub repo (deploy the `pocket-party/`
   subfolder as its own project if working out of a monorepo-style folder,
   not the parent).
2. Import into Vercel, add the 4 env vars under Settings → Environment
   Variables (Production **and** Preview), disable the default Deployment
   Protection wall, deploy.
3. That's it — no separate Worker deploy. Ably and Neon are hosted services
   this repo only ever calls over the network.

## Troubleshooting

- **"Missing required environment variable ..." at build/runtime** — copy
  `.env.example` to `.env.local` (or set the same keys in Vercel) and
  restart.
- **Room page stuck on "connecting"** — either `GET /api/ably-token` is
  failing (check `ABLY_API_KEY`), or Ably's CDN script
  (`cdn.ably.com/lib/ably.min-2.js`) is blocked by a firewall/ad blocker —
  see `DECISIONS.md` D-018 for why the client SDK loads from a CDN
  `<script>` tag instead of an npm import.
- **Linked an account but the Profile page still says "Guest"** —
  `getCurrentActor()` resolves this synchronously on every server render, so
  a stale client cache is the likely cause; hard-refresh `/profile`.
- **TypeScript complains about a Drizzle table/column** — the schema is
  defined directly in `src/lib/db/schema.ts` (not generated from a live
  database) — check it matches what you're querying.

## Project structure

```text
src/
  app/            # routes: landing, room/[code], game/[gameId], lobby, leaderboard, profile, api/ (rooms/[code], rooms/[code]/action, ably-token, profile, public-rooms, cron/cleanup)
  components/      # ui/, landing/, room/, lobby/, scoreboard/, profile/
  games/
    core/          # registry, GameEngine contract, seeded RNG, action envelope, shared dictionary (Word Clash + Word Bites)
    <game-id>/     # one folder per game
  lib/
    db/            # Neon client, Drizzle schema, seed script
    identity/      # guest-cookie identity, get-current-actor (Clerk + guest resolution)
    realtime/      # room-state reducer, protocol, room-store (Neon), ably-server, use-realtime-room hook, finalize-match, achievements, public-rooms
    multiplayer/   # 4 surviving backend-agnostic utilities: room-code, rate-limit, extract-score, types
    validation/    # zod schemas (nicknames, etc.)
    design/        # design tokens (colors, spacing, type scale)
drizzle/            # generated SQL migrations for src/lib/db/schema.ts
vercel.json         # Vercel Cron config — daily idle-room cleanup
```
