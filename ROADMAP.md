# ROADMAP.md

No time estimates are given anywhere in this document — none exist in the repository, and this audit will not invent any.

## Current milestone: Live verification (partially done — API-level only)

- **Objective:** confirm the already-built platform actually works against real Neon/Clerk/Ably credentials and in a real browser, with real network conditions.
- **Priority:** Highest — blocks everything else.
- **Status:** Partially done. `curl`-level smoke tests (guest identity, room join/leave, Ably token minting, `/leaderboard`, `/profile`, `/room/[code]`) pass against both localhost and the live production URL. **Still not done:** a real human browser click-through, two independent browser clients actually exchanging live Ably events, and `npm run test:e2e` (never run).
- **Dependencies:** none (Neon/Clerk/Ably all have free tiers) — all provisioned and live.
- **Difficulty:** Low-to-medium (mostly configuration and manual testing, not new code) — medium if the first live run surfaces real bugs in the never-tested Ably-token-auth/channel-scoping layer.
- **Risk:** Medium — this is exactly the kind of step where a static-analysis-clean codebase can still fail in ways `tsc`/`eslint`/`vitest` can't catch (Ably token-scoping edge cases, reconnection/CDN-load behavior, race conditions between the initial state fetch and the first channel event).
- **Definition of done:** every item in `TESTING.md`'s manual smoke-test checklist passes; the Playwright e2e specs pass against the Ably-based flow.

## Next milestone: First real deployment — DONE

- **Objective:** get the app live at a real, shareable URL.
- **Status:** **Done.** Live at https://pocket-party-eta.vercel.app (Vercel project `pocket-party`), deployed via `vercel deploy --prod`. A git repo, an initial commit plus follow-up commits, and a GitHub remote (`origin` → `github.com/Gariyuuu/pocket-party.git`) now exist too — see `PROJECT_STATE.md` for exact current git state (verify with `git log`/`git status` rather than trusting a hash frozen here). The Vercel project is not yet connected to the repo via Git integration, so deploys are still manual, not push-triggered — see `DEPLOYMENT.md`.
- **Remaining follow-up:** connect the GitHub repo to the Vercel project for auto-deploy-on-push (see `TASKS.md`).

## MVP completion

By this audit's read of the code, **the MVP is already feature-complete** — all 22 games (the original 10, plus Mini Golf and Word Bites, plus Sea Battle/Checkers/Chess/Darts/Cornhole, plus Reversi/Dots and Boxes/Yahtzee/Mancala/Trivia Blitz, added across sessions after live verification began), multiplayer, accounts/progression, and polish (icon/patch-notes/theme-wheel, plus a from-scratch ambient-music rewrite) exist and pass static checks. Deployment has since happened and the live site has been redeployed and confirmed (via `curl`) to serve all 22 games — see `PROJECT_STATE.md`. What's between "feature-complete" and "MVP done" is exclusively finishing the live-verification milestone above (a real human browser click-through and `npm run test:e2e`), not new feature work or another redeploy.

## Post-MVP (candidate next work, not yet started, not yet prioritized by the user)

- Address the remaining security/scale gaps documented in `SECURITY.md`'s "Recommended fixes" (structured error logging/monitoring, distributed rate limiting if cross-room abuse ever becomes a concern, confirming a social sign-in provider's Clerk-dashboard setup if one is offered).
- Fill the remaining test coverage gaps in `TESTING.md` (direct tests for `POST /api/rooms/[code]/action`'s I/O shell, real Ably `"broadcast"`-passthrough coverage for Orb Hockey/Quick Draw, Playwright e2e specs for the 12 games added after the original suite — the original 10 games all have one, tests for `finalize-match.ts`/`achievements.ts`).

## Long-term ideas / optional improvements

None are documented anywhere in the repository beyond what's already been acted on (no README "future ideas" section, no TODO comments, no design doc). The user has already asked for and received three rounds of additional games (Mini Golf/Word Bites, then Sea Battle/Checkers/Chess/Darts/Cornhole, then Reversi/Dots and Boxes/Yahtzee/Mancala/Trivia Blitz) plus a from-scratch ambient-music rewrite — if there are ideas for a 23rd game, additional achievements, or other platform features, they have not yet been captured in this repo and should be added to this section once stated, not invented now.

## Out-of-scope (explicitly, by current design)

- **Admin panel / moderation tools** — no role system exists to support one; would be new architecture, not an extension of existing code.
- **Payments/monetization** — no payment integration exists or is referenced anywhere.
- **Theme wheel inside game boards** — the theme-pack system was deliberately scoped to landing/lobby/pre-game-lobby only (see `FEATURES.md`); extending it into game boards would be a scope expansion, not a bug fix.
- **Cross-instance-safe rate limiting** — deliberately deferred (see `DECISIONS.md` D-007) until the app actually needs to scale past one instance/region.
