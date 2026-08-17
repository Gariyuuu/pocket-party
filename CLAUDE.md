# CLAUDE.md — Pocket Party Operating Manual

**Read this file first, every session.** Then read `PROJECT_STATE.md` and `TASKS.md` before touching any code.

This file, and the rest of the memory system it points to (`PROJECT_STATE.md`, `ARCHITECTURE.md`, `FILE_MAP.md`, `FEATURES.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, `DATABASE.md`, `API_REFERENCE.md`, `UI_SYSTEM.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `CHANGELOG.md`, `SESSION_LOG.md`, `HANDOFF.md`), describe the repository as of a migration off Supabase onto **Clerk (accounts) + Neon/Drizzle (database) + Ably (realtime)**. The backend migration off Supabase completed across 5 phases (`DECISIONS.md` D-010 through D-016), and the realtime transport was later switched a second time, from PartyKit/Cloudflare Durable Objects to Ably, as a cost-driven simplification (`DECISIONS.md` D-018 — see `SESSION_LOG.md` for the full record of both). **Every file in this repository now describes that stack — there is no remaining Supabase or Cloudflare/PartyKit code, dependency, or documentation section.** Treat the repo and these files as the source of truth; chat history that produced this code is not preserved elsewhere.

---

## Project identity

- **Name:** Pocket Party
- **One-sentence description:** A browser-based, no-download, no-account-required multiplayer mini-game platform — create a room, share a 6-character code, play one of twenty-two original mini-games with 2-4 people.
- **Detailed summary:** Every visitor gets an identity immediately — a hand-rolled `guest_id` cookie for no-signup guest play, or a Clerk session for a real account — resolved to one `profiles` row either way (`get-current-actor.ts`). A host creates a room, picks one of twenty-two games, and everyone plays live over an Ably pub/sub channel (`room:<code>`), with a Next.js Route Handler (`POST /api/rooms/[code]/action`) as the single point where actions are validated and applied to a Neon-persisted room state (`live_rooms`). Twenty-two distinct game engines exist, spanning turn-based board games (including full Chess and Checkers implementations, plus Reversi/Mancala/Dots and Boxes/Yahtzee), physics-based arc-shot games (including Darts and Cornhole), two genuinely real-time games (Orb Hockey, Quick Draw — high-frequency ephemeral sync over a generic client-to-client Ably broadcast), a drawing/guessing game, a trivia game, and a puzzle-race game. Every game supports solo play against a bot. Optional real accounts (via Clerk) preserve the same guest profile's stats rather than starting fresh, unlocking persistent match history, achievements, and per-game leaderboards (all read from Neon via Drizzle).
- **Target audience:** Friends/small groups who want GamePigeon-style casual mini-games in a browser, no app install, no signup required to start playing.
- **Main user problem solved:** "I want to play a quick game with a friend right now, without either of us installing anything or making an account."
- **Current development stage:** **Feature-complete prototype / advanced MVP, now deployed.** All twenty-two games are implemented end-to-end (engine, UI, sync, bots), the full Supabase→Clerk/Neon backend migration (Phases 1-5) and the subsequent PartyKit→Ably realtime rework are both complete, everything passes automated checks, and the app is live at a real Vercel URL with real Neon/Clerk/Ably credentials behind it. **No human has clicked through it in a browser yet** — see "Production status" below for exactly what has and hasn't been verified.
- **Production status:** **Deployed and live at https://pocket-party-eta.vercel.app, serving all 22 games** (the 5 newest — Reversi, Dots and Boxes, Yahtzee, Mancala, Trivia Blitz — were redeployed successfully on the first attempt, no quota block, 2026-08-07). Real Neon database, Clerk application, and Ably app are all wired up and confirmed working via `curl`-level API tests (guest identity, room join/leave including selecting `mini-golf` specifically, Ably token minting all return correct results against the live deployment — see `PROJECT_STATE.md`). **Not yet verified:** a real browser click-through, two independent clients actually seeing each other's live Ably updates, and `npm run test:e2e`. The `vercel deploy --prod` that put this live was still a manual push from the local directory, not a git push — see "Repository type" below for the actual current git state, which changed (a real repo + commits + a GitHub remote now exist) after most of the above happened.
- **Repository type:** A single Next.js app (no separate Worker anymore — see `DECISIONS.md` D-018). Has its own git repository at `~/Projects/pocket-party` (own `.git/`, not a subdirectory of some outer `~/Projects` repo — `~/Projects` itself is just a plain folder of many unrelated sibling projects, several of which are their own separate git repos the same way). Remote `origin` is `https://github.com/Gariyuuu/pocket-party.git` (gh account `Gariyuuu`). **This is a change from earlier in this project's history** — for a long stretch there were genuinely zero commits, and older entries throughout these docs (and in `SESSION_LOG.md`) that say "no git commits/remote exist" were accurate *at the time they were written*, describing that earlier era; don't take them as still true. Always run `git status`/`git log --oneline -5` yourself rather than trust a specific commit count or hash written in prose anywhere in these docs — it will drift.

---

## Current status

- **Current stable state:** All twenty-two games' engines, boards, and tests pass. The app is deployed and responding `200` at https://pocket-party-eta.vercel.app (re-confirmed 2026-08-17), now serving all 22 games. **[Needs confirmation]** exact current unit-test count — `PROJECT_STATE.md`/`TASKS.md` last counted 320 as of 2026-08-07; no test file changes were visible in the 4 commits landed since, so 320 is still likely accurate, but re-run `npm run test` rather than trusting this number.
- **Latest completed milestone:** A connection-error state + retry button for the room-join flow (`09c0ede`/`a622ee2`, 2026-08-15/16) — `useRealtimeRoom` now surfaces an explicit `"error"` status instead of hanging on "connecting" forever when Ably's CDN is unreachable, with a `thinking-orbs`-based animation while connecting. Before that (2026-08-13): OpenGraph/Twitter Card metadata + `robots.ts`/`sitemap.ts` (`32c8613`), and an ARIA live-region/label accessibility pass across the game shell, lobby, and scoreboard (`6d5bdde`). Before that (2026-08-11): a `safeQuery` read-path DB-error fallback (`2bb3491`). **These four commits were undocumented until this 2026-08-17 pass** — see `PROJECT_STATE.md`'s "Documentation gap found" note. Before all of that: rewrote the ambient background music, fixed a real solo-mode-bot bug, and added Reversi/Dots and Boxes/Yahtzee/Mancala/Trivia Blitz (17→22 games) — see `SESSION_LOG.md` for the full account of that and everything earlier.
- **Current active task:** `TASKS.md` T-005 (real browser/e2e verification — not started). See `TASKS.md`'s "High priority" for the rest of what's next (Google/social OAuth dashboard setup, linking the GitHub repo to Vercel for auto-deploy).
- **Exact point where development stopped:** deployed and confirmed working (`curl`, `200`) for all 22 games, plus the accessibility/metadata/error-handling polish above; a human browser click-through and `npm run test:e2e` still have not happened.
- **Current blockers:** none account-level — Neon, Clerk, Ably, and a Vercel deployment all exist. What's left needs a human at a browser, not another account.
- **Highest-priority next task:** run `TESTING.md`'s manual smoke-test checklist with two real browser windows against the live URL, and run `npm run test:e2e` — see `PROJECT_STATE.md`'s "Next three recommended actions."
- **Features currently under construction:** none. No new product-facing games/pages are under construction.

---

## Technology stack

All versions below are copied directly from `package.json`. Ranges (`^`) mean "whatever satisfies semver on last install" — the exact installed version is whatever is in `package-lock.json`, not re-verified here.

| Category | Technology | Version (package.json) |
|---|---|---|
| Language | TypeScript | `^5` |
| Framework | Next.js (App Router) | `^15.5.22` |
| UI library | React | `19.2.8` (exact, not a range) |
| Package manager | npm | Lockfile is `package-lock.json`; no other lockfile present |
| Runtime | Node.js | Not pinned anywhere in the repo (no `.nvmrc`/`engines` field) — **Unknown** minimum version |
| Styling | Tailwind CSS | `^4` (CSS-first config, no `tailwind.config.js` — see `src/app/globals.css`) |
| Component library | shadcn/ui, generated in `base-nova` (Base UI) style — **not Radix** | via `shadcn` CLI `^4.16.1` (dev-time tool) |
| Primitive component runtime | `@base-ui/react` | `^1.7.0` |
| Animation | Framer Motion | `^12.43.0` |
| State management (client) | Zustand | `^5.0.14` (with `persist`, localStorage-backed) |
| Database | Neon (serverless Postgres) via `@neondatabase/serverless` + Drizzle ORM (`drizzle-orm` `^0.45.2`, `drizzle-kit` `^0.31.10`) | Schema in `src/lib/db/schema.ts` — 9 tables (incl. `live_rooms`). Migrations applied to a real Neon database (provisioned via Vercel's Marketplace integration) as of this session. |
| Accounts | Clerk (`@clerk/nextjs` `^7.6.5`) | Real accounts only; guests use a hand-rolled `guest_id` cookie, not Clerk. Verified against a real Clerk application — guest identity provisioning confirmed working via `curl` against the live deployment. |
| Realtime | Ably (`ably` `^2.26.0`) | Client SDK loaded from Ably's CDN via a `<script>` tag (npm import is broken by a Next.js/webpack RSC parsing incompatibility, see `DECISIONS.md` D-018), server-side REST client from the npm package. `src/lib/realtime/` owns room/match orchestration for all 22 games' online play; the room's Neon-persisted state (`live_rooms`) plus `POST /api/rooms/[code]/action` replace what a Durable Object used to own. Verified against a real Ably app — a real `TokenRequest` with correct per-room capability scoping was minted and returned. **Not yet verified:** two independent clients actually exchanging live events over Ably. |
| Validation | Zod | `^4.4.3` |
| Audio | Howler.js | `^2.2.4` — all sounds are procedurally synthesized at runtime, no audio files ship (`src/lib/audio/tone.ts`) |
| Icons | lucide-react | `^1.28.0` |
| Theming (light/dark) | next-themes | `^0.4.6` |
| Toasts | sonner | `^2.0.7` |
| Testing (unit) | Vitest | `^4.1.10`, environment `jsdom` |
| Testing (e2e) | Playwright | `^@playwright/test ^1.62.1` — written but never run; a real dev server can now boot against live credentials, so this is unblocked, just not yet done |
| Linting | ESLint | `^9`, config `eslint-config-next ^15.5.22` via `FlatCompat` (`eslint.config.mjs`) |
| Hosting | Vercel (the whole app — a single deploy, no separate Worker anymore) | **Deployed** — live at https://pocket-party-eta.vercel.app (project `pocket-party`, pushed via `vercel deploy --prod`, no Git integration yet) — see `DEPLOYMENT.md` |

---

## Essential commands

All commands run from the repository root (`~/Projects/pocket-party`) — **Verified** by running them.

```bash
# Install
npm install

# Development server (fails fast with a clear error if .env.local is missing DATABASE_URL/Clerk keys/ABLY_API_KEY — intentional, see Environment setup)
npm run dev

# Production build
npm run build

# Start the production build (after `npm run build`)
npm run start

# Type-check only (no emit)
npm run typecheck

# Lint (ESLint flat config)
npm run lint

# Unit tests (Vitest, jsdom environment, tests/unit/**/*.test.ts)
npm run test
npm run test:watch     # watch mode

# End-to-end tests (Playwright) — REQUIRES a running dev server backed by real
# Neon/Clerk/Ably credentials. Has never been run successfully.
npm run test:e2e

# Regenerate the 6 theme-wheel background PNGs (only needed if a theme palette changes)
npm run generate:themes

# --- Neon + Drizzle ---
npm run db:generate     # generate a SQL migration from src/lib/db/schema.ts into drizzle/
npm run db:migrate      # apply pending drizzle/ migrations to DATABASE_URL
npm run db:studio       # open Drizzle Studio against DATABASE_URL
npm run db:seed         # seed the achievement catalog
```

---

## Repository structure

```text
pocket-party/
├── src/
│   ├── app/            # Next.js App Router: pages, API routes, layout, generated icons
│   ├── components/     # Shared React components (not game-specific)
│   ├── games/          # One folder per game + games/core/ shared engine contract
│   └── lib/            # db/ (Neon+Drizzle), realtime/ (Ably server/client glue, protocol, room-state reducer, finalize-match, achievements, public-rooms), identity/ (Clerk + guest-cookie resolution), multiplayer/ (4 surviving pure utilities — see below), audio, design tokens, validation
├── drizzle/            # Generated SQL migrations for src/lib/db/schema.ts — not yet applied anywhere
├── tests/
│   ├── unit/           # Vitest — pure logic tests on engines/physics/validation/realtime-room-state
│   └── e2e/            # Playwright — several specs, never executed against a live backend
├── scripts/
│   └── generate-theme-backgrounds.js   # Hand-rolled PNG encoder for theme backgrounds (Node CJS, excluded from ESLint)
├── public/
│   └── themes/         # 6 generated theme background PNGs (committed as binary assets)
├── vercel.json         # Vercel Cron config — daily idle-room cleanup
└── (this file, PROJECT_STATE.md, etc. — the memory system)
```

### `src/app/` — routes and generated assets

- **Purpose:** every URL the app serves, plus Next.js's special generated-asset conventions (`icon.tsx`, `apple-icon.tsx`, `not-found.tsx`, `error.tsx`, `global-error.tsx`).
- **What belongs here:** page components (`page.tsx`), API route handlers (`api/*/route.ts` — `rooms/[code]`, `rooms/[code]/action`, `ably-token`, `profile`, `public-rooms`, `cron/cleanup`), the root `layout.tsx`, global CSS (`globals.css`).
- **What should NOT be placed here:** game logic, reusable UI components, business logic. Pages should be thin.
- **Key entry points:** `layout.tsx` (wraps every app-wide provider — Clerk, theme, motion config, tooltips, toaster, audio, theme-pack), `page.tsx` (landing page), `middleware.ts` (lives in `src/`, not `src/app/`), `room/[code]/page.tsx` (the whole multiplayer game experience lives behind this one dynamic route, now a thin client shell around `useRealtimeRoom`).

### `src/components/`

- **Purpose:** shared, reusable React components not tied to one specific game.
- Subfolders: `ui/` (shadcn-generated primitives + hand-written ones like `player-badge.tsx`, `game-card.tsx`, `state-panel.tsx`), `landing/`, `room/`, `lobby/`, `profile/`, `game-shell/` (the two "shells" every game's board renders inside), `scoreboard/`.
- **Key entry points:** `game-shell/game-surface.tsx` is the single dispatch point that maps a `gameId` to the right board component — **this is the file to edit when adding a 13th game.**
- **Note:** `room/room-page-client.tsx` renders a `next/script` tag loading Ably's client SDK from its CDN — this is a required, deliberate part of the realtime rework, not leftover debug code (see `DECISIONS.md` D-018).

### `src/games/`

- **Purpose:** one folder per game (`grid-three/`, `fourfall/`, `word-clash/`, `bounce-cup/`, `mini-hoops/`, `tank-tactics/`, `orb-hockey/`, `pocket-shots/`, `quick-draw/`, `tile-rush/`, `mini-golf/`, `word-bites/`, `sea-battle/`, `checkers/`, `chess/`, `darts/`, `cornhole/`, `reversi/`, `dots-and-boxes/`, `yahtzee/`, `mancala/`, `trivia-blitz/`), plus `core/` for the shared contract every game implements. **Entirely unaffected by either backend migration** — every engine/board/bot is pure and framework-agnostic.
- **Pattern inside each game folder:** `types.ts`, `engine.ts` (implements `GameEngine<State, Action>`), `bot.ts` (20 of 22 games), `board.tsx`, supporting pure-logic files (`physics.ts`, `lines.ts`, `scoring.ts`, etc.).
- **`games/core/`:** `game-engine.ts` (the interface), `registry.ts` (game metadata), `engines.ts` (`GameId → engine instance` map), `action.ts` (the action envelope schema), `rng.ts` (seeded PRNG), `physics.ts` (shared projectile simulator), `game-content.ts` (rules/tutorial text).
- **Risk:** the `GameEngine` interface is generic, so `games/core/engines.ts` and `game-shell/game-surface.tsx` both use `any` internally (with `eslint-disable` comments) — intentional, not sloppy, but TypeScript will **not** catch a mismatched state/action type at the dispatch boundary.

### `src/lib/`

- `db/` — `client.ts` (`getDb()`, `server-only`), `schema.ts` (9 tables, incl. `live_rooms`), `env.ts`, `seed.ts`.
- `identity/` — `guest-cookie.ts` (the no-signup identity), `get-current-actor.ts` (resolves Clerk session or guest cookie → a `profiles.id`, provisioning/claiming as needed).
- `realtime/` — `room-state.ts` (the pure room/match reducer, unit-tested), `protocol.ts` (action/event message shapes), `room-store.ts` (loads/saves `StoredRoomState` to/from the `live_rooms` table), `ably-server.ts` (mints per-room Ably `TokenRequest`s, publishes `"state"` events), `use-realtime-room.ts` (the one client hook every room/lobby/match component uses — waits for the CDN-loaded `window.Ably` global, then connects), `finalize-match.ts`, `achievements.ts`, `public-rooms.ts`, `env.ts`.
- `multiplayer/` — **4 surviving files, kept because they're still real, still-used utilities with no backend dependency of their own**: `room-code.ts` (client-side code generation), `rate-limit.ts` (the in-memory limiter, reused inside `POST /api/rooms/[code]/action`), `extract-score.ts` (per-game score extraction, used by `finalize-match.ts`), `types.ts` (just the `RoomPlayer` interface every game board imports).
- `audio/` — `tone.ts` (hand-rolled WAV encoder), `sfx.ts`, `music.ts`, `use-audio-settings.ts` (Zustand, persisted).
- `design/` — `tokens.ts` (player color/shape pairing for colorblind-safety), `theme-packs.ts`, `use-theme-pack.ts`, `use-accessibility-settings.ts`, `use-fullscreen.ts`.
- `validation/nickname.ts` — Zod schema + sanitizer.
- `content/patch-notes.ts` — manually curated changelog data shown at `/patch-notes`.
- `log.ts` — `logError(context, error, meta?)`, the single structured-logging choke point (isomorphic, Web-standard-only).

### `tests/`

- `unit/` — 41 files, 320 tests, all passing. Pure logic only: every game engine's win/draw/scoring logic, the shared physics simulator, RNG determinism, nickname validation, the music synth's generated-audio checks, and `realtime-room-state.test.ts` (16 tests covering the room/match reducer).
- `e2e/` — several Playwright specs (`room-join.spec.ts`, `grid-three.spec.ts`, `fourfall.spec.ts`, `bounce-cup.spec.ts`, `word-clash.spec.ts`, `tank-tactics.spec.ts`, `orb-hockey.spec.ts`, etc.). **Never executed successfully** — all need real Neon/Clerk/Ably credentials behind a running dev server first.

---

## Architecture summary

See `ARCHITECTURE.md` for the full write-up with a Mermaid diagram. Short version:

- **Rendering strategy:** Next.js App Router, mixed static/dynamic. `/profile` and `/leaderboard` are Server Components doing an initial Neon/Drizzle read; `room/[code]` is a thin client shell around an Ably channel subscription.
- **Server/client boundary:** enforced by the `server-only` package (`src/lib/db/client.ts`, `src/lib/identity/get-current-actor.ts`, `src/lib/realtime/ably-server.ts`).
- **Auth:** two identity mechanisms side by side — a real Clerk session, or a hand-rolled `guest_id` cookie for no-signup guest play — unified into one `profiles.id` by `get-current-actor.ts`.
- **Multiplayer sync:** one Ably channel per room (`room:<code>`), carrying both durable state (`"state"` events, published server-side after every accepted action) and ephemeral high-frequency sync (`"broadcast"` events, published directly client-to-client, unvalidated passthrough — used by Orb Hockey/Quick Draw). Room state itself lives in Neon (`live_rooms`), since Ably has no compute/storage of its own — see `DECISIONS.md` D-018.
- **Determinism:** every game with any randomness (bot moves excepted) derives it from a seeded PRNG (`games/core/rng.ts`) keyed off the match's stored `seed` — unchanged by either migration.
- **Deployment architecture:** a single Vercel deploy for the whole app, plus Ably and Neon as hosted external services — no separate Worker to deploy anymore. **Nothing has ever actually been deployed** — see `DEPLOYMENT.md`.

---

## Coding conventions

- **File naming:** kebab-case for all files. One default export per component file matching the filename in PascalCase.
- **Imports:** absolute imports via the `@/*` path alias (maps to `src/*`). Relative imports (`./`) only within the same feature folder.
- **Components:** function components only, no classes. `"use client"` at the very top of any file using hooks/state/browser APIs; omit for Server Components.
- **Hooks:** custom hooks prefixed `use-` as filename, `useXyz` as export name, colocated near what they wrap.
- **API routes:** thin — parse/validate with Zod, delegate to a lib function, return `NextResponse.json`. Everything room/match-related funnels through `POST /api/rooms/[code]/action`, which delegates to `src/lib/realtime/room-state.ts`'s pure reducer rather than containing game logic itself.
- **Game engines:** pure functions only inside `applyAction`/`checkOutcome`/`createInitialState`. No `Date.now()`, no network calls, no non-seeded randomness — wall-clock checks happen in `room-state.ts` *before* calling into the engine (the `now` parameter pattern).
- **Validation:** Zod schemas for all external input. Server-side validation is authoritative; client-side validation exists only for instant UX feedback.
- **Types:** strict TypeScript (`strict: true`). `any` is used only at the few explicitly-documented generic-dispatch boundaries, always with an `eslint-disable-next-line` comment.
- **Styling:** Tailwind utility classes directly in JSX. Shared design tokens in `src/app/globals.css` as CSS custom properties, referenced via `var(--color-party-violet)`, never a hardcoded hex.
- **Error handling:** `POST /api/rooms/[code]/action` returns `{ error, message }` JSON with an appropriate HTTP status; client code shows this via `sonner` toasts. Game engines return a discriminated-union `ActionValidationResult` rather than throwing.
- **Comments:** sparse, only to explain *why* — never to restate *what* the code does.
- **Tests:** one `describe` block per function/behavior, `it` blocks read as plain-English assertions.

---

## UI and design system

Full detail in `UI_SYSTEM.md`. Key facts:

- **Design tokens:** `src/app/globals.css`, CSS custom properties under `:root` (light) and `.dark`. Brand accent tokens: `--party-violet`, `--party-pink`, `--party-cyan`, `--party-amber`, `--party-lime`. Player-identity tokens: `--player-1` through `--player-4`, each paired with a **shape** (circle/triangle/square/diamond) in `src/lib/design/tokens.ts`.
- **Theme wheel:** `src/lib/design/theme-packs.ts` defines 3 packs (Classic Party, Arcade Neon, Sunset Warmth). Applies to: landing hero, `/lobby`, and the pre-game room lobby view. **Does not apply inside any game board.**
- **Dark/light mode:** `next-themes`, `attribute="class"`, `defaultTheme="system"`. Toggle: `src/components/theme-toggle.tsx`.
- **Reduced motion:** a CSS `prefers-reduced-motion` media query in `globals.css` plus `<MotionConfig reducedMotion="user">` at the root layout.
- **High contrast:** a manually toggleable `.high-contrast` class (Settings menu).
- **Component library:** shadcn/ui in the `base-nova` (Base UI) style — **not Radix**. Base UI components use a `render` prop for polymorphism, not `asChild`.
- **Icons:** lucide-react throughout.
- **App icon:** generated at build time by `src/app/icon.tsx`/`apple-icon.tsx` via `next/og`'s `ImageResponse`.

---

## Environment setup

**Verified** against `src/lib/db/env.ts`, `src/lib/realtime/env.ts`, and `.env.example`.

| Variable | Required? | Used in | Client or server | Sensitive? |
|---|---|---|---|---|
| `DATABASE_URL` | **Required** | `src/lib/db/client.ts` | Server only | **Yes** |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Required** | Clerk's client SDK | Both (public by design) | No |
| `CLERK_SECRET_KEY` | **Required** | `src/middleware.ts`, `get-current-actor.ts` | Server only | **Yes** |
| `ABLY_API_KEY` | **Required** | `src/lib/realtime/ably-server.ts` (mints tokens, publishes state) | Server only — never reaches the browser, which only ever sees short-lived minted tokens | **Yes — the single most sensitive value in this stack** |
| `CRON_SECRET` | Optional | `src/app/api/cron/cleanup/route.ts` | Server only | Yes, in the sense that omitting it leaves the cleanup route publicly callable (low severity) |

`.env.local` now exists locally with real values for all four (created this session; correctly gitignored, confirmed via `git check-ignore`, never appears in any doc or commit). `.env.example` still exists with empty placeholder values for anyone setting up a fresh clone. The same four vars (plus Neon's auto-provisioned extras) are also set in the Vercel project's own environment variables, across Production/Preview/Development — see `DEPLOYMENT.md`.

---

## Database summary

Full detail, including an ER diagram, in `DATABASE.md`. 9 tables, no RLS (Neon has no `auth.uid()`/JWT wiring to drive one — every authorization check that used to be a Postgres policy is now explicit application code, split between `src/lib/realtime/room-state.ts` for anything routed through `POST /api/rooms/[code]/action` and `src/app/api/profile/route.ts` for the one other Neon write path). One table, `live_rooms`, holds ephemeral live room/match state (replacing what a Durable Object's in-memory storage used to hold) rather than durable history. No migration has ever been applied to a live database.

---

## Authentication and authorization

Full detail in `SECURITY.md`. Short version:

- **Signup/login:** no traditional signup form. Every visitor gets an identity immediately — `middleware.ts` ensures a `guest_id` cookie exists; `get-current-actor.ts` resolves it (or a Clerk session) into a `profiles.id`, provisioning a fresh row on first sight. Optional upgrade: `/profile` → "Create an account" opens Clerk's own sign-up modal; the next request after sign-up, `get-current-actor.ts` claims the still-unclaimed guest profile onto the new Clerk user, preserving stats.
- **Logout:** Clerk's own `UserButton`/sign-out flow.
- **Middleware:** `src/middleware.ts` — Clerk's own middleware plus the guest-cookie bootstrap. No third identity mechanism exists.
- **Protected routes:** none in the traditional sense — guests can do everything. Server-side authorization instead happens per-action: host checks and match-participant checks inside `room-state.ts`, plus one game-specific check (only the fixed seat-1 player in Orb Hockey may report a goal).
- **Ably connection auth:** `GET /api/ably-token` resolves the caller's identity server-side, then mints a short-lived Ably `TokenRequest` (`src/lib/realtime/ably-server.ts`) scoped to exactly one room's channel, with the caller's `profileId` as the Ably `clientId`. Ably itself signs and verifies this — no hand-rolled crypto involved, unlike the previous HMAC room-token scheme this replaced (see `DECISIONS.md` D-018).
- **Roles/permissions:** no admin role exists anywhere in the codebase.
- **Security-sensitive files:** `src/lib/realtime/ably-server.ts`, `src/middleware.ts`, `src/lib/identity/get-current-actor.ts`, `src/lib/realtime/room-state.ts`.

---

## API and integrations

Full detail, including request/response shapes and the Ably channel event types, in `API_REFERENCE.md`. Route Handlers: `GET /api/rooms/[code]`, `POST /api/rooms/[code]/action`, `GET /api/ably-token`, `PATCH /api/profile`, `GET /api/public-rooms`, `GET /api/cron/cleanup`. Everything room/match-related goes through the single action route rather than a dedicated route per operation. No external third-party APIs beyond Clerk/Neon/Ably themselves. No webhooks are received or sent.

---

## Testing and verification

Full detail in `TESTING.md`. Short version: `npm run typecheck && npm run lint && npm run test && npm run build` is the full automated verification suite, and it currently passes cleanly (**Verified**, 2026-08-06). Real Neon/Clerk/Ably credentials now exist and the dev server boots against them — `npm run test:e2e` is unblocked but has not actually been run yet.

---

## Deployment

Full detail in `DEPLOYMENT.md`. Short version: **deployed and live** at https://pocket-party-eta.vercel.app (Vercel project `pocket-party`, single deploy for the whole app, no separate Worker — see `DECISIONS.md` D-018). Pushed directly via `vercel deploy --prod` from the local working directory — `git init`/commit/push has still never happened for this project (see `PROJECT_STATE.md`), so there's no Git-integration auto-deploy yet.

---

## DO NOT CHANGE WITHOUT REVIEW

- **`drizzle/*.sql`** — never edit an already-generated migration file's contents once it could plausibly have been applied to a real Neon database. Run `npm run db:generate` again after changing `src/lib/db/schema.ts` to produce a new migration instead. As of this writing no migration has ever been applied anywhere, so it's still safe to regenerate-in-place — this changes the moment a real `DATABASE_URL` is used to apply one.
- **`src/lib/realtime/room-state.ts`'s `StoredMatch.participants` snapshot** — exists specifically to survive a player leaving mid-match. Do not "simplify" match finalization back to reading the live `state.players` roster — that regresses a real bug that was caught and fixed during the original migration.
- **`src/lib/identity/get-current-actor.ts`'s claim logic** — the check that a guest profile's `clerkUserId` is still `null` before attaching a new Clerk user to it is a security-relevant guard, not incidental: removing it would let one Clerk account's sign-up silently reassign a *different* account's already-linked profile (and its stats/history) if the two ever shared a browser. Do not simplify this away.
- **`ABLY_API_KEY`** — server-only, never exposed to the client. Anyone with this key can mint a token claiming to be any profile in any room. Rotating it invalidates every currently-open Ably connection until reconnected with a freshly minted token.
- **The CDN `<script>` tag loading Ably's client SDK (`room-page-client.tsx`)** — do not "clean this up" into a normal npm import. It exists to work around a real Next.js/webpack parse failure in Ably's bundled output (an arrow function using `super(...args)` inside a constructor, which Next.js's RSC client-boundary analyzer cannot parse). See `DECISIONS.md` D-018 for the full investigation before touching this.
- **`games/core/game-engine.ts` (the interface) and any existing `engine.ts`'s `applyAction` signature** — changing the shape of `ActionValidationResult` or the engine contract requires updating all 22 games' engines plus `room-state.ts` plus `game-shell/solo-game-shell.tsx`. This is a wide-blast-radius change.
- **Game engine purity** — never add `Date.now()`, `Math.random()`, or a network/database call inside any `engine.ts`'s `createInitialState`/`applyAction`/`checkOutcome`. Wall-clock time must be threaded in as an explicit `now` parameter, exactly as the existing time-sensitive games already do.
- **The `--party-*` CSS custom property names** in `globals.css` — dozens of components across every game board reference `var(--color-party-violet)` etc. by name.
- **`.gitignore`'s `.env*` / `!.env.example` pairing** — do not weaken this; it is the only thing preventing a real secret from being committed by accident.

---

## Known issues

See `PROJECT_STATE.md` for the live list with severity/status. The highest-signal ones:

1. **No real browser click-through or two-person live match has happened yet.** Live infrastructure (Neon/Clerk/Ably) and a real Vercel deployment both exist and are confirmed working at the API level via `curl`, but nobody has clicked through the UI or confirmed two independent Ably clients actually exchange live events — see `PROJECT_STATE.md`.
2. **All Playwright e2e specs, though covering every game, have never actually run** — no longer blocked on missing credentials, just not yet done.
3. **In-memory rate limiter (`lib/multiplayer/rate-limit.ts`, reused inside `POST /api/rooms/[code]/action`) is now per-serverless-function-instance, not per-room the way it was when it lived inside a long-lived Cloudflare Durable Object.** An honest regression from the Ably rework, acceptable at current scale — see `SECURITY.md`.
4. **Presence/disconnect detection is now a best-effort `sendBeacon`/`pagehide` heuristic**, not a guaranteed `onClose` the way a Durable Object's WebSocket gave for free — another acknowledged tradeoff from the Ably rework.
5. ~~If Ably's CDN is unreachable, room pages stay stuck on "connecting" forever~~ — **fixed 2026-08-15** (`09c0ede`, merged 2026-08-16): `useRealtimeRoom` now has an explicit `"error"` status and a `retry()` function; `room-page-client.tsx` shows a "Try Again" button (plus a `thinking-orbs` animation while connecting) instead of hanging silently. **[Verified]** via the commit diff and `package.json`'s new `thinking-orbs` dependency — not yet confirmed by an actual simulated-outage click-through.
6. **A social sign-in provider (e.g. Google) requires manual configuration in the Clerk dashboard**, not yet done.
7. **A pre-existing hydration-mismatch console warning** fires on every game page's header (the "Toggle fullscreen"/"Rules" button rendering differently between SSR and client render) — confirmed present on old games too (e.g. Grid Three), so it's not something the newer games introduced. React self-heals it via a client-side re-render; worth a future pass but not blocking.

---

## AI working instructions

Every future session, **before** writing code:

1. Read this file (`CLAUDE.md`).
2. Read `PROJECT_STATE.md`.
3. Read `TASKS.md`.
4. Read whichever of `ARCHITECTURE.md` / `FEATURES.md` / `DATABASE.md` / `API_REFERENCE.md` / `SECURITY.md` is relevant to the task at hand.
5. Inspect the actual current code of any file you're about to change — do not assume this document is still 100% accurate; the code may have moved since.
6. Run `git status` before modifying anything.
7. Avoid overwriting unrelated in-progress work.
8. Make small, reviewable changes.
9. Run the relevant subset of `typecheck`/`lint`/`test`/`build` after changes.
10. Update the memory files (this one plus whichever others are affected) after any meaningful change.
11. Never claim something works without having actually run it.
12. Never expose secrets in code, commits, or documentation.
13. Never modify production data without explicit permission.
14. Never perform destructive database operations without explicit permission.
15. Never silently replace an existing architectural pattern with a new one without flagging it as a decision in `DECISIONS.md` first.
16. Never remove a dependency without grepping for all usages first.
17. Never change authentication, database schema, deployment configuration, or security rules casually.
18. Record unresolved uncertainty in `PROJECT_STATE.md` or `TASKS.md` rather than guessing and moving on.

**After** every meaningful coding task:

1. Update `PROJECT_STATE.md` to reflect the new current state.
2. Update `TASKS.md` — move completed items to "Recently completed," update the active task.
3. Append an entry to `SESSION_LOG.md` (append, never overwrite).
4. Update whichever of `FEATURES.md` / `ARCHITECTURE.md` / `API_REFERENCE.md` / `DATABASE.md` / `TESTING.md` / `DEPLOYMENT.md` / `SECURITY.md` is now stale.
5. Remove or correct anything that became inaccurate.
6. If you made an architectural decision, record it in `DECISIONS.md` with real reasoning, not a fabricated one.
7. Run the relevant verification commands.
8. Clearly record anything you could not verify.
9. Treat this repository — not any chat log — as the permanent memory of this project.
