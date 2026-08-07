CREATE TABLE "achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text DEFAULT 'trophy' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"profile_id" uuid NOT NULL,
	"game_id" text NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"win_rate" numeric(5, 4) GENERATED ALWAYS AS (case when games_played = 0 then 0 else round(wins::numeric / games_played, 4) end) STORED,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_entries_pk" PRIMARY KEY("profile_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "live_rooms" (
	"code" text PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"seat" smallint NOT NULL,
	"result" text,
	"score" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "match_players_match_player_unique" UNIQUE("match_id","profile_id"),
	CONSTRAINT "match_players_match_seat_unique" UNIQUE("match_id","seat"),
	CONSTRAINT "match_players_result_check" CHECK ("match_players"."result" in ('win', 'loss', 'draw', 'abandoned'))
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_code" text,
	"game_id" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"seed" text NOT NULL,
	"modifiers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"winner_player_id" uuid,
	"is_draw" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_status_check" CHECK ("matches"."status" in ('completed', 'abandoned'))
);
--> statement-breakpoint
CREATE TABLE "profile_achievements" (
	"profile_id" uuid NOT NULL,
	"achievement_id" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_achievements_pk" PRIMARY KEY("profile_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text,
	"guest_cookie_id" text,
	"display_name" text NOT NULL,
	"avatar_color" text DEFAULT 'violet' NOT NULL,
	"is_guest" boolean DEFAULT true NOT NULL,
	"total_wins" integer DEFAULT 0 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"favorite_game_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "profiles_guest_cookie_id_unique" UNIQUE("guest_cookie_id")
);
--> statement-breakpoint
CREATE TABLE "public_room_listings" (
	"code" text PRIMARY KEY NOT NULL,
	"selected_game_id" text,
	"player_count" integer DEFAULT 0 NOT NULL,
	"max_players" smallint DEFAULT 4 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recent_players" (
	"profile_id" uuid NOT NULL,
	"opponent_id" uuid NOT NULL,
	"last_played_at" timestamp with time zone DEFAULT now() NOT NULL,
	"times_played" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "recent_players_pk" PRIMARY KEY("profile_id","opponent_id"),
	CONSTRAINT "recent_players_not_self_check" CHECK ("recent_players"."profile_id" <> "recent_players"."opponent_id")
);
--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_player_id_profiles_id_fk" FOREIGN KEY ("winner_player_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_achievements" ADD CONSTRAINT "profile_achievements_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_achievements" ADD CONSTRAINT "profile_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_players" ADD CONSTRAINT "recent_players_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_players" ADD CONSTRAINT "recent_players_opponent_id_profiles_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leaderboard_entries_game_wins_idx" ON "leaderboard_entries" USING btree ("game_id","wins" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "match_players_match_id_idx" ON "match_players" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_players_profile_id_idx" ON "match_players" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "matches_status_idx" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profile_achievements_profile_id_idx" ON "profile_achievements" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "recent_players_profile_id_idx" ON "recent_players" USING btree ("profile_id","last_played_at" DESC NULLS LAST);