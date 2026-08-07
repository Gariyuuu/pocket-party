import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  smallint,
  jsonb,
  timestamp,
  numeric,
  unique,
  check,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Drizzle schema for Neon Postgres — the replacement for
 * supabase/migrations/*.sql. Differences from the Supabase-era schema, all
 * deliberate (see DECISIONS.md D-010 and D-012):
 *
 * - `profiles.id` is a plain generated uuid, decoupled from any auth
 *   provider. There is no `auth.users` table under Neon, so identity is
 *   resolved in application code (see src/lib/identity/) via `clerkUserId`
 *   (set once a guest links a real account) and `guestCookieId` (set from
 *   day one for every guest). A profile can have either, both, or — very
 *   briefly, mid-request — neither.
 * - No Row-Level Security anywhere. Neon has no auth.uid()/JWT wiring to
 *   drive RLS the way Supabase did, so every authorization check that used
 *   to be a `USING`/`WITH CHECK` clause is now explicit application code.
 * - No `security definer` trigger/function (`handle_new_user`,
 *   `cleanup_expired_rooms`, `leave_room`). Profile provisioning is now a
 *   plain TypeScript function (get-current-actor.ts) taking an explicit
 *   actor id instead of reading one from a session-scoped `auth.uid()`.
 * - **No `room_players`, `game_states`, or `match_actions` tables (D-012,
 *   Phase 3).** A room's live roster and in-progress match state collapse
 *   into a single `live_rooms` row (one JSONB blob per active room — see
 *   below) rather than several normalized tables. Neon's job otherwise
 *   narrows to the durable, cross-match aggregates a profile keeps forever:
 *   win/loss history (`matches` + `match_players`, written once per
 *   finished match, not updated live), achievements, recent opponents, and
 *   the leaderboard. `matches.roomId` (a FK to the original Supabase-era
 *   `rooms` table) became `matches.roomCode` (plain text, no FK, purely
 *   informational — "which room this was played in" was never load-bearing
 *   for anything but the live game).
 * - **`live_rooms` (D-018) replaces what a PartyKit/Cloudflare Durable
 *   Object's in-memory storage held before it.** Ably (the realtime
 *   transport now in use) is pure pub/sub with no compute or storage of its
 *   own, so the room/match state a stateless Next.js API route reads and
 *   writes on every action has to live somewhere durable between requests
 *   — this table, not a `rooms`/`room_players` normalization, since the
 *   shape it holds (`StoredRoomState`) was already a single object by the
 *   time Phase 3 designed it and there was no reason to split it back out.
 */

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique(),
  guestCookieId: text("guest_cookie_id").unique(),
  displayName: text("display_name").notNull(),
  avatarColor: text("avatar_color").notNull().default("violet"),
  isGuest: boolean("is_guest").notNull().default(true),
  totalWins: integer("total_wins").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  favoriteGameId: text("favorite_game_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Written once, when a match finishes (by the PartyKit Main durable object,
 * via finalizeMatch() in party/game.ts) — not a live/updated-during-play
 * row. `roomCode` is informational only (no FK — there's no `rooms` table
 * anymore; the room itself is ephemeral Durable Object state).
 */
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomCode: text("room_code"),
    gameId: text("game_id").notNull(),
    status: text("status", { enum: ["completed", "abandoned"] })
      .notNull()
      .default("completed"),
    seed: text("seed").notNull(),
    modifiers: jsonb("modifiers").notNull().default({}),
    winnerPlayerId: uuid("winner_player_id").references(() => profiles.id),
    isDraw: boolean("is_draw").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("matches_status_idx").on(table.status),
    check("matches_status_check", sql`${table.status} in ('completed', 'abandoned')`),
  ],
);

/**
 * A discovery INDEX, not a source of truth (Phase 3 Follow-up B, D-014) — the
 * `Main` durable object (party/game.ts) is still the only authoritative owner
 * of room state. This table exists purely so `/lobby` has something to query
 * for "which rooms are public and currently joinable right now," which no
 * longer has any equivalent since D-012 removed the `rooms` table. A row
 * exists here if and only if a room is currently public AND in its lobby
 * (not yet started) — the DO upserts on every relevant state change and
 * deletes the row the moment either condition stops holding (game starts,
 * visibility flips private, or the room closes). If this table and a DO's
 * real state ever disagree, the DO is right — treat a stale/missing listing
 * row as a UX gap (a room not showing up, or briefly showing up stale), not
 * a correctness bug, since nothing authorization-sensitive depends on it.
 */
export const publicRoomListings = pgTable("public_room_listings", {
  code: text("code").primaryKey(),
  selectedGameId: text("selected_game_id"),
  playerCount: integer("player_count").notNull().default(0),
  maxPlayers: smallint("max_players").notNull().default(4),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The live room/match state itself — one JSONB blob per active room,
 * holding exactly the `StoredRoomState` shape `src/lib/realtime/room-state.ts`
 * already operates on. This table exists because Ably (unlike the
 * PartyKit/Cloudflare Durable Object this replaced) is pure pub/sub — it has
 * no compute and no storage of its own, so the same "roster + in-progress
 * match state" that used to live in a Durable Object's in-memory storage
 * now has to live somewhere a stateless Next.js API route can read/write it
 * on every request. See DECISIONS.md D-018 for the full reasoning behind
 * dropping Cloudflare for Ably. A row is deleted once its room closes or
 * goes idle (see `src/app/api/cron/cleanup/route.ts`) — this was never
 * meant to be a durable table the way `matches`/`match_players` are.
 */
export const liveRooms = pgTable("live_rooms", {
  code: text("code").primaryKey(),
  state: jsonb("state").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matchPlayers = pgTable(
  "match_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    seat: smallint("seat").notNull(),
    result: text("result", { enum: ["win", "loss", "draw", "abandoned"] }),
    score: integer("score").notNull().default(0),
  },
  (table) => [
    unique("match_players_match_player_unique").on(table.matchId, table.profileId),
    unique("match_players_match_seat_unique").on(table.matchId, table.seat),
    index("match_players_match_id_idx").on(table.matchId),
    index("match_players_profile_id_idx").on(table.profileId),
    check(
      "match_players_result_check",
      sql`${table.result} in ('win', 'loss', 'draw', 'abandoned')`,
    ),
  ],
);

export const achievements = pgTable("achievements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("trophy"),
});

export const profileAchievements = pgTable(
  "profile_achievements",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.achievementId], name: "profile_achievements_pk" }),
    index("profile_achievements_profile_id_idx").on(table.profileId),
  ],
);

export const recentPlayers = pgTable(
  "recent_players",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    opponentId: uuid("opponent_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lastPlayedAt: timestamp("last_played_at", { withTimezone: true }).notNull().defaultNow(),
    timesPlayed: integer("times_played").notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.opponentId], name: "recent_players_pk" }),
    check("recent_players_not_self_check", sql`${table.profileId} <> ${table.opponentId}`),
    index("recent_players_profile_id_idx").on(table.profileId, table.lastPlayedAt.desc()),
  ],
);

/** win_rate is a Postgres generated column, portable as-is from the Supabase-era migration — Neon is plain Postgres. */
export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    gameId: text("game_id").notNull(),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    gamesPlayed: integer("games_played").notNull().default(0),
    winRate: numeric("win_rate", { precision: 5, scale: 4 }).generatedAlwaysAs(
      sql`case when games_played = 0 then 0 else round(wins::numeric / games_played, 4) end`,
    ),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.gameId], name: "leaderboard_entries_pk" }),
    index("leaderboard_entries_game_wins_idx").on(table.gameId, table.wins.desc()),
  ],
);
