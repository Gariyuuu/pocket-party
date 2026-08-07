# DEPLOYMENT.md

**Current state: not deployed anywhere.** No Vercel project is linked, no domain exists, no production URL exists, and there are no git commits (see `PROJECT_STATE.md`). Everything below describes the *intended* process.

## Hosting platform

A single Vercel project — the Next.js app. No separate Worker, no second deploy step (see `DECISIONS.md` D-018 for what changed: this used to also require a Cloudflare Worker deploy, before the realtime transport moved to Ably). Framework preset: Next.js (auto-detected, no custom build command needed).

## Project config

- **Build command:** `next build` (default, via `npm run build`).
- **Install command:** `npm install` (default — `package-lock.json` present, no other lockfile).
- **Output:** standard Next.js server output (full SSR/serverless, not a static export).
- **Runtime:** Node.js, version not pinned anywhere in the repo (no `.nvmrc`, no `engines` field) — Vercel's own default for the Next.js version in use would apply. **Needs confirmation** on a real deploy.

## Environment variables to set

Vercel Settings → Environment Variables (Production + Preview):

| Variable | Required | Sensitive |
|---|---|---|
| `DATABASE_URL` | Yes | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | No |
| `CLERK_SECRET_KEY` | Yes | Yes |
| `ABLY_API_KEY` | Yes | **Yes — anyone with this key can mint a token claiming to be any profile** |
| `CRON_SECRET` | Optional but recommended | Yes, in the sense that omitting it leaves `/api/cron/cleanup` publicly callable (low-severity — see `SECURITY.md`) |

See `.env.example` for the full comment-annotated list.

## Domains

None configured — no custom domain, not even a default `*.vercel.app` domain has ever been generated (no project exists yet).

## Preview vs. production deploy flow

Standard Vercel Git-integration flow (once a repo exists and is connected): pushes to non-production branches get Preview deployments, pushes to the production branch get a Production deployment. **Not yet applicable** — there is no git remote and no Vercel project.

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

- **`vercel.json`** defines one cron: `GET /api/cron/cleanup` on schedule `"0 * * * *"` (hourly, on the hour) — reclaims idle rooms from `live_rooms`. Vercel picks this up automatically on deploy, no dashboard step needed. **Verify your Vercel plan actually supports hourly cron frequency before relying on it** — some tiers restrict this; if hourly isn't available, loosen the schedule (idle rooms just accumulate slightly longer in the meantime, nothing breaks).
- No webhooks are received or sent by this app.

## Known build failures / runtime limitations

- The app **will fail to boot** (dev or production) with a clear thrown error if `DATABASE_URL` (or Clerk's required keys, or `ABLY_API_KEY` once a route that needs it is hit) is absent — intentional fail-fast behavior, not a bug.
- `npm run build` currently succeeds cleanly (**Verified**, 2026-08-06 — 14 routes).
- Ably's client SDK is loaded from Ably's CDN via a `<script>` tag rather than an npm import (see `DECISIONS.md` D-018 for the Next.js/webpack incompatibility this works around) — if Ably's CDN is ever unreachable (a corporate firewall, an ad blocker, a CDN outage), room pages will stay stuck on "connecting" past `use-realtime-room.ts`'s 15-second wait, rather than failing fast with a clear error. Worth a follow-up UX pass once this is live-tested.

## Rollback procedure

Not established — there are no git commits and no prior deployments to roll back to or from. Once real deployments exist: standard Vercel rollback (redeploy a previous successful deployment from the dashboard).

## Deployment checklist (first-ever deploy)

1. `git init`/commit this project (currently has zero commits — see `PROJECT_STATE.md`; this is a decision the user needs to make, not something to do automatically).
2. Push to a GitHub repo — deploy the `pocket-party/` subfolder as its own project if working out of this multi-project `~/Projects` folder, not the parent.
3. Complete the database/Clerk/Ably setup steps above.
4. Import into Vercel, confirm Next.js framework auto-detection, add all env vars (Production + Preview).
5. Disable Vercel's default deployment-protection/SSO wall for new projects (Settings → Deployment Protection) so players without a Vercel account can open the site — a general gotcha across this developer's other projects, per the persistent memory system's `vercel_deployment_notes` entry.
6. Deploy.
7. Run through the manual smoke-test checklist in `TESTING.md` against the live deployment.

## Post-deployment verification

Same as the manual smoke-test checklist in `TESTING.md` — there is no separate deployment-specific verification beyond confirming the app is reachable at its Vercel URL and the same checklist passes there as it should locally.
