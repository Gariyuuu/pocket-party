# DEPLOYMENT.md

**Current state: deployed and live.** Production URL: **https://pocket-party-eta.vercel.app** (Vercel project `pocket-party`, under `garywangsmes-8349s-projects`). No custom domain — the default `*.vercel.app` alias is what's in use. A git repo and a GitHub remote (`origin` → `github.com/Gariyuuu/pocket-party.git`) now exist (see `PROJECT_STATE.md`), but the Vercel project is **not yet connected** to it via Git integration — this deploy was, and every deploy so far has been, pushed directly via `vercel deploy --prod` from the local working directory; every future deploy needs `vercel deploy --prod` run manually until that connection is made. Everything below describes the actual current setup, confirmed working end-to-end via `curl` against the live URL (guest identity, room join/leave, Ably token minting — see `PROJECT_STATE.md`/`SESSION_LOG.md` for the exact commands and results).

## Hosting platform

A single Vercel project — the Next.js app. No separate Worker, no second deploy step (see `DECISIONS.md` D-018 for what changed: this used to also require a Cloudflare Worker deploy, before the realtime transport moved to Ably). Framework preset: Next.js (auto-detected, no custom build command needed).

## Project config

- **Build command:** `next build` (default, via `npm run build`).
- **Install command:** `npm install` (default — `package-lock.json` present, no other lockfile).
- **Output:** standard Next.js server output (full SSR/serverless, not a static export).
- **Runtime:** Node.js, version not pinned anywhere in the repo (no `.nvmrc`, no `engines` field) — Vercel's own default for the Next.js version in use would apply. **Needs confirmation** on a real deploy.

## Environment variables to set

**Already set**, in all three Vercel environments (Production, Preview, and Development — `vercel env ls` confirms all four below plus Neon's auto-provisioned vars appear in all three):

| Variable | Required | Sensitive | Source |
|---|---|---|---|
| `DATABASE_URL` (+ several other `PG*`/`POSTGRES_*` vars, unused by this app but harmless) | Yes | Yes | Auto-injected by Neon's Vercel Marketplace integration once connected to the project — not set manually |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | No | `vercel env add`, this session |
| `CLERK_SECRET_KEY` | Yes | Yes | `vercel env add`, this session |
| `ABLY_API_KEY` | Yes | **Yes — anyone with this key can mint a token claiming to be any profile** | `vercel env add`, this session |
| `CRON_SECRET` | Optional but recommended | Yes | Generated (`crypto.randomBytes(24).toString("hex")`) and set this session — `/api/cron/cleanup` is no longer publicly callable without it |

See `.env.example` for the full comment-annotated list. If any of these are ever rotated or removed, redeploy afterward — Vercel does not hot-reload env var changes into an already-running deployment.

## Domains

No custom domain. Production alias: **https://pocket-party-eta.vercel.app** (Vercel's own default `*.vercel.app` domain, auto-generated on first deploy). No deployment-protection/SSO wall is enabled — confirmed by an unauthenticated `curl` returning the real page, not a login redirect — so this did not need the manual "disable Deployment Protection" step some of this developer's other projects have needed (see the persistent memory system's `vercel_deployment_notes` entry); worth re-checking if it ever starts appearing, since Vercel's default has changed before.

## Preview vs. production deploy flow

**Not yet using Git integration** — a git remote exists now (`origin` → `github.com/Gariyuuu/pocket-party.git`, see `PROJECT_STATE.md`) but isn't connected to this Vercel project, so every deploy so far has been `vercel deploy --prod` run directly from the local working directory, not triggered by a push. Once the repo is connected to this Vercel project (a dashboard step, not yet done), the standard flow applies: pushes to non-production branches get Preview deployments, pushes to the production branch get a Production deployment automatically.

## Database setup steps (for a fresh environment)

1. Create a Neon project, copy its pooled connection string into `DATABASE_URL`.
2. Run `npm run db:migrate` to apply `drizzle/*.sql` against it (or `npm run db:generate` first if the schema has changed since the last generated migration).
3. Run `npm run db:seed` to populate the achievement catalog (`achievements` table).
4. Optional: `npm run db:studio` to browse the schema locally via Drizzle Studio.

## Clerk setup steps

1. Create a Clerk application, copy the publishable/secret keys into the env vars above.
2. No webhook needs configuring — profile provisioning happens lazily inside `get-current-actor.ts`, not via a Clerk webhook (see `DECISIONS.md` D-011).
3. If offering social sign-in providers, configure them in the Clerk dashboard — **not done anywhere in this repo's history as far as this pass can tell.**

## Ably setup steps

1. Create an Ably account and app — the free tier is enough for a casual friends-game's traffic (this was the entire point of switching to it — see `DECISIONS.md` D-018).
2. Copy an API key with subscribe/publish/presence capability from the Ably dashboard into `ABLY_API_KEY`.
3. No channel configuration needed — `src/lib/realtime/ably-server.ts` mints per-room-scoped tokens dynamically; nothing needs pre-registering in the Ably dashboard.
4. Nothing to deploy on Ably's side — it's a hosted service, not infrastructure this repo provisions.

## Storage setup

Not applicable — no file storage of any kind is used anywhere in this app.

## External service setup

Neon, Clerk, and Ably — see the three setup-steps sections above. No payment provider, no email provider (Clerk handles its own), no analytics service needs configuration.

## Scheduled jobs / webhooks

- **`vercel.json`** defines one cron: `GET /api/cron/cleanup` on schedule `"0 3 * * *"` (once daily, 3am UTC) — reclaims idle rooms from `live_rooms`. Vercel picks this up automatically on deploy, no dashboard step needed. **This was originally hourly** (`"0 * * * *"`) but the first real production deploy to this Vercel account's Hobby plan rejected it outright (`"Hobby accounts are limited to daily cron jobs... Upgrade to the Pro plan to unlock all Cron Jobs features"`) — not a warning, a hard deploy failure. Loosened to daily; idle rooms now accumulate for up to ~28 hours instead of ~5 before being swept, which is harmless (the same non-authoritative cleanup semantics apply, just less frequently) — see `SECURITY.md`/`DATABASE.md` for why a stale `live_rooms` row isn't a correctness issue. Upgrading to Pro would restore hourly if ever needed.
- No webhooks are received or sent by this app.

## Known build failures / runtime limitations

- The app **will fail to boot** (dev or production) with a clear thrown error if `DATABASE_URL` (or Clerk's required keys, or `ABLY_API_KEY` once a route that needs it is hit) is absent — intentional fail-fast behavior, not a bug.
- `npm run build` currently succeeds cleanly (**Verified**, 2026-08-06 — 14 routes).
- Ably's client SDK is loaded from Ably's CDN via a `<script>` tag rather than an npm import (see `DECISIONS.md` D-018 for the Next.js/webpack incompatibility this works around) — if Ably's CDN is ever unreachable (a corporate firewall, an ad blocker, a CDN outage), room pages will stay stuck on "connecting" past `use-realtime-room.ts`'s 15-second wait, rather than failing fast with a clear error. Worth a follow-up UX pass once this is live-tested.

## Rollback procedure

One production deployment exists so far (`dpl_EaT5DLcxxyj6cT6ycBv78C2hChGR`), so there's nothing to roll back *to* yet. Once a second production deploy happens: standard Vercel rollback via `vercel rollback` or promoting a previous deployment from the dashboard/`vercel promote`.

## Deployment checklist (first-ever deploy — completed this session)

1. ~~`git init`/commit this project~~ — **not done at the time of this deploy**, and turned out not to be a hard requirement for a first deploy: `vercel deploy --prod` uploads the local working directory directly, no git repo needed. A git repo, commits, and a GitHub remote now exist (see `PROJECT_STATE.md`) — added later, still not connected to this Vercel project via Git integration.
2. Provisioned Neon via Vercel's Marketplace integration (`vercel install neon`), which also required creating and linking the Vercel project itself (`vercel link`) — see `PROJECT_STATE.md`/`SESSION_LOG.md` for the exact commands.
3. Added `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY`/`ABLY_API_KEY`/`CRON_SECRET` via `vercel env add` to all three environments.
4. Ran `vercel deploy --prod` — **first attempt failed**: the Hobby plan rejected the hourly cron schedule outright (see "Scheduled jobs" above). Loosened `vercel.json` to a daily schedule, redeployed — succeeded.
5. Confirmed no deployment-protection/SSO wall is blocking public access (a `curl` to the production URL returned the real page, not a login redirect) — so no manual dashboard step was needed here, unlike some of this developer's other projects.
6. Ran an API-level smoke test directly against the live URL via `curl` (guest identity, room join/leave, Ably token minting) — all passed. **Not yet done: a real browser click-through** (`TESTING.md`'s manual smoke-test checklist) — see `PROJECT_STATE.md` for what's still open.

## Post-deployment verification

`TESTING.md`'s manual smoke-test checklist is the real verification and has **not** been run yet against the live URL — only an API-level `curl` smoke test has (see `PROJECT_STATE.md`/`SESSION_LOG.md`). Run the full checklist with two real browser windows against **https://pocket-party-eta.vercel.app** as the next step.
