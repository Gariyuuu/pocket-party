# PROJECT_STATE.md — Exact State at Handoff

**Timestamps:** 2026-08-06 (documentation audit) → 2026-08-06 (account-switch checkpoint) → 2026-08-06 (migration Phase 1: Neon + Drizzle schema) → 2026-08-06 (migration Phase 2: Clerk + guest-cookie identity layer) → 2026-08-06 (migration Phase 3: PartyKit room/match engine) → 2026-08-06 (Phase 3 Follow-up A: Orb Hockey + Quick Draw broadcast sync) → 2026-08-06 (Phase 3 Follow-up B: Neon-backed public-rooms directory) → 2026-08-06 (migration Phase 4: `/profile`/`/leaderboard` onto Neon reads) → 2026-08-06 (migration Phase 5: full Supabase removal) → 2026-08-06 (realtime transport reworked from PartyKit/Cloudflare to Ably, cost-driven — `DECISIONS.md` D-018) → 2026-08-06 (documentation re-sync to match the Ably rework) → 2026-08-06 (**live infrastructure provisioned and exercised for the first time** — Neon via Vercel Marketplace, Clerk, Ably; a real bug found and fixed in `db:seed`).
**Purpose:** let a brand-new agent resume from the exact point development stopped, with zero guessing.

---

## ⚠️ This app has now been run against real infrastructure for the first time — read this before assuming everything is still "never verified"

Every prior version of this file said "never live-tested" as a blanket statement. **That is no longer true for the core loop.** This session:

1. Provisioned a real Neon database through Vercel's Marketplace integration (`vercel install neon`), created and linked a real Vercel project (`pocket-party`, under `garywangsmes-8349s-projects`), connected the database to it, and pulled `DATABASE_URL` into `.env.local` via `vercel env pull`.
2. Received real Clerk keys and a real Ably API key from the user directly in chat, written into `.env.local` (gitignored, confirmed via `git check-ignore`).
3. Ran `npm run db:migrate` against the live Neon database — succeeded, all 9 tables created.
4. Ran `npm run db:seed` — **failed on the first attempt** with a real, previously-latent bug (see below), fixed, then succeeded (5 achievements seeded).
5. Booted `npm run dev` and exercised the real HTTP surface with `curl` (not yet a browser click-through — see "Still not verified" below): guest identity bootstrap, `POST /api/rooms/[code]/action` (`"join"` then `"leave"`), `GET /api/rooms/[code]`, `GET /api/ably-token` (returned a correctly-scoped Ably `TokenRequest` — capability `{"room:TEST42":["presence","publish","subscribe"]}`, confirming `ABLY_API_KEY` is valid and the scoping logic in `ably-server.ts` works as designed), `/leaderboard`, `/profile`, `/room/[code]` — all returned `200` with no errors in the dev server log. The test room was cleaned up (`"leave"` action, room closed) before the server was stopped.

**A real bug was found and fixed:** `src/lib/db/seed.ts` imported `getDb()` from `./client.ts`, which has `import "server-only"` at its top. That import throws unconditionally unless a bundler (webpack/turbopack, as used by Next.js) aliases it away for server-side code — `tsx` (what `npm run db:seed` actually runs) does no such aliasing, so the script has apparently never been able to run successfully, from the moment `client.ts` gained that import. This had never surfaced before because nobody had a real `DATABASE_URL` to try it against until now. **Fixed** by having `seed.ts` construct its own `drizzle(neon(getDatabaseUrl()))` client directly (reusing `env.ts`'s `getDatabaseUrl()`, which has no `server-only` import) instead of importing `client.ts`. `client.ts` itself is untouched — the `server-only` guard still protects the actual Next.js app code from an accidental client-component import, which is what it was for.

**Still not verified — do not overclaim beyond this:**
- No human has clicked through the app in a real browser. Everything above was `curl`/API-level.
- Two real people (two browser contexts) playing an actual match, including Ably's live pub/sub actually delivering a `"state"` event to a *second* connected client, has not been observed — the `curl` calls above prove the HTTP/token-minting layer works, not that two live Ably subscribers actually see each other's moves in real time.
- `npm run test:e2e` (Playwright) has still not been run.
- Nothing has been deployed to Vercel yet — the Vercel project that now exists (`pocket-party`) has never had `vercel deploy` run against it; Clerk/Ably env vars exist only in local `.env.local`, not yet added to the Vercel project's own environment variables (only `DATABASE_URL` and Neon's other vars got there, via the marketplace integration's auto-connect).
- A real Vercel `VERCEL_OIDC_TOKEN` now also lives in `.env.local` (added automatically by `vercel link`) — harmless, not a secret this app's code reads, but worth knowing it's there if `.env.local` is ever inspected.

If you find a stale Supabase, PartyKit, or Cloudflare reference anywhere, treat it as a documentation bug to fix, not as evidence any migration is still ongoing.

## Git state

- **Repository root for git purposes:** `~/Projects` (the parent folder — `pocket-party/` is a subdirectory, not its own git repo).
- **Branch:** `main`. **Latest commit hash:** none — zero commits exist (unchanged since every prior session). No git action was taken this session — only file edits, plus real infrastructure provisioning via the Vercel CLI (a Vercel project + Neon database now exist in the user's real Vercel/Neon accounts — not a git-tracked change, but a real external side effect worth knowing about).

## Active objective

**Live-verify the app for real, now that credentials exist.** The API-level smoke test above (`curl`) confirms the wiring is correct, but a real browser click-through (`TESTING.md`'s manual smoke-test checklist) and `npm run test:e2e` are the next concrete steps — see "Next three recommended actions" below.

## Last completed task

**Live infrastructure provisioning + first-ever live exercise of the app** (this session) — see the section above for the full account. Provisioned Neon via Vercel Marketplace, linked a Vercel project, wrote Clerk/Ably credentials the user provided directly into `.env.local`, ran migrations, found and fixed a real `db:seed` bug, then booted the dev server and confirmed the guest-identity → room-join → Ably-token-mint → leaderboard/profile pipeline all work against real infrastructure via `curl`. No product/game code changed beyond the one-file `seed.ts` fix. Full verification suite (`typecheck`/`lint`/`test`/`build`) re-confirmed passing after the fix.

## Current unfinished task

**None as an active in-progress task**, but the very next thing worth doing is upgraded in priority now that credentials exist: a real two-browser manual click-through (`TESTING.md`'s smoke-test checklist) and running `npm run test:e2e` for the first time — both now actually possible, which they weren't before this session.

## What's been attempted / what works / what fails

- **Works (verified live, this session, via curl):** guest identity provisioning (a real `profiles` row was created in Neon), room creation/join/leave through `POST /api/rooms/[code]/action`, `GET /api/rooms/[code]`, Ably token minting with correct per-room capability scoping, `/leaderboard`, `/profile`, `/room/[code]`, `npm run db:migrate`, `npm run db:seed` (after the fix).
- **Works (verified by automated checks only, unchanged from before):** `typecheck`/`lint`/`test`/`build` all pass. All 10 games' full online flow is built end-to-end, but not yet exercised live beyond the lobby/join layer above — no actual match has been played against live infrastructure yet.
- **Not yet verified:** two real browser clients seeing each other's live state via Ably in practice; any of the 10 games actually played; `npm run test:e2e`; a real Vercel deployment.

## Current errors

None reproducible. The dev server will fail fast with a clear "missing environment variable" error with no `.env.local` — intentional fail-fast behavior (`src/lib/db/env.ts`/`src/lib/realtime/env.ts`), not a bug. (The `db:seed` bug described above **is** now fixed, not a currently-reproducible error.)

## Blockers

1. ~~No Neon project~~ — **resolved this session.** A real Neon database (`pocket-party-db`) now exists, provisioned via Vercel's Marketplace, connected to the `pocket-party` Vercel project.
2. ~~No Clerk application~~ — **resolved this session.** Real test-mode keys supplied by the user, now in `.env.local`.
3. ~~No Ably app~~ — **resolved this session.** A real API key supplied by the user, now in `.env.local`. Confirmed functional (a real token was minted and returned the expected capability scoping).
4. **No git commits exist** — unchanged, long-standing. Still true; not required for local dev/verification, only for eventually pushing to a repo and deploying.
5. **The app has never been deployed to Vercel** — the `pocket-party` Vercel project exists (created this session) but `vercel deploy` has never been run against it, and Clerk/Ably env vars have not been added to Vercel's own environment variable store yet (only Neon's, via the marketplace auto-connect).
6. **No real browser click-through or two-person live match has happened** — the curl-level smoke test above is necessary but not sufficient; see "Next three recommended actions."

## Assumptions made this session (label: Inferred, not verified against a live system)

- Assumed the user's "you can do the vercel one urself" instruction authorized creating a new Vercel project and a billed-but-free-tier Neon resource under their account — a real external action, not just a local file edit. Proceeded on the reasonable reading that this was the explicit ask, but this is the kind of action that's hard to fully undo (the project/database now exist in their account) — flagging explicitly rather than treating it as equivalent to a local code change.
- Assumed the Ably "root" key (labeled by the user as `root`) rather than the "subscribe"-only key was the correct one for `ABLY_API_KEY`, since `src/lib/realtime/ably-server.ts` needs to mint tokens with publish/subscribe/presence capability, which a subscribe-only key cannot grant. Confirmed correct by the successful token-mint test — a subscribe-only key would have failed that call.

## Temporary decisions made this session

None architectural — provisioning real infrastructure and fixing a real bug in a build script are not new design decisions requiring a `DECISIONS.md` entry (the `db:seed` fix preserves the existing `server-only` boundary rather than changing it).

## Next three recommended actions

1. **Run a real two-browser manual click-through** using `TESTING.md`'s smoke-test checklist — create a room in one browser, join from a second (incognito or a different browser), ready up, and play at least one full match of Grid Three, confirming both clients see each other's moves live via Ably. This is the first thing that would prove real-time sync actually works end-to-end, which the curl-level test above cannot show.
2. **Run `npm run test:e2e`** now that a dev server can actually boot against real credentials — see what passes/fails for real for the first time in this project's history.
3. **When ready to deploy:** add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `ABLY_API_KEY` to the `pocket-party` Vercel project's environment variables (Production + Preview) — they currently exist only in local `.env.local`, not in Vercel's own env store — then run `vercel deploy` (or push to a connected git repo, once one exists).

## Verification required before continuing any new feature work

Normal engineering care applies (typecheck/lint/test/build after any change, update memory docs, don't casually touch the security-sensitive files listed in `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW"). One new item specific to this session: **never write a real secret value (the Clerk secret key, the Ably API key, the Neon connection string) into any memory doc** — this file and every other one deliberately describe *that* credentials exist and *what* was tested, never the values themselves. `.env.local` is the only place they belong, and it's gitignored.
