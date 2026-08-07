# ARCHITECTURE.md

## System overview

Pocket Party is a single Next.js 15 App Router application — no separate backend service, no Cloudflare Worker, nothing else to deploy. "The backend" is Next.js Route Handlers (Vercel serverless functions) plus three external services: **Clerk** (real accounts), **Neon** (serverless Postgres, via Drizzle), and **Ably** (hosted realtime pub/sub). Room/match state that used to live in a Cloudflare Durable Object's memory now lives in a small Neon table, read and written by a stateless API route on every action — see `DECISIONS.md` D-018 for the full reasoning behind this shape (Ably has no compute or storage of its own, unlike a Durable Object, which is what made this split necessary).

```mermaid
flowchart TB
    subgraph Browser["Browser (per player)"]
        UI["React UI\n(App Router client components)"]
        LocalState["Zustand stores\n(persist → localStorage)\naudio / accessibility / theme-pack / seen-tutorials"]
        AblyClient["Ably client\n(loaded via <Script> from Ably's CDN)"]
    end

    subgraph Vercel["Vercel (Next.js server)"]
        MW["middleware.ts\nClerk session + guest_id cookie"]
        Pages["Server Components\n(pages, initial Neon reads)"]
        RoomsAPI["GET /api/rooms/[code]\ninitial state fetch"]
        ActionAPI["POST /api/rooms/[code]/action\nevery room/match action"]
        TokenAPI["GET /api/ably-token\nmints a scoped Ably token"]
        ProfileAPI["PATCH /api/profile"]
        PublicRoomsAPI["GET /api/public-rooms"]
        CronAPI["GET /api/cron/cleanup\n(Vercel Cron, hourly)"]
    end

    subgraph Ably["Ably (hosted pub/sub)"]
        Channel["room:&lt;code&gt; channel\n\"state\" + \"broadcast\" events"]
    end

    subgraph Clerk["Clerk"]
        ClerkAuth["Real-account sessions"]
    end

    subgraph Neon["Neon (Postgres via Drizzle)"]
        LiveRooms["live_rooms\n(one JSONB row per active room)"]
        Durable["profiles, matches, match_players,\nachievements, profile_achievements,\nrecent_players, leaderboard_entries,\npublic_room_listings"]
    end

    UI -- "on mount: fetch current state" --> RoomsAPI
    RoomsAPI --> LiveRooms
    UI -- "fetch a scoped token" --> TokenAPI
    TokenAPI --> ClerkAuth
    AblyClient -- "subscribe/publish" --> Channel
    UI -- "POST an action" --> ActionAPI
    ActionAPI -- "load/save state" --> LiveRooms
    ActionAPI -- "publish the result" --> Channel
    ActionAPI -- "on match end: finalizeMatch()" --> Durable
    ActionAPI -- "sync the public listing" --> Durable
    MW --> ClerkAuth
    Pages -- "Drizzle reads,\nfiltered to getCurrentActor().profileId" --> Durable
    ProfileAPI --> Durable
    PublicRoomsAPI -- "read-only, unauthenticated" --> Durable
    CronAPI -- "delete idle rows" --> LiveRooms
```

## Frontend structure

- **App Router** (`src/app/`). Flat top-level route folders: `room/[code]`, `game/[gameId]`, `lobby`, `profile`, `leaderboard`, `patch-notes`.
- **`layout.tsx`** is the single root layout, wrapped in `<ClerkProvider>`. It composes: `ClerkProvider` → theme provider (`next-themes`) → theme-pack provider → audio provider → `MotionConfig` (Framer Motion, `reducedMotion="user"`) → page content → `Toaster` (sonner).
- **Server vs. client components:** `/profile` and `/leaderboard` are Server Components that resolve identity (`getCurrentActor()`) and read Neon directly via Drizzle. `room/[code]/page.tsx` is a thin client shell (`RoomPageClient`) — there's no server-side room lookup; the client fetches the room's current state directly and opens an Ably subscription for live updates.
- **Game boards** (`src/games/*/board.tsx`) are always client components — they need `useState`/`useEffect`/canvas refs/pointer events.

## Backend structure

- **Three Next.js Route Handler groups, each doing a different job:**
  1. **Room/match actions** — `GET /api/rooms/[code]` (the initial-state fetch a client makes on mount) and `POST /api/rooms/[code]/action` (every room/match action: join, ready, select-game, in-game moves, rematch, leave, etc. — a discriminated union matching `RoomActionRequest`). Both load/save a room's state from/to Neon's `live_rooms` table and, for the POST route, publish the result to Ably afterward.
  2. **Identity/profile** — `GET /api/ably-token` (mints a short-lived, room-scoped Ably token from the caller's resolved identity), `PATCH /api/profile` (the only write path for display name/avatar color).
  3. **Discovery/maintenance** — `GET /api/public-rooms` (unauthenticated read of the public-rooms discovery index), `GET /api/cron/cleanup` (Vercel Cron, hourly — reclaims idle rooms from `live_rooms`).
- **All actual game logic lives in two places:**
  1. `src/lib/realtime/room-state.ts` — the pure, I/O-free room/match reducer: join/ready/select-game/set-visibility/set-modifiers/start/action/rematch/return-to-lobby/leave/disconnect. Directly unit-testable (`tests/unit/realtime-room-state.test.ts`, 16 tests) since it never touches storage, the network, or the clock (wall-clock time is passed in as an explicit `now` parameter).
  2. `src/games/<game>/engine.ts` — pure per-game rules: given a state and an action, returns a new state or a rejection reason. Called from `room-state.ts`'s `applyGameAction`, unchanged by any backend choice this app has made — **this layer has never depended on Supabase, PartyKit, or Ably.**

## Server/client boundary

- Enforced by the `server-only` package on every Neon-touching module (`src/lib/db/client.ts`, `src/lib/identity/get-current-actor.ts`, `src/lib/realtime/ably-server.ts`) — importing any of them into a `"use client"` file is a build-time error.
- There is no anon-vs-service-role split the way Supabase had — Neon has no RLS to scope a lesser-privileged client against, so `getDb()` always has full access, and every caller is individually responsible for its own authorization checks before calling it.
- Browser code never talks to Neon or Ably's REST API directly. It talks to: the Route Handlers above, and Ably's realtime service over a token-authenticated connection (the raw Ably API key never reaches the browser — see `SECURITY.md`).
- Ably's client SDK is loaded via a `<script>` tag from Ably's own CDN (`src/components/room/room-page-client.tsx`), not an npm import — a deliberate workaround for a real Next.js/webpack incompatibility with Ably's bundled output, documented in `DECISIONS.md` D-018.

## Request lifecycle (example: submitting a game action)

1. Client calls `submitAction(actionType, payload)` (`src/lib/realtime/use-realtime-room.ts`), which sends `POST /api/rooms/[code]/action` with `{ type: "action", actionType, payload, sequence }` (`sequence` is the last value the client saw — an optimistic-concurrency guard).
2. The route handler resolves the caller's identity via `getCurrentActor()`, loads the room's current `StoredRoomState` from Neon's `live_rooms` table, checks a per-profile rate limit (30 actions / 10s, plus a Tile-Rush-specific 8/1s limit on `clear-tile`) via `checkRateLimit()`, then calls `applyGameAction(state, profileId, actionType, payload, sequence, now)` in `room-state.ts`.
3. `applyGameAction` confirms the caller is a match participant (checked against the match's `participants` snapshot, not the live roster — see "Dangerous-to-modify areas" in `CLAUDE.md`), compares the claimed `sequence` against the stored one, applies any per-game special-casing (word validation for Word Clash, turn-timer expiry checks, the seat-1-only goal-reporting rule for Orb Hockey), then calls `engine.applyAction(state, action, callerId)`.
4. If the engine rejects, the route returns `{ error, message }` with a 400 status — no state change, no Ably publish.
5. If accepted, the route saves the new state back to Neon, publishes it to the room's Ably channel (`{ type: "state", ... }`, event name `"state"`), and returns that same payload directly in the HTTP response. Every *other* connected client receives it via their own Ably subscription; the caller already has it from its own response — no round-trip through Ably needed for its own action, a real simplification over the old WebSocket-based design's first-message-wins correlation hack.
6. If the engine's `checkOutcome` reports the match is over, the route calls `finalizeMatch()` (`src/lib/realtime/finalize-match.ts`): writes `matches`/`match_players` (using the match's `participants` snapshot, not the live roster, so a player who left mid-match still gets a result), updates each player's `profiles.totalWins`/`gamesPlayed`, upserts `leaderboard_entries`, then best-effort (try/catch, never blocks) updates `recent_players` and runs achievement checks (`src/lib/realtime/achievements.ts`).

## Data flow: authentication and authorization

- `src/middleware.ts` runs Clerk's own middleware (session detection/refresh for real accounts) and ensures a `guest_id` cookie exists (`src/lib/identity/guest-cookie.ts`) for no-signup guest play — both run on every request.
- `src/lib/identity/get-current-actor.ts` is the single place that resolves "who is making this request" into a `profiles.id`: Clerk session first if present, else the guest cookie, provisioning a `profiles` row on first sight either way, and claiming an unclaimed guest profile onto a new Clerk sign-up rather than starting a fresh one (preserves stats across the guest→account upgrade).
- **Ably connection auth is a separate concern from "who is this request."** `GET /api/ably-token` resolves identity via `getCurrentActor()` (same as any other route — no special-casing needed, since this all runs in the same Next.js runtime) and mints a short-lived Ably token scoped to exactly one room's channel, with the caller's profileId set as the Ably `clientId`. This is what lets a client tell its own `"broadcast"` publishes apart from everyone else's without the server needing to track connections at all.
- Authorization is entirely application code, in two places: `src/lib/realtime/room-state.ts` (host-only checks for start/select-game/set-visibility/set-modifiers, participant-only checks for match actions, the seat-1-only Orb Hockey goal rule) for anything routed through the action route, and `src/app/api/profile/route.ts` (`PATCH` only ever touches the caller's own `profiles` row) for the one other Neon write path. There is no RLS equivalent under Neon — every check that used to be a Postgres policy is now an explicit `if` in one of these two places.

## Real-time communication / multiplayer architecture

One Ably channel per room (`room:<code>`), carrying two event types:

1. **`"state"`** — the full room+match+game-state snapshot, published by the server (via `src/lib/realtime/ably-server.ts`'s REST client) after every accepted action. Not a diff — simplest correct option at this app's state sizes. Every client also fetches this same shape once on mount via `GET /api/rooms/[code]`, since Ably (unlike a Durable Object's `onConnect`) has no "send me the current state on subscribe" primitive — see `DECISIONS.md` D-018.
2. **`"broadcast"`** — a generic, unvalidated, never-persisted passthrough (`{ channel: string; payload: unknown }`), published **directly client-to-client** over Ably (no server involvement at all, not even a route handler) and filtered client-side to exclude the sender's own connection. This is what Orb Hockey (`"paddle"`, `"puck-sync"`, `"serve"`) and Quick Draw (`"stroke"`, `"clear"`) use for their high-frequency, cosmetic-if-dropped sync.

The same discrete-vs-continuous distinction that split across two Supabase mechanisms, and later across a Durable Object's `broadcast()` relay, still holds conceptually — the ephemeral path is now genuinely peer-to-peer through Ably's relay rather than bounced through this app's own server code either way.

## Determinism / seeded RNG

Unchanged by any backend choice this app has made. Every game engine that needs randomness derives it from `games/core/rng.ts`'s seeded PRNG, keyed off a `seed` generated once per match (`randomSeed()`, called from `room-state.ts`'s `startMatch`) and stored on `StoredMatch.seed` (and, once the match finishes, on the Neon `matches.seed` column). Bot "thinking" is the one deliberate exception, using plain `Math.random()`.

## Background/scheduled jobs

- **`GET /api/cron/cleanup`**, scheduled hourly via `vercel.json`'s cron entry, reclaims rooms in `live_rooms` idle past a 4-hour threshold (matching the same number a Cloudflare Durable Object's `onAlarm` used to enforce, before this rework — Ably has no per-room timer primitive to replace it with, so this reverted to a real scheduled sweep, the same shape the original pre-migration design used).
- No other scheduled jobs exist. No queue/worker system exists.

## Caching

- No explicit caching layer. `/leaderboard` is marked `export const dynamic = "force-dynamic"` (needed once its Supabase-era `cookies()` call, which forced dynamic rendering for free, was gone — see `DECISIONS.md` D-016) — always a fresh Neon read, never statically cached. `/profile` gets the same behavior for free from Clerk's `auth()` reading request headers.
- Client-side "caching" is Zustand `persist` to localStorage for settings (audio, accessibility, theme pack, seen tutorials) — a preferences cache, not a data cache.

## State management

- **Server state (source of truth):** `live_rooms` in Neon, for anything room/match-related, mirrored into every connected client's React state by `use-realtime-room.ts`'s combination of an initial fetch and an ongoing Ably subscription. **Durable, cross-match state** (profile stats, match history, achievements, the leaderboard) also lives in Neon and is read via Drizzle in Server Components.
- **Client-only state:** Zustand with `persist` middleware for anything that should survive a refresh (audio settings, accessibility settings, theme pack, guest nickname/avatar, seen-tutorials flags).
- **Ephemeral UI state:** plain React `useState`/`useReducer` inside components.

## Error handling and logging

- **The Route Handlers:** JSON body `{ error: string, message?: string }` with an appropriate HTTP status, logged server-side via `src/lib/log.ts`'s `logError()` — a single, isomorphic (Next.js server / browser) structured-logging choke point.
- **Game engines:** a discriminated union (`{ ok: true, nextState }` / `{ ok: false, reason, message }`), not throwing.
- **Client-facing errors:** surfaced via `sonner` toasts.
- **App-level error boundaries:** `src/app/error.tsx` (uses `logError`), `src/app/global-error.tsx` (deliberately dependency-free, kept on a bare `console.error`).
- **Logging:** no external APM/monitoring service is connected yet (no Sentry, no Datadog) — `logError()`'s output is still just structured `console.error` JSON, visible in Vercel's function logs. This remaining gap is flagged in `SECURITY.md`.

## Analytics / payments / email

- **Analytics:** none.
- **Payments:** none — no monetization.
- **Email:** none. Clerk's own sign-up/sign-in flows handle whatever verification email they need internally; this app never sends its own.

## Deployment architecture

A single Vercel deployment for the Next.js app — no separate Worker, no second deploy step. **Never actually deployed** — see `DEPLOYMENT.md`.

## Scaling considerations

- `src/lib/multiplayer/rate-limit.ts`'s in-memory limiter is reused inside the action route, scoped per room+profile — but on Vercel's serverless model, "in-memory" only persists for the lifetime of a single warm function instance, which is far less reliable than the per-Durable-Object scoping this same limiter had before this rework. Acceptable at current scale (a casual friends-game app), but a real, honestly-documented regression — see `SECURITY.md`.
- Ably's own infrastructure handles fan-out scaling for the pub/sub layer — not something this app's own code needs to reason about, unlike the in-memory rate limiter above.

## Security boundaries

Full detail in `SECURITY.md`. Short version: a scoped Ably token is the boundary for who can subscribe/publish to a given room's channel at all; application checks inside `room-state.ts` are the boundary for what an action is actually allowed to do. There is no separate "admin" role or panel anywhere in this app.

## Major architectural risks

1. **Never tested against a real deployment** — no Neon `DATABASE_URL`, Clerk keys, or Ably API key exist yet. Everything above is inferred from static reading plus `typecheck`/`lint`/`test`/`build` passing, not observed live behavior.
2. **The generic `GameEngine<TState, TAction>` dispatch points** (`games/core/engines.ts`, `game-shell/game-surface.tsx`, `game-shell/solo-game-shell.tsx`) rely on `any`-typed maps — unaffected by, and unrelated to, any backend choice, but still a real risk: a mismatched engine/state pairing would only surface at runtime.
3. **No structured error logging/monitoring** — a production incident would be hard to diagnose without adding one.
4. **The in-memory rate limiter's reliability regressed** by moving from a per-Durable-Object scope to a per-serverless-function-instance one — see "Scaling considerations" above.
5. **Presence/disconnect detection is now a best-effort client-side heuristic** (`navigator.sendBeacon` on `pagehide`), not a guaranteed server-side signal the way a Durable Object's `onClose` was — see `DECISIONS.md` D-018.
