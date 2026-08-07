# FEATURES.md

Status classification legend: **Verified complete** (full flow read end-to-end: UI → client logic → server logic → DB/Ably channel → validation → error/loading/empty states) / **Mostly complete** (full flow exists, minor gap noted) / **Unable to verify** (code looks complete but has never run against a live backend, so real-world correctness is unconfirmed).

**Global caveat applying to every "Verified complete" entry below:** "Verified complete" here means *the code implements the full flow correctly as far as static reading can determine, and automated tests pass*. **None of this has been exercised against a live Neon/Clerk/Ably deployment or by a human clicking through the app.** Treat every feature as "Verified complete (static) / Unable to verify (live)" until the steps in `PROJECT_STATE.md`'s "Next three recommended actions" happen.

---

## Platform features

### Guest identity & real accounts

- **Purpose:** let anyone play instantly with zero signup, with an optional upgrade to a persistent account later.
- **Flow:** `middleware.ts` ensures a `guest_id` cookie exists on every request → `get-current-actor.ts` resolves (or provisions) a `profiles` row from either that cookie or a Clerk session → client picks a nickname/avatar color when joining a room (`IdentityDialog`) → that identity travels with the `"join"` request to `POST /api/rooms/[code]/action`.
- **Files:** `src/middleware.ts`, `src/lib/identity/guest-cookie.ts`, `src/lib/identity/get-current-actor.ts`.
- **Status: Verified complete (static)** / **Unable to verify (live)**.

### Account linking

- **Purpose:** let a guest upgrade to a persistent account without losing their existing stats — the same `profiles.id` row is claimed by the new Clerk user, not replaced.
- **Flow:** `/profile` → `AccountLinking` component → "Create an account" opens Clerk's own prebuilt sign-up modal (`clerk.openSignUp()`) → on the next request after sign-up, `get-current-actor.ts` finds the still-unclaimed guest profile (via the `guest_id` cookie) and attaches the new `clerkUserId` to that same row. "Already have an account on another device? Sign in instead" opens Clerk's sign-in modal — this path intentionally does **not** preserve the current device's guest stats (a different, already-claimed profile takes over).
- **Files:** `src/components/profile/account-linking.tsx`, `src/lib/identity/get-current-actor.ts`.
- **Edge cases handled:** a guest profile already claimed by a *different* Clerk user is never re-claimed by a new one (checked explicitly).
- **Status: Verified complete (static)** / **Unable to verify (live)** — no Clerk application exists yet, so the actual modal UI/redirect flow has never run.

### Room creation & joining

- **Purpose:** the core "start a game with friends" flow — 6-character shareable code, public/private toggle.
- **Flow:** landing page → "Create Room" → pick nickname/avatar → client generates a room code and navigates to `/room/[code]` → `useRealtimeRoom` fetches initial state (`GET /api/rooms/[code]`), subscribes to that room's Ably channel, and sends `{ type: "join", ... }` to `POST /api/rooms/[code]/action`, which creates the `live_rooms` row implicitly if it's the first join. Joining an existing room: enter a code (or follow a shared link) → same `"join"` flow.
- **Files:** `src/lib/multiplayer/room-code.ts` (client-side code generation — safe given the 32^6 code space), `src/lib/realtime/use-realtime-room.ts`, `src/lib/realtime/room-state.ts`'s `joinRoom`, `src/app/room/[code]/page.tsx`, `src/components/room/*`, `src/components/landing/create-room-button.tsx`, `join-room-form.tsx`.
- **Validation:** nickname schema (`lib/validation/nickname.ts`); room state checks (not closed, not full, not mid-game unless reconnecting).
- **Edge cases handled:** nickname collision auto-suffixing, reconnect-vs-duplicate-join (an existing profile rejoining reactivates its seat rather than duplicating), room full, room closed, joining mid-match blocked with a clear message.
- **Status: Verified complete (static)** / **Unable to verify (live)**.

### Room lobby (pre-game)

- **Purpose:** roster view, game picker, ready-up, host controls (public/private toggle, party modifiers), start button.
- **Files:** `src/components/room/lobby.tsx`, `room-page-client.tsx`, `identity-dialog.tsx`, `src/lib/realtime/use-realtime-room.ts`.
- **Notable details:** the room's live state is whichever of the initial `GET /api/rooms/[code]` fetch or a subsequent Ably `"state"` event arrived last (guarded by `updatedAt` ordering — see `DECISIONS.md` D-018), not a single always-current stream the way a Durable Object's `onConnect` used to provide for free; the "wind" party modifier only shows up for the 2 games (`bounce-cup`, `mini-hoops`) whose engines actually read it — not a generic modifier system, deliberately scoped to what's wired up.
- **Status: Verified complete (static)** / **Unable to verify (live)**.

### Public rooms list

- **Purpose:** browse joinable public rooms without needing a code, at `/lobby`.
- **Flow:** `GET /api/public-rooms` reads `public_room_listings` (a Neon discovery index kept in sync by `POST /api/rooms/[code]/action` — see `DECISIONS.md` D-015) → `public-rooms-list.tsx` renders the result → picking a room navigates to `/room/{code}?autojoin=1`, same code path as manual room creation/joining.
- **Files:** `src/app/lobby/page.tsx`, `src/components/lobby/public-rooms-list.tsx`, `src/app/api/public-rooms/route.ts`, `src/lib/realtime/public-rooms.ts`.
- **Status: Verified complete (static)** / **Unable to verify (live)**.

### Multiplayer match engine (server-authoritative actions)

- **Purpose:** the shared runtime every one of the 10 games' online play goes through — turn/move validation, sequence-based anti-replay, match finalization.
- **Files:** `src/lib/realtime/room-state.ts` (the pure reducer, unit-tested — `tests/unit/realtime-room-state.test.ts`, 16 tests), `src/app/api/rooms/[code]/action/route.ts` (the I/O shell — Neon load/save, Ably publish, rate limiting), `src/lib/realtime/finalize-match.ts`.
- **Status: Verified complete (static)** / **Unable to verify (live)** — this is the single most important piece of code in the app to live-test first, since every game depends on it.

### Solo play vs. bot

- **Purpose:** let one person play any of the 10 games alone against a bot, no room/multiplayer needed. **Entirely unaffected by either backend migration** — solo play never touched Supabase, PartyKit, or Ably; it's pure client-side engine logic.
- **Files:** `src/components/game-shell/solo-game-shell.tsx`, `src/games/*/bot.ts` (6 games), plus hand-wired bot logic inside `solo-game-shell.tsx` or `board.tsx` for the other 4.
- **Bot architecture split:**
  | Game | Bot mechanism |
  |---|---|
  | Grid Three | `engine.getBotAction()` |
  | Fourfall | `engine.getBotAction()` |
  | Bounce Cup | `engine.getBotAction()` |
  | Mini Hoops | `engine.getBotAction()` |
  | Tank Tactics | `engine.getBotAction()` |
  | Pocket Shots | `engine.getBotAction()` |
  | Word Clash | hand-wired in `solo-game-shell.tsx` |
  | Quick Draw | hand-wired in `solo-game-shell.tsx` |
  | Tile Rush | hand-wired in `solo-game-shell.tsx` |
  | Orb Hockey | hand-wired directly inside `src/games/orb-hockey/board.tsx`'s animation loop |
- **Status: Verified complete (static)**, confirmed passing via unit tests for every engine's bot-move logic where `getBotAction` exists.

### Achievements

- **Purpose:** 5 seeded achievements, evaluated server-side after every match finalization.
- **Catalog:** `first-win`, `three-peat` (3 room-scoped wins in a row), `all-rounder` (wins in ≥5 distinct games), `word-wizard` (Word Clash, ≥30 pts in one round), `perfect-game` (Grid Three win in exactly 5 moves).
- **Files:** `src/lib/realtime/achievements.ts` (replaces the old `src/lib/achievements/evaluate.ts`, removed in Phase 5), `src/lib/db/seed.ts` (replaces `supabase/seed.sql`), `src/components/profile/achievements-grid.tsx`.
- **Error handling:** best-effort — wrapped in try/catch inside `POST /api/rooms/[code]/action`'s `finalizeMatch` call site; a failure here never blocks the match from finalizing.
- **Status: Verified complete (static)** / **Unable to verify (live)**. Still a fixed, hardcoded set of 5 checks in application code, not a generic rules engine — adding a 6th means writing a new check plus a new seed row, not just data entry.

### Leaderboard & profile stats

- **Purpose:** per-game win/loss/draw/win-rate leaderboard; profile page showing total wins, games played, match history, achievements, recent opponents.
- **Flow:** both `/profile` and `/leaderboard` are Server Components reading Neon directly via Drizzle, resolving the viewer's own identity via `getCurrentActor()` — no client-side data fetch, no RLS (every query explicitly filters to the caller's own `profileId` where relevant). Editing display name/avatar color goes through `PATCH /api/profile`.
- **Files:** `src/app/leaderboard/page.tsx`, `src/app/profile/page.tsx`, `src/components/profile/*`, `src/app/api/profile/route.ts`, `leaderboard_entries` table (Postgres-generated `win_rate` column, portable as-is from the Supabase-era schema).
- **Status: Verified complete (static)** / **Unable to verify (live)**. See `DECISIONS.md` D-016 for this feature's Phase 4 port (including a build-time gotcha: `/leaderboard` needed an explicit `force-dynamic` export once it lost the `cookies()` call that used to force that behavior for free).

### App icon (generated)

- **Purpose:** browser tab / home-screen icon.
- **Files:** `src/app/icon.tsx`, `src/app/apple-icon.tsx` — generated at request/build time via `next/og`'s `ImageResponse`, not a static image asset. **Unaffected by the backend migration.**
- **Status: Verified complete (static).**

### Patch notes page

- **Purpose:** a `/patch-notes` page listing what's shipped, manually curated.
- **Files:** `src/app/patch-notes/page.tsx`, `src/lib/content/patch-notes.ts`. **Unaffected by the backend migration** — content is hand-authored data.
- **Status: Verified complete (static).**

### Theme wheel (3 palettes × light/dark procedural backgrounds)

- **Purpose:** let a player pick one of 3 accent-color palettes (Classic Party / Arcade Neon / Sunset Warmth), each theme changing 5 CSS custom properties and swapping a procedurally-generated background PNG, for both light and dark mode.
- **Files:** `src/lib/design/theme-packs.ts`, `use-theme-pack.ts`, `src/components/theme-pack-picker.tsx`, `theme-pack-provider.tsx`, `themed-background.tsx`, `scripts/generate-theme-backgrounds.js`, `public/themes/*.png`. **Unaffected by the backend migration.**
- **Scope:** applies to landing hero, `/lobby`, and the pre-game room lobby view. Deliberately does not apply inside any game board.
- **Status: Verified complete (static).**

### Accessibility settings (high contrast, reduced motion)

- **Purpose:** a manually-toggleable high-contrast mode plus respect for `prefers-reduced-motion`. **Unaffected by the backend migration.**
- **Files:** `src/lib/design/use-accessibility-settings.ts`, `src/components/settings-menu.tsx`.
- **Status: Verified complete (static)**, not manually tested with a screen reader or real low-vision user.

### Audio (procedurally synthesized)

- **Purpose:** sound effects and ambient music, entirely generated at runtime — no shipped audio files. **Unaffected by the backend migration.**
- **Files:** `src/lib/audio/tone.ts`, `sfx.ts`, `music.ts`, `use-audio-settings.ts`.
- **Status: Verified complete (static).** Actual audio quality/correctness was not listened to.

---

## The 10 games

Every game shares the same architecture (`types.ts` + `engine.ts` + `board.tsx`, plus supporting pure-logic files) and the same test coverage pattern (a Vitest file per engine in `tests/unit/`, all passing). **The games themselves — every engine, board, and bot — are entirely unaffected by either backend migration.** What changed is only how a board talks to the server: `RoomPlayer`/room-roster types now come from `src/lib/realtime/protocol.ts` instead of Supabase row shapes, and Orb Hockey/Quick Draw's live sync goes over a generic Ably `"broadcast"` event instead of Supabase Realtime Broadcast (previously a PartyKit WebSocket passthrough, in between).

| Game | Category | Players | Realtime? | Bot |
|---|---|---|---|---|
| Grid Three | classic | 2 | No | `getBotAction` |
| Fourfall | classic | 2 | No | `getBotAction` |
| Word Clash | puzzle | 2-4 | No | hand-wired |
| Bounce Cup | physics | 2 | No | `getBotAction` |
| Mini Hoops | physics | 2 | No | `getBotAction` |
| Tank Tactics | physics | 2-4 | No | `getBotAction` |
| Orb Hockey | reflex | 2 | **Yes (Ably broadcast)** | hand-wired in `board.tsx` |
| Pocket Shots | physics | 2 | No | `getBotAction` |
| Quick Draw | reflex | 2-4 | **Yes (Ably broadcast)** | hand-wired |
| Tile Rush | puzzle | 2-4 | No | hand-wired |

All 10 have `status: "available"` in `games/core/registry.ts`. All 10 have engine unit tests passing (172 total across the suite). All 10 are wired into `game-shell/game-surface.tsx`'s dispatch. **"Unable to verify (live)" applies uniformly to all 10** for the same reason as everywhere else in this document: no one has actually played any of them against a live deployment with two real browsers.

Game-specific notes worth preserving:

- **Word Clash:** server validates submitted words against a real dictionary (`isRealWord`, async, `src/games/word-clash/dictionary.ts` + `word-list.json`) — not just a length check.
- **Orb Hockey:** the only game with true low-latency real-time physics (client-predicted paddles, one client is a fixed physics authority for the puck, goals reported through the authoritative path with a same-client check to prevent forged goals). Highest-risk game to live-test, since it's the most architecturally different from the other 9.
- **Quick Draw:** pen strokes broadcast live; guesses and round-advance are the only actions that go through the authoritative `"action"` message path.
- **Tank Tactics, Word Clash, Orb Hockey, Quick Draw, Tile Rush:** these 5 are the "wall-clock-gated" games — their engines receive an explicit `now` parameter for turn/round timers, threaded in by `room-state.ts`, never computed inside the engine itself.

---

## Feature-completeness summary

Nothing in the codebase was found to be a placeholder, mock, or stub. The gap between "code complete" and "production ready" in this project is **entirely** about live verification, not unfinished implementation:

- No missing UI states were found (loading/empty/error states exist where checked).
- No games are missing engines, boards, or tests.
- **Zero Supabase or Cloudflare/PartyKit dependency remains anywhere in the live code path** — every feature above is described purely in terms of the Clerk + Neon/Drizzle + Ably stack.
- The one genuinely unfinished-feeling piece is a **social sign-in provider setup in the Clerk dashboard**, which is a dashboard configuration task, not a code task.
