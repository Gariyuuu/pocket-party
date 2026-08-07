# CHANGELOG.md

No `CHANGELOG.md` existed prior to this entry. The version history below (0.1.0 through 0.7.0) is **reconstructed from `src/lib/content/patch-notes.ts`**, the in-app patch notes data shown at `/patch-notes` — that file is the authoritative source and predates this changelog; treat it as canonical if the two ever diverge in the future (update this file to match, not the reverse). `package.json`'s version field currently reads `0.1.0` and has not been bumped to track these entries — **a known inconsistency, not corrected during this audit** (out of scope: this is a documentation-creation pass, not a version-bump pass). No dates below were invented — they are copied directly from `patch-notes.ts`.

## Documentation audit / handoff — 2026-08-06

**Type:** documentation only. No application behavior was intentionally changed.

- Created the full 17-file project memory system: `CLAUDE.md` (rewritten from a one-line `@AGENTS.md` transclusion into a full operating manual), `PROJECT_STATE.md`, `ARCHITECTURE.md`, `FILE_MAP.md`, `FEATURES.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, `DATABASE.md`, `API_REFERENCE.md`, `UI_SYSTEM.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, this `CHANGELOG.md`, `SESSION_LOG.md`, `HANDOFF.md`.
- Verified the existing `README.md` (434 lines) remains accurate and was left in place, not duplicated — the new files cross-reference it rather than repeat it.
- Verified via direct execution: `npm run typecheck`, `npm run lint`, `npm run test` (153 tests, 19 files), `npm run build` — all passing.
- Significant findings surfaced during the audit (see `PROJECT_STATE.md`, `FILE_MAP.md`, `SECURITY.md` for full detail): zero git commits exist anywhere in this project's history; no live Supabase project has ever been connected, so the entire multiplayer/realtime/RLS layer is unverified against a real backend; two dependencies (`nanoid`, `@testing-library/react`) are installed but unused; Google OAuth provider setup appears incomplete; the in-memory rate limiter is documented as not scale-safe past one instance.
- No product code was modified. No dependencies were added, removed, or upgraded. No database migration was created, altered, or applied.

## 0.7.0 — "Polish pass" — 2026-08-06

- New settings menu: sound, music, vibration, and high-contrast toggles.
- A short procedural ambient music loop, off by default until toggled on.
- Colorblind-safe fixes across Fourfall, Tank Tactics, Orb Hockey, Pocket Shots, and Tile Rush — shapes and labels now back up every color.
- Keyboard support for Orb Hockey's paddle (arrow keys).
- Screen-reader labels added to every game board that was missing one.
- A landscape-orientation hint on physics-heavy games, and a fullscreen toggle in the game header.
- Custom error and "not found" pages instead of framework defaults.
- Idle rooms now actually get cleaned up on a schedule (the cleanup RPC always existed, it just never had a scheduled trigger before this release).

*(Note: this audit's own follow-up work — the app icon, `/patch-notes` page itself, and the theme wheel — was completed after this 0.7.0 entry was written in-app, but no corresponding patch-notes entry for that work exists in `patch-notes.ts` as of this audit. This is a gap in the in-app changelog, not in this file — flagged here rather than silently invented.)*

## 0.6.0 — "Accounts and progression" — 2026-08-05

- Link an email or Google account to a guest session without losing any stats — same profile, same history.
- Achievements: first win, a 3-win streak in one room, wins across 5+ games, a big Word Clash round, a fast Grid Three win.
- Match history, recent opponents, and a favorite game, all tracked automatically.
- Per-game leaderboards instead of one mixed list.
- Fixed a real bug where finished matches could disappear from history within 30 minutes (see `DECISIONS.md` D-004 for the technical detail — migration `20260805000010`).

## 0.5.0 — "Quick Draw & Tile Rush" — 2026-08-05

- Quick Draw: rotating-artist drawing and guessing, live stroke sync, speed-based scoring.
- Tile Rush: match-and-clear puzzle race with row/column clears, shuffle, multiplier, and a progress-hiding freeze power-up.
- Bots for both, so solo mode works even for games built around multiple players.

## 0.4.0 — "Pocket Shots & Orb Hockey" — 2026-08-05

- Pocket Shots: an original 8-ball-style billiards game with real ball-collision physics.
- Orb Hockey: the platform's first real-time game — live paddle sync over Supabase Realtime Broadcast, not just turn-based actions.

## 0.3.0 — "Physics games" — 2026-08-05

- Bounce Cup, Mini Hoops, and Tank Tactics — all sharing one deterministic projectile physics engine.
- Five distinct shell types in Tank Tactics, each with real physics differences.
- A shared seed means every shot replays identically for every spectator.

## 0.2.0 — "First playable games" — 2026-08-05

- Grid Three, Fourfall, and Word Clash — fully multiplayer, with bots for solo play.
- The server-authoritative match engine every later game builds on.
- Procedurally generated sound effects — no external audio files anywhere on the platform.

## 0.1.0 — "Foundation" — 2026-08-05

- Create a room, share a code, join without an account.
- Guests are real (anonymous) accounts under the hood, so stats aren't fake and RLS is real.
- The design system, lobby, and reconnection handling everything else was built on.
