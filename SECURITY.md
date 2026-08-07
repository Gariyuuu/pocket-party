# SECURITY.md

A defensive review of this codebase's security posture, as read from the code — **not** a penetration test, and no destructive or intrusive testing was performed. Nothing here has been validated against a live, deployed instance, since none exists (no Neon `DATABASE_URL`, Clerk keys, or Ably API key yet).

## Authentication boundaries

- Two identity mechanisms, resolved by one function (`src/lib/identity/get-current-actor.ts`): a real Clerk session, or a hand-rolled `guest_id` httpOnly cookie (`src/lib/identity/guest-cookie.ts`, `crypto.randomUUID()`, 1-year expiry) for no-signup guest play. Both are ensured on every request by `src/middleware.ts`.
- The guest cookie is **not a secret** — it's an identity handle, not a credential; it grants no permission by itself, only a lookup key into `profiles.guestCookieId`.
- Account upgrade: `get-current-actor.ts` claims an existing, still-unclaimed guest profile (`clerkUserId is null`) onto a new Clerk sign-up rather than creating a fresh empty one — preserving stats across the guest→account transition. A guest profile already claimed by a *different* Clerk user is explicitly never re-claimed (checked, not just assumed) — removing this check would let one browser's guest history be silently reassigned across two different real accounts if they ever shared a device. **Do not simplify this away** (see `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW").
- Every room/match action (`POST /api/rooms/[code]/action`) runs in the same Next.js runtime as Clerk, so it resolves identity via `getCurrentActor()` directly — no separate token-verification scheme is needed just to know who's calling, unlike the Cloudflare-Worker-based design this replaced (see `DECISIONS.md` D-018).

## Ably connection auth (a separate concern from "who is this request")

- `GET /api/ably-token` resolves the caller's identity server-side (same `getCurrentActor()` as any other route), then mints a short-lived Ably `TokenRequest` (`src/lib/realtime/ably-server.ts`) scoped to exactly one room's channel (`room:<code>`), with the caller's `profileId` set as the Ably `clientId`. Ably itself signs and verifies this — no hand-rolled crypto involved.
- A client can only subscribe to or publish on a room's channel if it holds a token scoped to that specific channel — an arbitrary client can't listen in on or inject messages into a room it was never issued a token for.
- **`ABLY_API_KEY`** is the single most security-sensitive value in this stack: anyone who has it can mint a token claiming to be any `profileId`, for any room. It's used only server-side (`src/lib/realtime/ably-server.ts`, `import "server-only"`) — the browser only ever sees short-lived, narrowly-scoped tokens minted from it, never the key itself.

## Authorization boundaries

There is no RLS equivalent under Neon (no `auth.uid()`/JWT wiring to drive one) — every authorization check that used to be a Postgres policy is now explicit application code, in two places:

1. **`src/lib/realtime/room-state.ts`** — the boundary for everything routed through the room action route. Every mutating function has an explicit permission check before it takes effect: `startMatch`/`selectGame`/`setVisibility`/`setModifiers`/`rematch`/`returnToLobby` all require the caller to be `state.hostId`; `applyGameAction` requires the caller to appear in the *match's own participant snapshot* (`StoredMatch.participants`, captured at match start — not the live roster, since `leaveRoom()` removes a player from the roster entirely and a departed player's match record must still finalize correctly); the Orb Hockey `score-goal` action is additionally rejected unless the caller is the fixed seat-1 player, preventing either client in a real-time physics disagreement from just submitting whichever goal outcome favors them.
2. **`src/app/api/profile/route.ts`** — the boundary for the one other Neon write path. `PATCH` resolves the caller's identity server-side and only ever updates that same row; the request body has no way to specify a different target profile.

## Protected routes

No route or room action requires a "real" (non-guest) account — every one is reachable by any resolved identity, guest or not. There is no role-based access control anywhere in the codebase (no `admin` role, no elevated-privilege panel). "Protection" means "are you the host / a participant of this specific room or match," not "are you logged in with a specific role."

## Secret handling

- **`ABLY_API_KEY`:** see "Ably connection auth" above — the highest-sensitivity value in the current stack.
- **`CLERK_SECRET_KEY`:** server-only, used by Clerk's own SDK inside `middleware.ts`/`get-current-actor.ts`. Never prefixed `NEXT_PUBLIC_`.
- **`DATABASE_URL`:** the Neon connection string. Server-only (`src/lib/db/client.ts` imports `server-only`) — never imported from a `"use client"` file.
- **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`:** intentionally public — a publishable key is meaningless without the matching secret key.
- No hardcoded secrets, API keys, tokens, or passwords were found anywhere in `src/` or config files during this pass. `.env.local` is gitignored; `.env.example` contains only empty placeholders (**Verified** by reading its actual contents).

## Client-exposed variables

Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. No other environment variable is exposed client-side — notably, `ABLY_API_KEY` never reaches the browser; the client SDK (loaded from Ably's CDN, see `DECISIONS.md` D-018) only ever handles tokens minted server-side.

## Input validation

- Zod schemas at every external-input boundary found: `nicknameSchema` (`lib/validation/nickname.ts`, used by both the `"join"` action and `PATCH /api/profile`), the action envelope shape validated inside `room-state.ts`'s `applyGameAction`.
- Server-side validation is authoritative everywhere checked — e.g. Word Clash's word-length/dictionary check happens in `room-state.ts`, not trusted from the client.
- The `"action"` request's `sequence` is compared against the server's own stored sequence before being trusted — a mismatch is rejected as `stale_sequence` rather than silently applied, the optimistic-concurrency guard against a client acting on outdated state.

## Injection risks (SQLi / XSS / CSRF)

- **SQLi:** no raw SQL string concatenation found — all database access goes through Drizzle's query builder (parameterized under the hood). Low risk as coded.
- **XSS:** standard React JSX escaping applies throughout; no `dangerouslySetInnerHTML` usage found in the audited component set. Low risk as coded, not separately fuzzed.
- **CSRF:** `PATCH /api/profile` and `POST /api/rooms/[code]/action` have no explicit CSRF token — both rely on Clerk's session cookie `SameSite` defaults for authenticated requests (guest requests rely on the `guest_id` cookie's own `SameSite: "lax"` setting). **Needs confirmation** if this app's threat model ever requires a stronger guarantee than the cookie defaults provide.

## File upload risks

None — there is no file upload feature anywhere in the app. Not applicable.

## Webhook verification

None — the app receives no webhooks from any external service (including from Clerk — no `user.created` webhook is used; profile provisioning happens lazily, synchronously, inside `get-current-actor.ts` instead, see `DECISIONS.md` D-011).

## Rate limiting

- Implemented (`src/lib/multiplayer/rate-limit.ts`, reused as-is inside `POST /api/rooms/[code]/action`) for: match actions (30/10s per room+profile, plus a Tile-Rush-specific 8/1s tighter window on `clear-tile`), and `"join"` actions (5/10s per room+profile).
- **The `"join"` limit only covers same-room spam, not cross-room code enumeration** — it's keyed by `join:<room-code>:<profileId>`, so it can't throttle an attacker trying many *different* room codes. Room codes being guessable was always a low-severity concern here (no sensitive data is exposed by a bare join, per "Protected routes" above).
- **A real, honest regression from this session's rework (see `DECISIONS.md` D-018): the in-memory rate limiter is now scoped per-serverless-function-instance, not per-room the way it was when it lived inside a long-lived Cloudflare Durable Object.** On Vercel's serverless model, "in-memory" only persists for the lifetime of one warm function instance — a burst of requests hitting different cold/warm instances won't share limiter state the way a single per-room Durable Object guaranteed. Acceptable at current scale (a casual friends-game app), but a real limitation worth revisiting before assuming this limiter provides strong protection.
- No rate limiting on `GET /api/rooms/[code]`, `GET /api/ably-token`, `PATCH /api/profile`, or `GET /api/public-rooms` beyond whatever Clerk/Vercel apply by default.

## Admin access

None exists. Not applicable — there is no admin panel, no admin role, no privileged UI anywhere in this codebase.

## Database policies

Full detail in `DATABASE.md`. Summary risk assessment:

- **No RLS, by design** — Neon has no `auth.uid()`/JWT wiring to drive one. Every check that used to be a Postgres policy is now application code (see "Authorization boundaries" above) — a regression risk if a future change adds a new Neon write path without adding a matching permission check next to it.
- **`profiles` has no read restriction at the database layer** (any server-side caller can read any row) — a deliberate tradeoff needed for leaderboard/opponent-nickname features. There is no privacy boundary on `displayName`/`avatarColor`/win-loss stats between any two users of the app, by design.
- **`public_room_listings` is a discovery index, not authoritative** — if it and `live_rooms` ever disagree, `live_rooms` is right; a stale/missing listing is a UX gap, not a correctness/security bug, since nothing authorization-sensitive depends on it.
- **`live_rooms` is the one table holding genuinely live, mutable state** (a room's roster and in-progress match) — it has no RLS either, same reasoning as everywhere else in this schema, but it's worth naming explicitly since a bug in the action route's own permission checks (not a database-level policy) is the *only* thing standing between a request and modifying any room's live state.

## Logging of sensitive data

No external APM/monitoring service is connected (no Sentry/Datadog). There is a single structured-logging choke point, `src/lib/log.ts`'s `logError(context, error, meta?)` — isomorphic across the Next.js server and the browser (Web-standard-only, no Node-specific APIs). It formats every error as JSON (`timestamp`, `context`, `message`, `stack`, optional `meta`) to `console.error`, visible in Vercel's function logs for every API route and `src/app/error.tsx`'s boundary. Every call site goes through this one function, so wiring up a real APM later is a one-file change, not a repo-wide find-and-replace. `meta` payloads are limited to non-sensitive identifiers (room codes, match ids) by convention at each call site — nothing in `logError` itself redacts or validates that, so any future call site must keep that discipline manually (no user PII, no tokens/secrets, ever passed as `meta`).

## Dependency concerns

- No `npm audit` was run during this pass — **Needs confirmation**; recommend running `npm audit` before any real deployment.

## Production security gaps (recommended fixes)

1. **Wire the structured logging in `src/lib/log.ts` to a real APM/monitoring service** (e.g. Sentry) before real users hit this in production — the consistent, structured `logError()` choke point exists and every real call site uses it, but its output only reaches `console.error` today; nothing pages anyone or persists past Vercel's own log retention window.
2. **Reconsider the rate limiter's storage** if this ever needs to scale past a single friends-game's traffic — see "Rate limiting" above for why the per-serverless-instance scoping is weaker than it used to be. A Neon-backed or Redis-backed counter would restore a shared, reliable limit.
3. **Verify the Ably token/channel-scoping auth path against a real deployment** — everything above is a reading of intent from code, not an observed guarantee; a real Ably API key and app are required to confirm token capability scoping actually restricts a client to only its own room's channel in practice.
4. **Consider CSRF posture explicitly for `PATCH /api/profile` and the room action route** once real accounts/anything-valuable are at stake — currently relies entirely on cookie `SameSite` defaults.
5. **Add rate limiting to `GET /api/ably-token`** — currently unthrottled beyond Clerk/Vercel defaults, and every room-page load calls it.

No destructive testing, unauthorized access attempts, or exploit development were performed in producing this document.
