# ROADMAP.md

No time estimates are given anywhere in this document — none exist in the repository, and this audit will not invent any.

## Current milestone: Live verification (not yet started)

- **Objective:** confirm the already-built platform actually works against real Neon/Clerk/Ably credentials and in a real browser, with real network conditions.
- **Priority:** Highest — blocks everything else.
- **Status:** Not started.
- **Dependencies:** none (Neon/Clerk/Ably all have free tiers).
- **Difficulty:** Low-to-medium (mostly configuration and manual testing, not new code) — medium if the first live run surfaces real bugs in the never-tested Ably-token-auth/channel-scoping layer.
- **Risk:** Medium — this is exactly the kind of step where a static-analysis-clean codebase can still fail in ways `tsc`/`eslint`/`vitest` can't catch (Ably token-scoping edge cases, reconnection/CDN-load behavior, race conditions between the initial state fetch and the first channel event).
- **Definition of done:** every item in `TESTING.md`'s manual smoke-test checklist passes; the Playwright e2e specs pass against the Ably-based flow.

## Next milestone: First real deployment

- **Objective:** get the app live at a real, shareable URL.
- **Priority:** High, immediately after live verification.
- **Status:** Not started (no git commits, no Vercel project).
- **Dependencies:** Current milestone must be done first — deploying an unverified backend integration just moves the same unknowns to production.
- **Difficulty:** Low — `README.md`'s "Deploying to Vercel" section and this repo's `DEPLOYMENT.md` already document every step precisely.
- **Risk:** Low, given the existing documentation, provided the Deployment Protection wall is remembered (a known gotcha called out in both this repo's README and the developer's own cross-project memory notes).
- **Definition of done:** the app is reachable at a public Vercel URL; the smoke-test checklist passes there too.

## MVP completion

By this audit's read of the code, **the MVP is already feature-complete** — all 10 games, multiplayer, accounts/progression, and polish (icon/patch-notes/theme-wheel) exist and pass static checks. What's between "feature-complete" and "MVP done" is exclusively the two milestones above (live verification + first deployment), not new feature work.

## Post-MVP (candidate next work, not yet started, not yet prioritized by the user)

- Address the remaining security/scale gaps documented in `SECURITY.md`'s "Recommended fixes" (structured error logging/monitoring, distributed rate limiting if cross-room abuse ever becomes a concern, confirming a social sign-in provider's Clerk-dashboard setup if one is offered).
- Fill the remaining test coverage gaps in `TESTING.md` (direct tests for `POST /api/rooms/[code]/action`'s I/O shell, real Ably `"broadcast"`-passthrough coverage for Orb Hockey/Quick Draw — e2e coverage for all 10 games now exists, but neither of those two drives an actual paddle-drag/pen-stroke, tests for `finalize-match.ts`/`achievements.ts`).

## Long-term ideas / optional improvements

None are documented anywhere in the repository (no README "future ideas" section, no TODO comments, no design doc). **Not fabricated here** — if the user has ideas for an 11th game, additional achievements, or platform features, they have not yet been captured in this repo and should be added to this section once stated, not invented now.

## Out-of-scope (explicitly, by current design)

- **Admin panel / moderation tools** — no role system exists to support one; would be new architecture, not an extension of existing code.
- **Payments/monetization** — no payment integration exists or is referenced anywhere.
- **Theme wheel inside game boards** — the theme-pack system was deliberately scoped to landing/lobby/pre-game-lobby only (see `FEATURES.md`); extending it into game boards would be a scope expansion, not a bug fix.
- **Cross-instance-safe rate limiting** — deliberately deferred (see `DECISIONS.md` D-007) until the app actually needs to scale past one instance/region.
