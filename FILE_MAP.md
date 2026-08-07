# FILE_MAP.md

Purpose, callers/callees, when to edit, and risk for every important file or file group. For the full directory tree, see `CLAUDE.md`'s "Repository structure" section — this file goes one level deeper.

Legend for risk: 🟢 low (isolated, easy to verify) · 🟡 medium (has a few callers, changing the shape breaks them) · 🔴 high (wide blast radius or security-sensitive — see `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW").

---

## Core multiplayer runtime (Ably + a stateless Next.js API route)

**Reworked from a PartyKit/Cloudflare Durable Object to Ably pub/sub + a Neon-persisted room table — see `DECISIONS.md` D-018 for the full reasoning.** There is no `party/` directory, no `wrangler.jsonc`, and no Durable Object anywhere in this repository anymore.

### `src/app/api/rooms/[code]/action/route.ts` 🔴
- **Purpose:** the single entry point every room/match action goes through — the direct successor to the old `party/game.ts`'s `onMessage` switch, now a stateless `POST` route instead of a stateful Durable Object. Loads the room's live state from Neon (`room-store.ts`), delegates to `room-state.ts`'s pure reducer, saves the result back, syncs the public-rooms listing, and publishes the new state to Ably so every *other* connected client finds out — the caller itself gets the new state directly in the HTTP response.
- **Imports:** `src/lib/identity/get-current-actor.ts`, `src/lib/multiplayer/rate-limit.ts`, `src/lib/realtime/{room-state,room-store,public-rooms,ably-server,finalize-match}.ts`.
- **When to edit:** adding a new action type to the protocol; changing rate-limit behavior at this layer (not game rules — those live in `room-state.ts`).
- **Risk:** every room/match interaction for all 10 games flows through this one route. A bug here can break all online play at once.

### `src/lib/realtime/room-state.ts` 🔴
- **Purpose:** the pure, I/O-free room/match reducer — `joinRoom`, `setReady`, `selectGame`, `setVisibility`, `setModifiers`, `startMatch`, `applyGameAction`, `rematch`, `returnToLobby`, `leaveRoom`, `markDisconnected`. Directly unit-tested (`tests/unit/realtime-room-state.test.ts`, 16 tests). **Unchanged in substance across the PartyKit→Ably rework** — it was already I/O-free, so it just moved from `src/lib/party/` to `src/lib/realtime/` with its types renamed (`Party*` → `Live*`/`Room*`).
- **Imports:** `games/core/{registry,engines,rng}.ts`, `games/word-clash/dictionary.ts`, `lib/validation/nickname.ts`, `protocol.ts`.
- **Imported by:** `src/app/api/rooms/[code]/action/route.ts` exclusively.
- **When to edit:** adding a new game with wall-clock-gated actions (add a new `if (gameId === "...")` special case); changing host/participant permission rules; changing match lifecycle behavior.
- **Risk:** touches every game's server-side validation in one file. A bug here can let an illegal move through for all 10 games at once, or block all matches from finalizing.

### `src/lib/realtime/room-store.ts` 🟡
- **Purpose:** loads/saves a `StoredRoomState` to/from the `live_rooms` Neon table — the direct replacement for what a Durable Object's in-memory storage used to hold, needed because Ably itself has no compute or storage of its own. Also exports `toRoomStateEvent()`, shared by the action route and `GET /api/rooms/[code]`.
- **When to edit:** changing what a room/match state snapshot includes at rest.

### `src/lib/realtime/ably-server.ts` 🔴
- **Purpose:** server-only Ably usage — `createRoomTokenRequest()` mints a per-room-scoped `TokenRequest` (called by `GET /api/ably-token`), `publishRoomState()` publishes a `"state"` event to a room's channel after every accepted action. Holds the raw `ABLY_API_KEY`; never imported from a `"use client"` file.
- **Risk:** the server-only auth boundary for the entire realtime layer — see `SECURITY.md`.

### `src/app/api/ably-token/route.ts`, `src/app/api/rooms/[code]/route.ts`, `src/app/api/cron/cleanup/route.ts` 🟡
- **`api/ably-token/route.ts`** — resolves the caller's identity, mints a scoped Ably `TokenRequest`. Called by `use-realtime-room.ts` as Ably's `authCallback`.
- **`api/rooms/[code]/route.ts`** — the initial-state `GET` every client fetches once on mount, before its Ably subscription is even established (replaces what a Durable Object's `onConnect` used to send automatically).
- **`api/cron/cleanup/route.ts`** — scheduled hourly via `vercel.json`, reclaims `live_rooms` rows idle past 4 hours (replaces a Durable Object's `onAlarm`, which has no Ably equivalent). Optionally protected by `CRON_SECRET`.

### `src/games/core/game-engine.ts` 🔴
- **Purpose:** the `GameEngine<TState, TAction>` interface every game implements (`createInitialState`, `applyAction`, `checkOutcome`, optional `getBotAction`). **Unaffected by the backend migration.**
- **Imported by:** every `games/*/engine.ts`, `games/core/engines.ts`.
- **When to edit:** only when changing the fundamental contract every game follows — requires updating all 10 engines plus `room-state.ts` plus both game shells.
- **Risk:** the widest-blast-radius file in the codebase.

### `src/games/core/engines.ts` 🟡
- **Purpose:** maps `GameId → engine instance`. Uses `any` internally (documented `eslint-disable`) to hold 10 differently-typed engines in one map.
- **When to edit:** adding an 11th game — add its entry here.
- **Risk:** a mismatched engine/GameId pairing fails at runtime, not compile time.

### `src/games/core/registry.ts` 🟡
- **Purpose:** single source of truth for game id/name/description/category/min-max players/status/realtime flag/accent color. Landing page, lobby, and `room-state.ts`'s player-count validation all read from here.
- **When to edit:** adding a game, changing player counts, flipping a game's `status`.
- **Risk:** low individually, but every consumer trusts this file completely — a wrong `minPlayers`/`maxPlayers` here silently breaks room-start validation.

### `src/lib/multiplayer/rate-limit.ts` 🟡
- **Purpose:** in-memory fixed-window rate limiter. **Now scoped per Vercel serverless-function instance, not per room** — a real regression from the PartyKit era, when it was scoped per Durable Object (see `SECURITY.md`). Still not distributed across rooms or instances.
- **Used by:** `src/app/api/rooms/[code]/action/route.ts` (by room+profile, general action limit + Tile-Rush-specific limit).
- **When to edit:** if this ever needs to be reliable at scale, swap for Redis/Vercel KV/Upstash behind the same `checkRateLimit(key, limit, windowMs)` signature.

### `src/lib/multiplayer/room-code.ts`, `extract-score.ts`, `types.ts` 🟢
- **Purpose:** the 4 surviving pure utilities from the pre-migration `lib/multiplayer/` (a 4th, `rate-limit.ts`, is covered above). `room-code.ts` generates/normalizes/validates the 6-character code (called client-side, since room creation is implicit on first `"join"` rather than a REST call). `extract-score.ts` computes a per-game numeric score at match finalization, used by `finalize-match.ts`. `types.ts` exports just the `RoomPlayer` interface every game board imports.
- **When to edit:** changing room-code format; adding a new game with a meaningful running score; changing the roster-entry shape every board renders.

### `src/lib/realtime/finalize-match.ts`, `achievements.ts`, `public-rooms.ts` 🟡
- **Purpose:** the Neon side-effects that happen on top of an accepted room/match action. `finalize-match.ts` writes `matches`/`match_players`/`profiles`/`leaderboard_entries` when a match ends; `achievements.ts` runs the 5 hardcoded achievement checks afterward (best-effort, wrapped in try/catch at the action route's call site); `public-rooms.ts` keeps `public_room_listings` in sync with room visibility/lobby state.
- **When to edit:** adding/changing an achievement (also requires a matching seed row in `src/lib/db/seed.ts`); changing what gets written at match end.
- **Risk:** low individually — all three are called in try/catch at their call sites in `src/app/api/rooms/[code]/action/route.ts`, so a bug here can't break the room/match itself, only silently skip a write.

### `src/lib/realtime/protocol.ts`, `use-realtime-room.ts` 🟡
- **`protocol.ts`** — the client↔server request/event shapes both sides import (`RoomActionRequest`, `RoomStateEvent`, `RoomBroadcastEvent`). Adding a request type is additive/safe; changing an existing one's shape requires updating `room-state.ts`, the action route, and `use-realtime-room.ts` together.
- **`use-realtime-room.ts`** — the one client hook every room/lobby/match component uses. Loads Ably from a CDN `<script>` tag (see `room-page-client.tsx` and `DECISIONS.md` D-018 for why — a real Next.js/webpack RSC parsing incompatibility with Ably's bundled npm output), opens an `Ably.Realtime` connection authenticated via `GET /api/ably-token`, subscribes to `"state"`/`"broadcast"` channel events, and exposes `sendBroadcast`/`onBroadcast` for Orb Hockey/Quick Draw. There is no HMAC room-token to keep in sync anymore — Ably's own token-request mechanism replaced it (`src/lib/realtime/ably-server.ts` mints, Ably itself verifies).

---

## Identity (Clerk + guest cookie)

### `src/lib/identity/get-current-actor.ts` 🔴
- **Purpose:** resolves "who is making this request" into a `profiles.id`, from either a Clerk session or the `guest_id` cookie, provisioning/claiming as needed.
- **Used by:** `api/ably-token/route.ts`, `api/rooms/[code]/action/route.ts`, `api/profile/route.ts`, `profile/page.tsx`, `leaderboard/page.tsx` (indirectly, via the identity API).
- **Risk:** the guest-profile claim-on-signup logic is a security-relevant guard (see `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW") — removing the "still unclaimed" check would let one Clerk sign-up silently reassign a different account's stats.

### `src/lib/identity/guest-cookie.ts` 🟢
- **Purpose:** the `guest_id` cookie name + generator (`crypto.randomUUID()`). Not a secret — an identity handle, not a credential.

### `src/middleware.ts` 🔴
- **Purpose:** runs Clerk's middleware + ensures the `guest_id` cookie exists, on almost every request.
- **Risk:** breaking this breaks identity resolution for every request, guest or not.

---

## Database (Neon + Drizzle)

### `src/lib/db/schema.ts` 🔴
- **Purpose:** the 9-table Drizzle schema (`profiles`, `matches`, `matchPlayers`, `achievements`, `profileAchievements`, `recentPlayers`, `leaderboardEntries`, `publicRoomListings`, `liveRooms`) — the single source of truth for what Neon holds. `liveRooms` is the table added by the Ably rework (D-018), holding ephemeral live room/match state as one JSONB row per active room — everything else is durable history.
- **When to edit:** adding a durable, cross-match data need. Run `npm run db:generate` after any change.
- **Risk:** a schema change with no matching migration silently drifts from what a real database actually has.

### `src/lib/db/client.ts` 🟡
- **Purpose:** `getDb()`, a lazily-cached Drizzle instance. `server-only`. No admin-vs-scoped split — every caller gets full access, so every caller is individually responsible for its own authorization check.

---

## Games (`src/games/<game>/`)

**Entirely unaffected by the backend migration.** Every game folder follows the same internal pattern: `types.ts` → `engine.ts` (pure reducer) → `board.tsx` (React UI) → optionally `bot.ts` + game-specific pure-logic files. See `FEATURES.md` for the per-game bot-architecture table and realtime flags. 🟡 risk uniformly — each game is isolated from the others, but each engine's `applyAction` must stay pure (no `Date.now()`, no `Math.random()`, no I/O) or it breaks determinism.

- `games/grid-three/` — `lines.ts` (win-line definitions)
- `games/fourfall/` — `lines.ts` (connect-four win detection)
- `games/word-clash/` — `dictionary.ts` (async real-word check, called from `room-state.ts`), `letter-pool.ts`, `scoring.ts`, `word-list.json`
- `games/bounce-cup/`, `games/mini-hoops/`, `games/tank-tactics/` — all consume `games/core/physics.ts`; Tank Tactics adds `projectiles.ts` + `terrain.ts`
- `games/orb-hockey/` — `physics.ts` + **the bot lives inside `board.tsx`'s animation loop**, not `bot.ts`/`engine.ts`. Its live paddle/puck sync goes over `use-realtime-room.ts`'s `sendBroadcast`/`onBroadcast`, relayed by Ably.
- `games/pocket-shots/` — `physics.ts` (billiards) + `rack.ts`
- `games/quick-draw/` — no `bot.ts`; bot/guessing logic hand-wired in `game-shell/solo-game-shell.tsx`. Pen strokes broadcast the same way as Orb Hockey's paddle.
- `games/tile-rush/` — `board-gen.ts`, `matching.ts`; bot logic hand-wired in `solo-game-shell.tsx`

### `src/games/core/physics.ts` 🟡
- **Purpose:** shared projectile simulator (gravity, bounce, wind) used by Bounce Cup, Mini Hoops, Tank Tactics.

### `src/games/core/rng.ts` 🔴
- **Purpose:** seeded PRNG. **Every** engine's non-bot randomness must come from here, keyed off the match's stored `seed`.
- **Risk:** swapping this for `Math.random()` anywhere inside an engine breaks determinism silently.

### `src/games/core/action.ts` 🟡
- **Purpose:** the action envelope Zod schema and rejection-reason types, validated inside `room-state.ts`'s `applyGameAction`.

---

## Shells and dispatch

### `src/components/game-shell/game-surface.tsx` 🔴
- **Purpose:** the single switch statement mapping a `gameId` to its `board.tsx` component. Also exports the `RealtimeBroadcast` type (`Pick<UseRealtimeRoomResult, "sendBroadcast" | "onBroadcast">`) threaded to Orb Hockey/Quick Draw.
- **When to edit:** adding an 11th game — the second file to touch (after `games/core/registry.ts` and `games/core/engines.ts`).

### `src/components/game-shell/online-game-shell.tsx`, `solo-game-shell.tsx` 🟡
- **Purpose:** the two wrappers every game board renders inside — `online-game-shell.tsx` wires up `use-realtime-room.ts` for multiplayer; `solo-game-shell.tsx` runs the engine locally against a bot.
- **Risk:** `solo-game-shell.tsx` has 4 games' worth of special-cased bot logic hand-wired in.

### `src/components/room/room-page-client.tsx` 🔴
- **Purpose:** renders the `next/script` tag loading Ably's client SDK from `cdn.ably.com` — a required workaround, not leftover debug code (see `DECISIONS.md` D-018 for the exact Next.js/webpack parse failure this avoids). The only place this script tag needs to render, since it's the entry point for every room/lobby/match view.
- **Risk:** removing the CDN script tag or replacing it with a normal `import Ably from "ably"` in a client component will break the realtime connection at build or runtime — see `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW".

### `src/components/game-shell/physics-heavy-games.tsx`, `rules-modal.tsx`, `tutorial-overlay.tsx`, `landscape-hint.tsx`, `match-result.tsx` 🟢
- **Purpose:** shared UI chrome around any game board.

---

## Where to make common changes

- **Add a new page/route:** create a folder under `src/app/` with a `page.tsx`. Add a nav link in `src/components/landing/site-nav.tsx` if it should be discoverable.
- **Add a new API route:** create `src/app/api/<path>/route.ts`. Keep it thin — most new room/match behavior should be a new `RoomActionRequest` type (`protocol.ts` + `room-state.ts` + the `POST /api/rooms/[code]/action` switch) rather than a new REST route.
- **Add a new game:** (1) add its metadata to `games/core/registry.ts`; (2) create `games/<id>/{types,engine,board}.ts(x)` implementing `GameEngine`; (3) register it in `games/core/engines.ts`; (4) add its case to `game-shell/game-surface.tsx`; (5) if it needs a bot, either implement `engine.getBotAction` or special-case it in `solo-game-shell.tsx`; (6) write engine unit tests in `tests/unit/`; (7) if it has wall-clock timers, add its special-casing to `room-state.ts`'s `applyGameAction`.
- **Modify auth:** `src/middleware.ts` (Clerk + guest-cookie bootstrap), `src/lib/identity/get-current-actor.ts` (identity resolution/claiming), `src/components/profile/account-linking.tsx` (linking UI). High-risk — see `CLAUDE.md`.
- **Change DB schema:** edit `src/lib/db/schema.ts`, run `npm run db:generate` to produce a new migration.
- **Change room/match permissions:** `src/lib/realtime/room-state.ts` (host-only/participant-only checks) — see `SECURITY.md` for the full current list.
- **Change themes/design tokens:** `src/app/globals.css` (the `--party-*` CSS variables and `@theme inline` block); `src/lib/design/theme-packs.ts` for the 3 selectable palettes; `scripts/generate-theme-backgrounds.js` + `npm run generate:themes` to regenerate the background PNGs after a palette change.
- **Update deployment settings:** `vercel.json` (the cron entry for `/api/cron/cleanup`), `.env.example` (document any new env var here — placeholders only, never real values). There is no Worker config anymore — a single Vercel deploy is the whole app.
- **Add an env var:** add it to `.env.example` with a placeholder and a comment; add a `requireEnv`-style accessor in `src/lib/db/env.ts` or `src/lib/realtime/env.ts` if it's required; document it in `CLAUDE.md`'s Environment setup table.
- **Modify global styles:** `src/app/globals.css`. Component-level styling is inline Tailwind classes.
- **Update multiplayer behavior (turn order, sync):** `room-state.ts` for server-side rules; the relevant `games/<id>/engine.ts` for game-specific rules; `use-realtime-room.ts` for how the client reacts to state changes.
- **Modify scoring:** each game's own scoring logic lives in its `engine.ts` (or a dedicated `scoring.ts`); how a final score is extracted for `match_players.score` is in `lib/multiplayer/extract-score.ts`.

---

## Technical debt

- The `"join"` action's rate limit (5/10s per room+profile) only stops same-room spam, not an attacker probing many different room codes — see `SECURITY.md`'s recommended fixes for what closing that would take.
- The in-memory rate limiter is now scoped per-Vercel-serverless-function-instance, not per-room the way it was when it lived inside a long-lived Cloudflare Durable Object — a real, acknowledged regression from the Ably rework (see `DECISIONS.md` D-018, `SECURITY.md`).
- Presence/disconnect detection is a best-effort `sendBeacon`/`pagehide` heuristic, not a guaranteed server-side signal the way a Durable Object's `onClose` was — another acknowledged tradeoff from the same rework.
