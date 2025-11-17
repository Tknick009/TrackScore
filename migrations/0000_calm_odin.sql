CREATE TYPE "public"."board_type" AS ENUM('athlete-card-grid', 'athlete-card-single', 'attempt-tracker', 'live-timer', 'lane-visualization', 'standings-table', 'event-info', 'logo-banner');--> statement-breakpoint
CREATE TABLE "athlete_photos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" varchar NOT NULL,
	"meet_id" varchar NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"content_type" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_photos_athlete_id_unique" UNIQUE("athlete_id")
);
--> statement-breakpoint
CREATE TABLE "athletes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"athlete_number" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"team_id" varchar,
	"division_id" varchar,
	"bib_number" text,
	"gender" text,
	CONSTRAINT "athletes_meet_athlete_unique" UNIQUE("meet_id","athlete_number")
);
--> statement-breakpoint
CREATE TABLE "board_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"board_id" varchar NOT NULL,
	"theme_id" varchar,
	"overrides" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "board_configs_board_unique" UNIQUE("meet_id","board_id")
);
--> statement-breakpoint
CREATE TABLE "composite_layouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar,
	"name" varchar(255) NOT NULL,
	"description" text,
	"aspect_ratio" varchar(20) DEFAULT '16:9',
	"preview_url" text,
	"background_style" varchar(50) DEFAULT 'default',
	"base_theme" varchar(50) DEFAULT 'stadium',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "display_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"display_id" varchar NOT NULL,
	"target_type" text NOT NULL,
	"target_id" varchar,
	"layout" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "display_computers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"computer_name" text NOT NULL,
	"auth_token" varchar DEFAULT gen_random_uuid() NOT NULL,
	"last_seen_at" timestamp,
	"is_online" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "display_layouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rows" integer DEFAULT 2 NOT NULL,
	"cols" integer DEFAULT 2 NOT NULL,
	"is_template" boolean DEFAULT false,
	"template_id" varchar,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "display_themes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"accent_color" text DEFAULT '165 95% 50%',
	"bg_color" text DEFAULT '220 15% 8%',
	"bg_elevated_color" text DEFAULT '220 15% 12%',
	"bg_border_color" text DEFAULT '220 15% 18%',
	"fg_color" text DEFAULT '0 0% 95%',
	"muted_color" text DEFAULT '0 0% 60%',
	"heading_font" text DEFAULT 'Barlow Semi Condensed',
	"body_font" text DEFAULT 'Roboto',
	"numbers_font" text DEFAULT 'Barlow Semi Condensed',
	"logo_url" text,
	"sponsor_logos" jsonb,
	"features" jsonb DEFAULT '{"showTeamColors":true,"showReactionTimes":true,"showSplits":true}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "display_themes_meet_name_unique" UNIQUE("meet_id","name")
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"division_number" integer NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text,
	"low_age" integer,
	"high_age" integer,
	CONSTRAINT "divisions_meet_division_unique" UNIQUE("meet_id","division_number")
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"athlete_id" varchar NOT NULL,
	"team_id" varchar,
	"division_id" varchar,
	"seed_mark" real,
	"result_type" text DEFAULT 'time' NOT NULL,
	"preliminary_heat" integer,
	"preliminary_lane" integer,
	"quarterfinal_heat" integer,
	"quarterfinal_lane" integer,
	"semifinal_heat" integer,
	"semifinal_lane" integer,
	"final_heat" integer,
	"final_lane" integer,
	"preliminary_mark" real,
	"preliminary_place" integer,
	"preliminary_wind" real,
	"quarterfinal_mark" real,
	"quarterfinal_place" integer,
	"quarterfinal_wind" real,
	"semifinal_mark" real,
	"semifinal_place" integer,
	"semifinal_wind" real,
	"final_mark" real,
	"final_place" integer,
	"final_wind" real,
	"is_disqualified" boolean DEFAULT false,
	"is_scratched" boolean DEFAULT false,
	"scoring_status" text DEFAULT 'pending',
	"scored_points" real,
	"notes" text,
	"check_in_status" text DEFAULT 'pending',
	"check_in_time" timestamp,
	"check_in_operator" text,
	"check_in_method" text,
	CONSTRAINT "entries_event_athlete_unique" UNIQUE("event_id","athlete_id")
);
--> statement-breakpoint
CREATE TABLE "entry_splits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" varchar NOT NULL,
	"split_config_id" varchar,
	"split_index" integer NOT NULL,
	"distance_meters" integer NOT NULL,
	"elapsed_seconds" real NOT NULL,
	"source" varchar(50) DEFAULT 'manual',
	"recorded_at" timestamp DEFAULT now(),
	"recorder_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "event_split_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"meet_id" varchar,
	"split_order" integer NOT NULL,
	"distance_meters" integer NOT NULL,
	"label" varchar(100),
	"expected_lap_count" integer,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"event_number" integer NOT NULL,
	"name" text NOT NULL,
	"event_type" text NOT NULL,
	"gender" text NOT NULL,
	"distance" integer,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"num_rounds" integer DEFAULT 1,
	"num_lanes" integer DEFAULT 8,
	"event_date" timestamp,
	"event_time" text,
	"hytek_status" text,
	"is_scored" boolean DEFAULT false,
	"last_result_source" text,
	"last_result_at" timestamp,
	CONSTRAINT "events_meet_event_unique" UNIQUE("meet_id","event_number")
);
--> statement-breakpoint
CREATE TABLE "layout_cells" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layout_id" varchar NOT NULL,
	"row" integer NOT NULL,
	"col" integer NOT NULL,
	"row_span" integer DEFAULT 1 NOT NULL,
	"col_span" integer DEFAULT 1 NOT NULL,
	"event_id" varchar,
	"event_type" text,
	"board_type" text DEFAULT 'live_time' NOT NULL,
	"settings" jsonb,
	CONSTRAINT "layout_cells_layout_position_unique" UNIQUE("layout_id","row","col")
);
--> statement-breakpoint
CREATE TABLE "layout_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"layout_id" integer NOT NULL,
	"order" integer NOT NULL,
	"x_percent" real NOT NULL,
	"y_percent" real NOT NULL,
	"width_percent" real NOT NULL,
	"height_percent" real NOT NULL,
	"min_width" integer,
	"max_width" integer,
	"min_height" integer,
	"max_height" integer,
	"board_type" "board_type" NOT NULL,
	"data_binding" jsonb NOT NULL,
	"board_config" jsonb NOT NULL,
	"style_preset" varchar(50) DEFAULT 'none',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meet_scoring_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"points_map" jsonb,
	"relay_multiplier" real,
	CONSTRAINT "scoring_overrides_profile_event" UNIQUE("profile_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "meet_scoring_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"preset_id" integer NOT NULL,
	"gender_mode" text DEFAULT 'combined' NOT NULL,
	"division_mode" text DEFAULT 'overall' NOT NULL,
	"allow_relay_scoring" boolean DEFAULT true,
	"custom_tie_break" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "meet_scoring_profiles_meet_id_unique" UNIQUE("meet_id")
);
--> statement-breakpoint
CREATE TABLE "meet_scoring_state" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar NOT NULL,
	"last_computed_at" timestamp,
	"checksum" text,
	CONSTRAINT "meet_scoring_state_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "meets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" integer,
	"name" text NOT NULL,
	"location" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" text DEFAULT 'upcoming',
	"track_length" integer DEFAULT 400,
	"logo_url" text,
	"meet_code" varchar(6) DEFAULT upper(substring(md5(random()::text) from 1 for 6)) NOT NULL,
	"mdb_path" text,
	"auto_refresh" boolean DEFAULT false,
	"refresh_interval" integer DEFAULT 30,
	"last_import_at" timestamp,
	CONSTRAINT "meets_meet_code_unique" UNIQUE("meet_code")
);
--> statement-breakpoint
CREATE TABLE "preset_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"preset_id" integer NOT NULL,
	"place" integer NOT NULL,
	"points" real NOT NULL,
	"is_relay_override" boolean DEFAULT false,
	CONSTRAINT "preset_rules_preset_place" UNIQUE("preset_id","place","is_relay_override")
);
--> statement-breakpoint
CREATE TABLE "record_books" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"scope" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_book_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"gender" text NOT NULL,
	"performance" text NOT NULL,
	"athlete_name" text NOT NULL,
	"team" text,
	"date" timestamp NOT NULL,
	"location" text,
	"wind" text,
	"notes" text,
	"verified_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "result_updates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" varchar NOT NULL,
	"round" text NOT NULL,
	"source" text NOT NULL,
	"mark" real,
	"wind" real,
	"place" integer,
	"raw_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"was_accepted" boolean DEFAULT true,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "scoring_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"default_relay_multiplier" real DEFAULT 1,
	"allow_relay_scoring" boolean DEFAULT true,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "team_logos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar NOT NULL,
	"meet_id" varchar NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"content_type" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_logos_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "team_scoring_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"event_id" varchar,
	"gender" text,
	"division" text,
	"points_awarded" real DEFAULT 0 NOT NULL,
	"event_breakdown" jsonb,
	"tie_break_data" jsonb,
	"computed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"team_number" integer NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"abbreviation" text,
	CONSTRAINT "teams_meet_team_unique" UNIQUE("meet_id","team_number")
);
--> statement-breakpoint
ALTER TABLE "athlete_photos" ADD CONSTRAINT "athlete_photos_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_photos" ADD CONSTRAINT "athlete_photos_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_configs" ADD CONSTRAINT "board_configs_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_configs" ADD CONSTRAINT "board_configs_board_id_display_computers_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."display_computers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_configs" ADD CONSTRAINT "board_configs_theme_id_display_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."display_themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composite_layouts" ADD CONSTRAINT "composite_layouts_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_assignments" ADD CONSTRAINT "display_assignments_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_assignments" ADD CONSTRAINT "display_assignments_display_id_display_computers_id_fk" FOREIGN KEY ("display_id") REFERENCES "public"."display_computers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_computers" ADD CONSTRAINT "display_computers_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_layouts" ADD CONSTRAINT "display_layouts_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_themes" ADD CONSTRAINT "display_themes_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_splits" ADD CONSTRAINT "entry_splits_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_splits" ADD CONSTRAINT "entry_splits_split_config_id_event_split_configs_id_fk" FOREIGN KEY ("split_config_id") REFERENCES "public"."event_split_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_split_configs" ADD CONSTRAINT "event_split_configs_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layout_cells" ADD CONSTRAINT "layout_cells_layout_id_display_layouts_id_fk" FOREIGN KEY ("layout_id") REFERENCES "public"."display_layouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layout_zones" ADD CONSTRAINT "layout_zones_layout_id_composite_layouts_id_fk" FOREIGN KEY ("layout_id") REFERENCES "public"."composite_layouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_scoring_overrides" ADD CONSTRAINT "meet_scoring_overrides_profile_id_meet_scoring_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."meet_scoring_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_scoring_overrides" ADD CONSTRAINT "meet_scoring_overrides_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_scoring_profiles" ADD CONSTRAINT "meet_scoring_profiles_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_scoring_profiles" ADD CONSTRAINT "meet_scoring_profiles_preset_id_scoring_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."scoring_presets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_scoring_state" ADD CONSTRAINT "meet_scoring_state_profile_id_meet_scoring_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."meet_scoring_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meets" ADD CONSTRAINT "meets_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preset_rules" ADD CONSTRAINT "preset_rules_preset_id_scoring_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."scoring_presets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_record_book_id_record_books_id_fk" FOREIGN KEY ("record_book_id") REFERENCES "public"."record_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_logos" ADD CONSTRAINT "team_logos_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_logos" ADD CONSTRAINT "team_logos_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_scoring_results" ADD CONSTRAINT "team_scoring_results_profile_id_meet_scoring_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."meet_scoring_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_scoring_results" ADD CONSTRAINT "team_scoring_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_scoring_results" ADD CONSTRAINT "team_scoring_results_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_photos_athlete_id_idx" ON "athlete_photos" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "athlete_photos_meet_id_idx" ON "athlete_photos" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "athletes_meet_id_idx" ON "athletes" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "board_configs_meet_id_idx" ON "board_configs" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "display_assignments_display_id_idx" ON "display_assignments" USING btree ("display_id");--> statement-breakpoint
CREATE INDEX "display_computers_meet_id_idx" ON "display_computers" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "display_layouts_meet_id_idx" ON "display_layouts" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "display_themes_meet_id_idx" ON "display_themes" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "divisions_meet_id_idx" ON "divisions" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "layout_cells_layout_id_idx" ON "layout_cells" USING btree ("layout_id");--> statement-breakpoint
CREATE INDEX "meet_code_idx" ON "meets" USING btree ("meet_code");--> statement-breakpoint
CREATE INDEX "meets_season_id_idx" ON "meets" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "records_event_type_idx" ON "records" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "records_book_id_idx" ON "records" USING btree ("record_book_id");--> statement-breakpoint
CREATE INDEX "records_gender_idx" ON "records" USING btree ("gender");--> statement-breakpoint
CREATE INDEX "result_updates_entry_id_idx" ON "result_updates" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "result_updates_created_at_idx" ON "result_updates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "team_logos_team_id_idx" ON "team_logos" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_logos_meet_id_idx" ON "team_logos" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "team_scoring_results_profile_team" ON "team_scoring_results" USING btree ("profile_id","team_id");--> statement-breakpoint
CREATE INDEX "teams_meet_id_idx" ON "teams" USING btree ("meet_id");