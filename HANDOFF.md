# HANDOFF.md

Start here. This is the shortest path to understanding this project and picking up work correctly.

## What is this project?

**Pocket Party** — a browser-based, no-download multiplayer mini-game platform. Create a room, share a 6-character code, play one of twenty-two original mini-games with 2-4 people. Every game also supports solo play against a bot. Built on Next.js 15, backed by **Clerk (accounts) + Neon/Drizzle (database) + Ably (realtime)**. See `CLAUDE.md` "Project identity" for the full description.

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

**Both migrations are finished, real credentials exist, and all 22 games (including the 5 newest: Reversi, Dots and Boxes, Yahtzee, Mancala, Trivia Blitz) are deployed live, along with a from-scratch ambient-music rewrite.** What's left is a **real browser click-through** (`TESTING.md`'s manual smoke-test checklist) and **`npm run test:e2e`**, both now actually runnable for the first time.

## ⚠️ Resume here

1. Check `git status` and `PROJECT_STATE.md`'s "Blockers" first — credentials existing doesn't mean they still work; re-verify before assuming.
2. `.env.local` already has `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `ABLY_API_KEY` populated. Run `npm run dev` and pick up from `TESTING.md`'s smoke-test checklist, or run `npm run test:e2e`.
3. The app is **deployed and live** at https://pocket-party-eta.vercel.app (Vercel project `pocket-party`, under `garywangsmes-8349s-projects`), serving all 22 games — Neon, Clerk, and Ably env vars are all set in Vercel's own environment variables (Production/Preview/Development), not just locally. A git repo (with commits) and a GitHub remote (`origin` → `github.com/Gariyuuu/pocket-party.git`) now exist too, but aren't yet connected to the Vercel project. See `TASKS.md`'s "High priority" for what's still open (browser verification, `test:e2e`, linking the existing GitHub repo to Vercel for auto-deploy).
4. If none of that applies (credentials are gone/rotated), the highest-value fallback work is `TASKS.md`'s "Medium priority" items (reconsidering the rate limiter's storage now that it's per-serverless-instance, rate-limiting `GET /api/ably-token`, wiring `logError()` to a real APM).

## What the previous agents were doing

Before the backend migration started: shipped an app icon, a `/patch-notes` page, and a "theme wheel" on top of an already-complete 10-game multiplayer platform with accounts/progression, all on Supabase — unaffected by either migration, since none of the 10 games' engine/board logic needs to change. A documentation audit and an account-switch checkpoint followed, then the user redirected the backend. Phase 1 (Neon schema), Phase 2 (Clerk + guest-cookie identity), Phase 3 (the PartyKit `Main` durable object replacing the old Supabase-backed room/match runtime) plus both of its Follow-ups (broadcast sync, public-rooms directory), Phase 4 (`/profile`/`/leaderboard` onto Neon reads), and Phase 5 (removing every remaining Supabase file/dependency/doc reference) were all done — that was T-003. Afterward, the user pushed back on the Cloudflare cost, and T-004 replaced PartyKit/Durable Objects with Ably: a new `live_rooms` Neon table (Ably has no storage of its own), a stateless `POST /api/rooms/[code]/action` route replacing the WebSocket message switch, `GET /api/rooms/[code]` as the initial-state fetch a Durable Object's `onConnect` used to provide, `GET /api/ably-token` replacing the old HMAC room-token scheme, and a CDN-`<script>`-tag workaround for a real Next.js/webpack parse failure in Ably's bundled npm output.

## What works now

`npm run typecheck`, `npm run lint`, `npm run test` (320 tests), and `rm -rf .next && npm run build` (14 routes) all pass cleanly. **All 22 games' full online flow** (create room → join → ready up → play → finalize to Neon → rematch/return-to-lobby, including Orb Hockey's/Quick Draw's real-time Ably broadcast sync), `/lobby`'s public-rooms browser, and `/profile`/`/leaderboard` are built against the Clerk + Neon/Drizzle + Ably stack. **Zero Supabase or PartyKit/Cloudflare code, dependency, or documentation reference remains anywhere in the repository.** Beyond static checks: `npm run db:migrate`/`db:seed` have been run against a real Neon database, the dev server has been confirmed (via `curl`) to correctly do guest-identity provisioning, room join/leave, and Ably token minting against real infrastructure, and the 10 newest games (Sea Battle/Checkers/Chess/Darts/Cornhole/Reversi/Dots and Boxes/Yahtzee/Mancala/Trivia Blitz) were confirmed working in solo mode via real Playwright screenshots and interaction scripts — see `PROJECT_STATE.md` for the full account. See `FEATURES.md` for the fuller feature list.

## What's broken

- **Nothing known-broken in the code.** `db:seed` *was* broken (a `server-only` import made it unrunnable outside Next.js's bundler) — found and fixed this session, see `PROJECT_STATE.md`.
- **No real browser click-through or two-person live match has happened yet** — everything verified against live infrastructure so far was `curl`-level, not a human clicking through the UI, and not two independent Ably subscribers confirmed to see each other's state changes.
- **The Playwright e2e specs have never executed** — they parse/list correctly and the dev server can now boot against real credentials, but nobody has actually run `npm run test:e2e` yet.
- **Nothing broken about the deployment** — it's live and confirmed working via `curl` (see `PROJECT_STATE.md`). A git repo/GitHub remote now exist, but aren't connected to the Vercel project yet — every deploy so far is still a manual `vercel deploy --prod`.
- **If Ably's CDN is unreachable** (firewall, ad blocker, outage), room pages stay stuck on "connecting" past a 15-second wait rather than failing fast — a known UX gap (see `DEPLOYMENT.md`).

See `PROJECT_STATE.md`'s "Blockers" for the complete list.

## What to do next

**Real browser verification** — the app is live at https://pocket-party-eta.vercel.app. Work through `TESTING.md`'s manual smoke-test checklist there with two real browser contexts (or `npm run dev` locally, credentials already exist in `.env.local`), and run `npm run test:e2e`. Beyond that: link the existing GitHub repo (`Gariyuuu/pocket-party`) to the Vercel project via Git integration so future changes deploy on push instead of via manual `vercel deploy --prod`.

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

`.env.local` already has real `DATABASE_URL`/Clerk/Ably credentials as of this session — check it exists and is populated before assuming you need to ask the user for new ones. If it's missing or empty, that's a real regression from this session's state, not the default "nothing configured yet" starting point older versions of this doc described.

```bash
npm run dev   # should boot cleanly against .env.local with no "missing env var" error
```

## How to verify the app still works

The commands above confirm the code is internally consistent, not that it functions end-to-end. Once real Neon/Clerk/Ably credentials exist, `TESTING.md`'s smoke-test checklist becomes the real verification, and `npm run test:e2e` becomes runnable for the first time.

---

## Prompt for the next Claude Code account

Copy this verbatim as your starting instruction to a new session:

> Read `CLAUDE.md`, `PROJECT_STATE.md`, `TASKS.md`, and this `HANDOFF.md` in full before doing anything else.
>
> **Before trusting any git-state claim in any of these docs (commit count, hash, uncommitted-change count, "N uncommitted changes," branch state, whether a remote exists), run `git status`, `git diff --stat`, and `git log --oneline -10` yourself.** This is not a formality here: a 2026-08-07 documentation checkpoint pass found and fixed several docs (`PROJECT_STATE.md`, `CLAUDE.md`, `DEPLOYMENT.md`, `TASKS.md`, `ROADMAP.md`) that had been asserting "zero git commits / no git remote exist" as current fact for multiple sessions after that had actually stopped being true — nobody re-checked it, so the claim just kept getting copied forward. Separately, that same pass found 66 uncommitted changes sitting in the working tree despite `PROJECT_STATE.md` implying a clean/simple state — any specific number written in these docs (uncommitted-change counts, commit hashes, "N games," test counts) is a snapshot from whenever it was last written and can already be stale by the time you read it. Re-derive it yourself before acting on it.
>
> Next, inspect the actual current code of any file you're about to touch — the memory files describe a point-in-time state and may have drifted since. Verify the documented current state yourself (run `npm run typecheck && npm run lint && npm run test && npm run build`) rather than trusting any single source blindly.
>
> **Two migrations are complete: Supabase → Clerk + Neon/Drizzle (see `DECISIONS.md` D-010 through D-017), and PartyKit/Cloudflare Durable Objects → Ably (see `DECISIONS.md` D-018, a cost-driven change the user asked for directly)** — do not assume any remaining Supabase, PartyKit, or Cloudflare code/docs exist, and if you find any, treat it as a bug to fix, not evidence of an ongoing migration.
>
> Summarize your understanding of where the project stands and what you're about to do before editing anything. If you find contradictions between memory files, or between a memory file and the actual code (or the actual git state), flag them explicitly rather than silently picking one version — and correct the stale one once you've confirmed which is accurate.
>
> Continue whatever task is marked current in `TASKS.md` without redoing work that's already complete — check `SESSION_LOG.md`'s most recent entries first so you don't repeat work someone already did. Preserve the parts of the architecture that are explicitly stable (every game's pure `engine.ts`/`board.tsx` logic, the seeded-RNG determinism pattern, `room-state.ts`'s participant-snapshot fix, the Ably CDN-script-loading workaround) — and if you make a new architectural decision, record it in `DECISIONS.md` with real reasoning, not a fabricated one.
>
> If you find uncommitted work again: don't commit blindly. Read enough of the diffs to understand whether it's one coherent thing or several unrelated things, run the full verification suite against the working tree, and if it's genuinely finished and passing, commit it in logically-scoped commits (not one giant "misc" commit) — otherwise leave it uncommitted and write a precise account of exactly what's sitting there, the same way this pass did.
>
> After completing any meaningful work, update `PROJECT_STATE.md`, `TASKS.md`, and append (never overwrite) a new entry to `SESSION_LOG.md`, and update whichever other memory file is now stale as a result of what you changed.
