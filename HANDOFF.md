# HANDOFF.md

Start here. This is the shortest path to understanding this project and picking up work correctly.

## What is this project?

**Pocket Party** — a browser-based, no-download multiplayer mini-game platform. Create a room, share a 6-character code, play one of ten original mini-games with 2-4 people. Every game also supports solo play against a bot. Built on Next.js 15, backed by **Clerk (accounts) + Neon/Drizzle (database) + Ably (realtime)**. See `CLAUDE.md` "Project identity" for the full description.

## ⚠️ Two migrations are complete

1. The user said directly: **"use clerk and neon i cant use supabase."** This project moved from Supabase to Clerk + Neon/Drizzle + PartyKit/Cloudflare across 5 phases (`TASKS.md` T-003) — all done. Full reasoning: `DECISIONS.md` D-010 through D-017.
2. The user then questioned whether Cloudflare's paid Workers plan ($5/month, required for Durable Objects) was actually needed for a casual friends-game ("do i need cloud flare... why dont i just use like a party code so we dont need all this stuff"), and chose Ably instead ("ok then ya ably and free"). **This realtime rework (`TASKS.md` T-004) is also done** — there is no remaining PartyKit code, `party/` directory, `wrangler.jsonc`, or Cloudflare dependency anywhere in this repository. Full reasoning, including the exact quotes and a real Next.js/Ably bundler-incompatibility investigation: `DECISIONS.md` D-018.

If you find a stale Supabase *or* PartyKit/Cloudflare reference anywhere, treat it as a documentation bug to fix, not evidence either migration is still ongoing.

## What to read first

1. This file.
2. `CLAUDE.md` — the primary operating manual. Read it fully before touching code.
3. `PROJECT_STATE.md` — exact state as of the last session.
4. `TASKS.md` — the active queue.
5. Whichever of `ARCHITECTURE.md` / `DATABASE.md` / `API_REFERENCE.md` / `FEATURES.md` / `SECURITY.md` / `UI_SYSTEM.md` is relevant to what you're about to do.

## Current task

**None under either migration — both are finished.** The next real work is **live verification**: get real Neon/Clerk/Ably credentials and run through `TESTING.md`'s manual smoke-test checklist and `npm run test:e2e`.

## ⚠️ Resume here

There's no in-progress migration step to resume. If you're picking this project back up:
1. Check `git status` and `PROJECT_STATE.md`'s "Blockers" — if the user has since created a Neon project / Clerk application / Ably app, live verification can start.
2. Otherwise, the highest-value work is picking off `TASKS.md`'s "Medium priority" items (reconsidering the rate limiter's storage now that it's per-serverless-instance, rate-limiting `GET /api/ably-token`, wiring `logError()` to a real APM).

## What the previous agents were doing

Before the backend migration started: shipped an app icon, a `/patch-notes` page, and a "theme wheel" on top of an already-complete 10-game multiplayer platform with accounts/progression, all on Supabase — unaffected by either migration, since none of the 10 games' engine/board logic needs to change. A documentation audit and an account-switch checkpoint followed, then the user redirected the backend. Phase 1 (Neon schema), Phase 2 (Clerk + guest-cookie identity), Phase 3 (the PartyKit `Main` durable object replacing the old Supabase-backed room/match runtime) plus both of its Follow-ups (broadcast sync, public-rooms directory), Phase 4 (`/profile`/`/leaderboard` onto Neon reads), and Phase 5 (removing every remaining Supabase file/dependency/doc reference) were all done — that was T-003. Afterward, the user pushed back on the Cloudflare cost, and T-004 replaced PartyKit/Durable Objects with Ably: a new `live_rooms` Neon table (Ably has no storage of its own), a stateless `POST /api/rooms/[code]/action` route replacing the WebSocket message switch, `GET /api/rooms/[code]` as the initial-state fetch a Durable Object's `onConnect` used to provide, `GET /api/ably-token` replacing the old HMAC room-token scheme, and a CDN-`<script>`-tag workaround for a real Next.js/webpack parse failure in Ably's bundled npm output.

## What works now

`npm run typecheck`, `npm run lint`, `npm run test` (169 tests), and `rm -rf .next && npm run build` (14 routes) all pass cleanly. **All 10 games' full online flow** (create room → join → ready up → play → finalize to Neon → rematch/return-to-lobby, including Orb Hockey's/Quick Draw's real-time Ably broadcast sync), `/lobby`'s public-rooms browser, and `/profile`/`/leaderboard` are built against the Clerk + Neon/Drizzle + Ably stack. **Zero Supabase or PartyKit/Cloudflare code, dependency, or documentation reference remains anywhere in the repository.** See `FEATURES.md` for the fuller feature list.

## What's broken

- **No live backend of any kind has ever existed for this app** — schema/logic only ever typechecked and unit-tested, never run against real Neon/Clerk/Ably.
- **The Playwright e2e specs have never executed** — they parse/list correctly and drive the current room-creation/joining flow, but need real credentials behind a running dev server to actually run.
- **If Ably's CDN is unreachable** (firewall, ad blocker, outage), room pages stay stuck on "connecting" past a 15-second wait rather than failing fast — a known, undeployed UX gap (see `DEPLOYMENT.md`).

See `PROJECT_STATE.md`'s "Blockers" for the complete list.

## What to do next

**Live verification** — get real Neon/Clerk/Ably credentials, deploy the app (`DEPLOYMENT.md` — a single Vercel deploy now, no separate Worker), and work through `TESTING.md`'s manual smoke-test checklist and `npm run test:e2e`.

## Most important files

- `src/app/api/rooms/[code]/action/route.ts` — the server-authoritative heart of the stack; every room/match action goes through this one Route Handler.
- `src/lib/realtime/room-state.ts` — the pure, unit-tested (`tests/unit/realtime-room-state.test.ts`) room/match reducer the action route calls into. Read this before the route — it's where the actual game rules/permissions live.
- `src/lib/realtime/protocol.ts` — the request/event shapes both client and server import, including the generic `"broadcast"` event Orb Hockey/Quick Draw use.
- `src/lib/realtime/use-realtime-room.ts` — the one client hook every room/lobby/match component uses; waits for Ably's CDN-loaded `window.Ably` global, then connects; exposes `sendBroadcast`/`onBroadcast` for the two high-frequency games.
- `src/lib/realtime/ably-server.ts` — mints per-room Ably tokens and publishes state events; holds `ABLY_API_KEY`, the single most sensitive value in this stack.
- `src/lib/realtime/room-store.ts` — loads/saves room state to/from the `live_rooms` Neon table.
- `src/components/room/room-page-client.tsx` — renders the Ably CDN `<script>` tag; do not replace with a normal npm import (see `DECISIONS.md` D-018).
- `src/games/orb-hockey/board.tsx`, `src/games/quick-draw/board.tsx` — the reference implementations for how a game uses `broadcast.sendBroadcast`/`onBroadcast` for ephemeral, never-persisted sync.
- `src/lib/db/schema.ts` — 9 tables, including `live_rooms` (see `DECISIONS.md` D-012/D-015/D-018 for what got dropped/added and why).
- `src/games/core/game-engine.ts` + `registry.ts` — the contract every game follows. **Unaffected by either backend migration.**
- `src/middleware.ts` — Clerk's own middleware + the guest-cookie bootstrap. No third identity mechanism anymore.
- `src/lib/multiplayer/{room-code,rate-limit,extract-score,types}.ts` — the 4 surviving backend-agnostic utilities from the old `lib/multiplayer/` folder.
- `src/app/profile/page.tsx`, `src/components/profile/*`, `src/app/leaderboard/page.tsx`, `src/app/api/profile/route.ts` — the Neon/Drizzle-backed profile/leaderboard implementation.
- `src/lib/realtime/public-rooms.ts` — the Neon-backed public-rooms directory.

## Dangerous-to-modify areas

See `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW" section for the full list. Notable: the Ably CDN `<script>` tag in `room-page-client.tsx` (a required workaround for a real Next.js/webpack parse failure — do not "clean it up" into an npm import), `StoredMatch.participants` in `room-state.ts` (a snapshot that exists specifically to survive a player leaving mid-match — do not "simplify" it back to reading the live roster, that regresses a real bug caught and fixed during the original migration), and `ABLY_API_KEY` (server-only; anyone with it can mint a token claiming to be any profile in any room).

## First commands to run

```bash
npm install
npm run typecheck && npm run lint && npm run test && npm run build
```

All should pass with no changes needed (**Verified** as of 2026-08-06, post-Ably-rework). If any fail for you, something has changed since — investigate before assuming this document is still accurate, and update `PROJECT_STATE.md` with what you find.

## How to verify the app still works

The commands above confirm the code is internally consistent, not that it functions end-to-end. Once real Neon/Clerk/Ably credentials exist, `TESTING.md`'s smoke-test checklist becomes the real verification, and `npm run test:e2e` becomes runnable for the first time.

---

## Prompt for the next Claude Code account

Copy this verbatim as your starting instruction to a new session:

> Read `CLAUDE.md`, `PROJECT_STATE.md`, `TASKS.md`, and this `HANDOFF.md` in full before doing anything else. Then run `git status` and check for any recent commits to see whether the state described in `PROJECT_STATE.md` is still current — if it's stale, note the discrepancy rather than trusting the stale version.
>
> Next, inspect the actual current code of any file you're about to touch — the memory files describe a point-in-time state and may have drifted since. Verify the documented current state yourself (run `npm run typecheck && npm run lint && npm run test && npm run build`) rather than trusting any single source blindly.
>
> **Two migrations are complete: Supabase → Clerk + Neon/Drizzle (see `DECISIONS.md` D-010 through D-017), and PartyKit/Cloudflare Durable Objects → Ably (see `DECISIONS.md` D-018, a cost-driven change the user asked for directly)** — do not assume any remaining Supabase, PartyKit, or Cloudflare code/docs exist, and if you find any, treat it as a bug to fix, not evidence of an ongoing migration.
>
> Summarize your understanding of where the project stands and what you're about to do before editing anything. If you find contradictions between memory files, or between a memory file and the actual code, flag them explicitly rather than silently picking one version — and correct the stale one once you've confirmed which is accurate.
>
> Continue whatever task is marked current in `TASKS.md` without redoing work that's already complete — check `SESSION_LOG.md`'s most recent entries first so you don't repeat work someone already did. Preserve the parts of the architecture that are explicitly stable (every game's pure `engine.ts`/`board.tsx` logic, the seeded-RNG determinism pattern, `room-state.ts`'s participant-snapshot fix, the Ably CDN-script-loading workaround) — and if you make a new architectural decision, record it in `DECISIONS.md` with real reasoning, not a fabricated one.
>
> After completing any meaningful work, update `PROJECT_STATE.md`, `TASKS.md`, and append (never overwrite) a new entry to `SESSION_LOG.md`, and update whichever other memory file is now stale as a result of what you changed.
