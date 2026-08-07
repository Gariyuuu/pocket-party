# TESTING.md

## Frameworks

- **Unit:** Vitest `^4.1.10`, `jsdom` environment, config at `vitest.config.ts`. Plugin: `@vitejs/plugin-react`. Path alias `@/*` → `src/*` mirrors `tsconfig.json`.
- **E2E:** Playwright `^1.62.1`, config at `playwright.config.ts`. Single project (`chromium`/Desktop Chrome). `webServer` block auto-runs `npm run dev` against `http://localhost:3000` — a single server now (no separate Worker to boot, see `DECISIONS.md` D-018).

## Directory structure

```text
tests/
├── unit/    # tests/unit/**/*.test.ts(x) — 41 files, 320 tests, all pure logic
└── e2e/     # tests/e2e/*.spec.ts — 11 specs (13 tests) + helpers.ts, real browser + real backend required
```

## Unit tests (41 files, 320 tests — **Verified** passing, 2026-08-07)

One file (or more, for Mini Golf, Word Bites, Chess, Darts, Cornhole, Dots and Boxes, Yahtzee, Mancala, and Trivia Blitz, which each split engine/physics-or-bot/board-gen/scoring concerns across multiple files) per game engine (22) plus: `extract-score.test.ts`, `nickname.test.ts`, `physics.test.ts` (shared projectile simulator), `rng.test.ts` (seeded PRNG determinism), `room-code.test.ts`, `realtime-room-state.test.ts` (16 tests covering the room/match reducer — join/ready/host-checks/start/action/leave/rematch/return-to-lobby, including the participant-snapshot-survives-leave regression test), `log.test.ts` (3 tests for `src/lib/log.ts`'s structured-error-payload shape), and a handful more covering shared game-core logic. All are pure-function tests — no DOM rendering, no network, no database, despite the `jsdom` environment being configured (available for any future component test, not currently used — consistent with `@testing-library/react` being an installed-but-unused dependency).

**Command:** `npm run test` (single run) / `npm run test:watch` (watch mode).

## Integration tests

None exist as a distinct category — the unit tests already integration-test each engine's full `applyAction`/`checkOutcome`/`getBotAction` behavior, and `realtime-room-state.test.ts` integration-tests the room/match reducer's full permission/sequence logic, all in isolation from the network/storage layer. There is no test that exercises `POST /api/rooms/[code]/action` itself (the Route Handler shell — Neon load/save, rate limiting, Ably publish) or `finalize-match.ts`/`achievements.ts` (would need either mocking `getDb()` or running against a real Neon connection) — a real coverage gap, see below.

## End-to-end tests (Playwright — 10 of 22 games covered, never successfully run)

`tests/e2e/helpers.ts` holds the shared setup every spec uses: `fillIdentityDialog`, `extractRoomCode`, `dismissTutorialIfPresent`, and `setUpTwoPlayerMatch(browser, gameName)` (creates a room as "Host," joins as "Guest" from a second browser context, selects the named game, readies both players, has the host start — leaving the caller to assert on the resulting board).

- **`tests/e2e/room-join.spec.ts`** (3 tests): two independent browser contexts create/join a room and see each other over their Ably channel subscriptions; host-leave migrates host status to the remaining player; a player who closes their tab (rather than clicking "Leave") reconnects into the same seat on reopening the room URL, rather than duplicating it.
- **`tests/e2e/grid-three.spec.ts`** (1 test): full two-player Grid Three match played out move-by-move to a verified win, checked on both clients.
- **`tests/e2e/{fourfall,bounce-cup,mini-hoops,tank-tactics}.spec.ts`** (1 test each): click the game's always-accepted shoot/fire/drop action once, confirm turn passes from host to guest — a single action can never win any of these on the first move, so the turn-passing outcome is deterministic without needing to script an entire match.
- **`tests/e2e/pocket-shots.spec.ts`** (1 test): a *deliberately weak* drag-based shot, engineered from the actual engine/rack constants (the cue ball spawns 300+ world-units from the nearest rack ball) to be a guaranteed "no contact" foul regardless of drag direction — the one turn-passing outcome that's actually knowable in advance for this game, since a legal pot would keep the turn instead.
- **`tests/e2e/quick-draw.spec.ts`** (1 test): detects which of the two players is round 1's artist from the rendered UI (`"Draw: ..."` text) rather than assuming seat order, then has the guesser submit an answer and confirms it's reflected in their own UI.
- **`tests/e2e/tile-rush.spec.ts`** (1 test): reads every tile's `aria-label` (already encodes color + position) to find a real adjacent same-color pair at runtime — the match's seed isn't known in advance, so which coordinates are actually clearable can't be hardcoded, only discovered.
- **`tests/e2e/word-clash.spec.ts`** (1 test): render-only — confirms both clients see the same round number and letter pool after starting. Does **not** attempt to submit a word: the pool is seeded per-match and a blindly-guessed word would fail the real-dictionary/pool-membership check most of the time, asserting nothing meaningful either way.
- **`tests/e2e/orb-hockey.spec.ts`** (1 test): render-only plus the automatic countdown-to-live transition (`COUNTDOWN_MS = 3000`, a real client-triggered `"start-serve"` action that must round-trip through `POST /api/rooms/[code]/action`). Does **not** attempt to script a goal — paddle/puck motion is real-time client-side physics driven by a `requestAnimationFrame` loop and an Ably `"broadcast"` event, not a single scriptable action the way every other game's move is.
- **Mini Golf, Word Bites, Sea Battle, Checkers, Chess, Darts, Cornhole, Reversi, Dots and Boxes, Yahtzee, Mancala, and Trivia Blitz have no e2e spec yet** — all 12 were added after the rest of this suite; see coverage gap 7 below.
- All specs assume the current flow: the identity dialog runs *before* navigating to `/room/[code]` (`?autojoin=1` then does the actual join on landing), room codes are parsed out of a URL that carries a query string, and `playwright.config.ts`'s `webServer` config starts a single server (`npm run dev`) — room/match state lives in Neon (`live_rooms`) behind `POST /api/rooms/[code]/action`, not a separately-hosted process. **Verified**: all 13 tests across 11 files parse and list correctly via `npx playwright test --list` — this confirms syntax/structure, not that they pass.
- **Hard requirement to actually run them:** real Neon/Clerk/Ably credentials and a correctly populated `.env.local` — **this has never existed for this project**, so none of these specs has run to completion.
- **Command:** `npm run test:e2e` (boots the webServer automatically per `playwright.config.ts` — but the Next.js dev server will throw a "missing env var" error immediately if `.env.local` isn't set up first).

## Test data / fixtures / mocks

No fixture files, no mocked Neon/Clerk/Ably client anywhere. `src/lib/db/seed.ts` seeds the 5-row achievement catalog for real use, not as a test fixture — the e2e specs would indirectly depend on it existing once run against real credentials. No secrets appear in any test file.

## Test environment variables

Unit tests need none (pure logic, no env access). E2E tests need the full `.env.local` set (see `CLAUDE.md`'s Environment setup table) — real Neon/Clerk credentials and a real `ABLY_API_KEY` — since the dev server the tests drive requires all of it to boot.

## Coverage gaps (identified, not filled)

1. **`POST /api/rooms/[code]/action` has no direct test coverage** — the Route Handler shell (Neon load/save, rate limiting, Ably publish, calling into `finalize-match.ts`/`public-rooms.ts`) is only exercised indirectly, and only once the e2e specs actually run against a live deployment. The pure logic it delegates to (`room-state.ts`) *is* directly unit-tested — this gap is specifically about the I/O shell around it.
2. **`finalize-match.ts` and `achievements.ts` have no dedicated test coverage** — would need either a mocked `getDb()` or a real Neon connection.
3. ~~The 2 Playwright specs cover only 1 of 10 games' full online flow~~ — **done**: all 10 games now have a dedicated spec (see above), though several are intentionally lighter (render-only, or a narrower deterministic action) than a full "play to a win" script where the game's own randomness/physics/timing made that infeasible to write with confidence.
4. **Orb Hockey and Quick Draw's Ably `"broadcast"` passthrough paths still have no test coverage that exercises the passthrough itself** (unit or e2e) — `orb-hockey.spec.ts`/`quick-draw.spec.ts` cover the surrounding online flow (countdown, guessing) but neither drives an actual paddle-drag or pen-stroke broadcast message, since that's real-time client-side physics/canvas input, not a single scriptable action. These remain the architecturally riskiest games to have never been played for real (see `ARCHITECTURE.md`).
5. **No component/rendering tests** despite `@testing-library/react` being installed — 100% of current coverage is engine/logic-level.
6. **No load/concurrency testing** of the in-memory rate limiter or the optimistic-concurrency `sequence` check under real simultaneous requests, and no testing of Ably reconnection/token-renewal behavior under real network conditions.
7. **Mini Golf, Word Bites, Sea Battle, Checkers, Chess, Darts, Cornhole, Reversi, Dots and Boxes, Yahtzee, Mancala, and Trivia Blitz have no Playwright coverage** — all 12 have real unit coverage (engine, physics/board-gen/scoring, bot) matching every other game's bar, but none has a dedicated e2e spec the way the original 10 games do. Mini Golf would follow the `bounce-cup`/`mini-hoops` turn-passing pattern closely (drag-based putt, deterministic turn handoff); Word Bites would need its own pattern, closer to `tile-rush.spec.ts`'s "discover a valid move from rendered state at runtime" approach than `word-clash.spec.ts`'s render-only one, since a claimed bite-group is a guaranteed real word by construction. Checkers/Chess/Darts/Cornhole/Reversi/Dots and Boxes/Mancala would all follow the simple turn-passing pattern (a single always-legal action, confirm the turn/dart-or-bag-count advances); Sea Battle would need a dedicated placement-phase step first, since its opening phase isn't turn-based; Yahtzee's turn spans multiple actions (roll/hold/score), closer to a short scripted sequence than a single click; Trivia Blitz would follow Word Clash's render-only pattern (everyone answers independently, no turn to assert on).
8. **The music synth's generated audio is checked programmatically (`tests/unit/music.test.ts` decodes the WAV and checks peak/RMS/edge-silence) but was never listened to by a human** — a real, if minor, gap given this feature is explicitly about subjective audio quality.

## Known flaky tests

None identified in the unit suite — all 320 unit tests pass deterministically (seeded RNG design specifically avoids flakiness from randomness; physics tests use deterministic grid-search helpers rather than tolerating random inputs). The e2e suite has never run, so nothing is known about its flakiness either way — `pocket-shots.spec.ts`'s drag-based shot and the two timer-based specs (`word-clash`'s round timer isn't waited on, but `orb-hockey`'s countdown is) are the most likely candidates for timing sensitivity once actually run against real infrastructure. The `use-realtime-room.ts` hook's 15-second wait for `window.Ably` to load from Ably's CDN is a new potential source of e2e flakiness/slowness not present under the old approach — worth watching once these specs actually run.

## Commands and expected results (as verified 2026-08-06)

| Command | Result |
|---|---|
| `npm run typecheck` | Passes, 0 errors |
| `npm run lint` | Passes, 0 errors/warnings |
| `npm run test` | Passes, 41 files / 320 tests |
| `npm run build` | Succeeds; 14 routes (pages + API routes + generated `icon`/`apple-icon`) |
| `npm run test:e2e` | **Not run** — all 13 tests across 11 files confirmed to parse/list correctly (`npx playwright test --list`), but needs real credentials to actually execute (see above) |

## Manual smoke-test checklist (the most important user flows — none of this has been done yet)

Do this immediately after setting up real Neon/Clerk/Ably credentials and deploying the app (see `DEPLOYMENT.md`):

1. **Guest bootstrap:** open the app fresh (no cookies). Confirm no error, confirm a `guest_id` cookie is set and a matching `profiles` row appears in Neon.
2. **Create a room:** landing page → Create Room → set nickname/avatar → confirm redirect to `/room/<CODE>?autojoin=1` and the code is visible/copyable.
3. **Join from a second context:** open the room URL in an incognito window (or second browser) → confirm both windows show both players within a moment of the Ably channel connecting.
4. **Ready up + start:** both players ready up, confirm the "Start game" button enables only when eligible, host starts, confirm both windows transition into the game board simultaneously.
5. **Play one full match of Grid Three** (simplest game) end to end — confirm moves sync live on both windows, confirm the winner screen shows the correct result on both.
6. **Check post-match state:** confirm `/leaderboard` reflects the result, confirm `/profile` shows updated win count and (if applicable) a newly granted achievement.
7. **Rematch and return-to-lobby:** from the result screen, test both buttons, confirm each does what it says for both players.
8. **Repeat step 5 for at least Orb Hockey and Quick Draw** — the two Ably-`"broadcast"`-based real-time games, architecturally the most different from the rest and the least covered by any automated test. Also worth a pass: Mini Golf (multi-turn, per-ball rotation) and Word Bites (any-player-anytime submissions racing against a shared shrinking rack) — both are structurally different enough from the original 10 that a live click-through is the first time either's actual UI/interaction feel gets checked.
9. **Solo/bot mode:** from the landing page, play at least one game solo against the bot without ever creating a room.
10. **Account linking:** from `/profile` as a guest, "Create an account" through Clerk's modal, confirm you land back on `/profile` still showing the same stats (same profile, now non-guest).
11. **Theme wheel + dark/light mode:** cycle through all 3 theme packs in both light and dark mode, confirm the background PNG and accent colors change as expected.
12. **Mobile/portrait check:** open a physics-heavy game (e.g. Tank Tactics) on a narrow portrait viewport, confirm the landscape hint appears.
13. **Idle-room cleanup:** leave a room idle for the full threshold (4 hours, `GET /api/cron/cleanup`'s cutoff, run daily via Vercel Cron) and confirm its `public_room_listings` row disappears from `/lobby` and its `live_rooms` row is deleted.
14. **Disconnect detection:** close a room tab (rather than clicking "Leave") and confirm the other player eventually sees that seat marked disconnected — this now relies on a best-effort `navigator.sendBeacon` fired on `pagehide`, not a guaranteed server-side close event (see `DECISIONS.md` D-018), so also worth confirming what happens if the tab is killed abruptly enough that `pagehide` never fires (network drop, force-quit).
15. **Ably CDN reachability:** confirm the app degrades sensibly (or at least fails clearly, not silently) if `cdn.ably.com` is blocked — e.g. via a browser extension or network-level block — since `use-realtime-room.ts` currently just waits 15 seconds and then shows an error.

## Pre-release checklist

- [ ] All items in the manual smoke-test checklist above pass.
- [x] Playwright e2e specs updated for the Ably-based room flow (comment/reference updates only — selectors and flow were already correct, see `DECISIONS.md` D-018).
- [ ] `npm run test:e2e` actually run to completion against real credentials (still blocked — see above).
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` all pass.
- [ ] `npm run test:e2e` passes against the target environment.
- [ ] `ABLY_API_KEY` is set in Vercel (Production **and** Preview) — see `SECURITY.md` for why it's the single most sensitive value in this stack.
- [ ] A social sign-in provider (if offering one) is configured in the Clerk dashboard, or the corresponding button is hidden until it is.
- [ ] `.env.example` is up to date with every env var actually required.
