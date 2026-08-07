# API_REFERENCE.md

All internal API routes are Next.js Route Handlers under `src/app/api/`. No route has a live/tested example exchange (no Neon/Clerk/Ably credentials exist yet) — shapes below are derived from the Zod/TypeScript types in the code, not an observed exchange.

---

## Room and match routes

### `GET /api/rooms/[code]`

- **Source:** `src/app/api/rooms/[code]/route.ts`
- **Purpose:** the initial-state fetch every client makes once on mount, before its Ably subscription is even established — replaces what a Cloudflare Durable Object's `onConnect` used to send automatically the instant a WebSocket connected (see `DECISIONS.md` D-018).
- **Auth:** none required — read-only, and a room with no state yet is indistinguishable from an empty lobby either way.
- **Request body:** none (`GET`).
- **Response (200):** `RoomStateEvent` — `{ room, players, match, gameState, sequence, updatedAt }`. A room with no `live_rooms` row yet (nobody has ever joined it) returns a fresh empty-lobby state **without writing anything** — the first real write happens on `"join"`.
- **Side effects:** none.

### `POST /api/rooms/[code]/action`

- **Source:** `src/app/api/rooms/[code]/action/route.ts`
- **Purpose:** the single endpoint every room/match action goes through — join, ready-up, game selection, in-game moves, rematch, leave, disconnect. Loads the room's state from Neon's `live_rooms` table, delegates to `src/lib/realtime/room-state.ts`'s pure reducer, saves the result, publishes it to the room's Ably channel, and returns it directly to the caller.
- **Auth:** resolved via `getCurrentActor()` (Clerk session or guest cookie) — the request body never specifies who's acting, only what action to take.
- **Rate limits:** `"join"` — 5/10s per room+profile. `"action"` — 30/10s per room+profile, plus a Tile-Rush-specific 8/1s limit on `clear-tile`.
- **Request body** (`RoomActionRequest`, a discriminated union on `type`):
  ```ts
  | { type: "join"; nickname: string; avatarColor: AvatarColorId }
  | { type: "set-ready"; isReady: boolean }
  | { type: "select-game"; gameId: GameId }
  | { type: "set-visibility"; isPublic: boolean }
  | { type: "set-modifiers"; modifiers: Record<string, unknown> }
  | { type: "start" }
  | { type: "action"; actionType: string; payload: Record<string, unknown>; sequence: number }
  | { type: "rematch" }
  | { type: "return-to-lobby" }
  | { type: "leave" }
  | { type: "disconnect" }
  ```
- **Response (200):** `RoomStateEvent` (same shape as the `GET` route above) — the caller applies this directly; every *other* connected client receives an identical payload via Ably instead.
- **Errors (400):** `{ error: RoomActionError, message: string }` — `room_closed`, `room_full`, `not_host`, `not_participant`, `wrong_state`, `game_unavailable`, `player_count`, `not_all_ready`, `nickname_unavailable`, `wrong_turn`, `wrong_player`, `invalid_move`, `duplicate_action`, `stale_sequence` (client's `sequence` doesn't match the server's — client should trust the next state event, not retry blindly), `match_not_active`, `malformed_payload`. **(429):** `rate_limited`. **(500):** `internal_error` (logged via `src/lib/log.ts`).
- **Per-game special-casing inside the `"action"` case** (in `room-state.ts`'s `applySpecialCasing`, not spread across separate routes):
  - **Word Clash:** `submit-word` requires length ≥3 and a real-dictionary check (async); `advance-round` is rejected if `now < roundEndsAt`.
  - **Tank Tactics:** `fire` gets `now` injected; `skip-turn` rejected until `turnEndsAt`.
  - **Orb Hockey:** `score-goal` is rejected unless the caller is the fixed seat-1 player; `start-serve` rejected until `countdownEndsAt`.
  - **Quick Draw:** `submit-guess` gets `now` injected; `advance-round` rejected until `roundEndsAt` unless every non-drawing player has already guessed.
  - **Tile Rush:** `clear-tile` has its own tighter rate limit; `end-round` rejected until `roundEndsAt`.
- **Side effects:** writes `live_rooms`; syncs `public_room_listings`; on match end, calls `finalizeMatch()` (writes `matches`/`match_players`/`profiles`/`leaderboard_entries`, best-effort `recent_players` + achievements).

---

## Identity / profile routes

### `GET /api/ably-token`

- **Source:** `src/app/api/ably-token/route.ts`
- **Purpose:** resolves (and provisions, if needed) the caller's `profiles` row, then mints an Ably `TokenRequest` scoped to exactly one room's channel (`?code=` query param), with the caller's `profileId` set as the Ably `clientId`. Called by `use-realtime-room.ts` as Ably's own `authCallback` on every (re)connection attempt.
- **Auth:** implicit — resolves via `getCurrentActor()`.
- **Request body:** none (`GET`). Query param: `code` (required, must be a plausible 6-character room code).
- **Response (200):** an Ably `TokenRequest` object (`keyName`, `nonce`, `mac`, `capability`, `clientId`, etc. — signed server-side, verified by Ably itself).
- **Errors (400):** `{ error: "malformed_payload", message: string }` if `code` is missing/invalid. **(500):** `internal_error`.
- **Side effects:** provisions a `profiles` row on first sight of a new Clerk user or guest cookie; claims an unclaimed guest profile onto a new Clerk sign-up if one exists for the same browser.

### `PATCH /api/profile`

- **Source:** `src/app/api/profile/route.ts`
- **Purpose:** the only write path for a profile's `displayName`/`avatarColor` — there is no client-side Neon access at all, so `profile-header.tsx`'s edit form goes through this route.
- **Auth:** implicit — identity resolved server-side via `getCurrentActor()`; the request body can never specify *whose* profile to update, only *what* to change on the caller's own.
- **Request body:** `{ "displayName"?: string, "avatarColor"?: string }` — at least one field required.
- **Response (200):** `{ "profile": Profile }` (the updated row).
- **Errors (400):** `{ error: "malformed_payload" }` (empty body, or neither field present/valid type); `{ error: "invalid_display_name", message: string }` (fails `nicknameSchema`). **(500):** `internal_error`.
- **Side effects:** `update profiles set ... where id = <caller's own profileId>`.

---

## Discovery / maintenance routes

### `GET /api/public-rooms`

- **Source:** `src/app/api/public-rooms/route.ts`
- **Purpose:** backs `/lobby`'s "browse public rooms" list. Reads `public_room_listings`, a discovery index kept in sync by the action route (not authoritative — see `DECISIONS.md` D-015).
- **Auth:** none — plain unauthenticated read.
- **Response (200):** `{ "rooms": Array<{ code, selectedGameId, playerCount, maxPlayers, updatedAt }> }`, ordered by `updatedAt desc`, capped at 50.

### `GET /api/cron/cleanup`

- **Source:** `src/app/api/cron/cleanup/route.ts`
- **Purpose:** scheduled reclamation of idle rooms. Triggered by Vercel Cron per `vercel.json` (hourly). There's no per-room timer primitive to replace this with the way a Durable Object's `onAlarm` was — see `DECISIONS.md` D-018.
- **Auth:** optional `CRON_SECRET` bearer check — if the env var is set, requires `Authorization: Bearer <CRON_SECRET>` (which Vercel attaches automatically to its own cron requests); if unset, the route is open to anyone who hits the URL (acceptable for local dev, a documented gap in production — see `SECURITY.md`).
- **Response (200):** `{ "deletedRooms": number }`.
- **Errors (401):** wrong/missing bearer token when `CRON_SECRET` is set. **(500):** `internal_error`.
- **Side effects:** deletes `live_rooms` rows idle past 4 hours (`updated_at` cutoff) and their `public_room_listings` entries.

---

## Ably channels (not a Route Handler, but part of the effective API surface)

Every room has exactly one Ably channel, `room:<code>`, carrying two event types — listed here because a reviewer auditing "every externally-reachable operation" should see them, even though neither is a Route Handler:

- **`"state"`** — published server-side (by the action route, via `src/lib/realtime/ably-server.ts`'s REST client) after every accepted action. Payload: `RoomStateEvent`, the same shape both `GET`/`POST` room routes above return.
- **`"broadcast"`** — published **directly client-to-client**, never touching this app's server. Payload: `{ channel: string; payload: unknown }`. Used by Orb Hockey (`"paddle"`, `"puck-sync"`, `"serve"`) and Quick Draw (`"stroke"`, `"clear"`) for high-frequency, never-persisted sync. Unvalidated by design — matches how Supabase Realtime Broadcast (the original mechanism this replaced) worked.

Access to a room's channel requires a token minted by `GET /api/ably-token` scoped to exactly that channel — an arbitrary client cannot subscribe to or publish on a room it hasn't been issued a token for.

## No external integrations

No payment API, no analytics API, no file storage API, no webhooks received or sent. The only outbound network calls this app makes are to Clerk (via its SDK), Neon (via the Drizzle HTTP driver), and Ably (via its REST client server-side, and its realtime client — loaded from Ably's CDN — in the browser).
