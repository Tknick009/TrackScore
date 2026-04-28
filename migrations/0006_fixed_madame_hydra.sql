CREATE TABLE "athlete_bests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"best_type" text NOT NULL,
	"mark" real NOT NULL,
	"season_id" integer,
	"achieved_at" timestamp,
	"meet_name" text,
	"source" text DEFAULT 'manual',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "athlete_bests_unique" UNIQUE("athlete_id","event_type","best_type","season_id")
);
--> statement-breakpoint
CREATE TABLE "display_devices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"device_name" text NOT NULL,
	"display_type" text DEFAULT 'P10',
	"display_mode" text DEFAULT 'track',
	"current_template" text,
	"last_ip" text,
	"assigned_event_id" varchar,
	"assigned_layout_id" integer,
	"auto_mode" boolean DEFAULT true,
	"paging_size" integer DEFAULT 8,
	"paging_interval" integer DEFAULT 5,
	"status" text DEFAULT 'offline',
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_live_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" varchar NOT NULL,
	"track_mode" text DEFAULT 'idle',
	"is_armed" boolean DEFAULT false,
	"is_running" boolean DEFAULT false,
	"running_time" text,
	"start_time" timestamp,
	"field_mode" text DEFAULT 'idle',
	"current_athlete_id" varchar,
	"current_attempt_number" integer,
	"current_height" text,
	"current_flight_number" integer,
	"last_lynx_event_number" integer,
	"last_lynx_heat_number" integer,
	"last_update_at" timestamp DEFAULT now(),
	"raw_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "field_athlete_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" varchar NOT NULL,
	"athlete_id" varchar NOT NULL,
	"flight_number" integer DEFAULT 1,
	"order_in_flight" integer NOT NULL,
	"status" text DEFAULT 'waiting',
	"current_attempt" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "field_event_athletes" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"entry_id" varchar NOT NULL,
	"flight_number" integer DEFAULT 1,
	"order_in_flight" integer NOT NULL,
	"check_in_status" text DEFAULT 'pending',
	"checked_in_at" timestamp,
	"competition_status" text DEFAULT 'waiting',
	"checked_out_at" timestamp,
	"retired_at" timestamp,
	"starting_height_index" integer DEFAULT 0,
	"best_mark" real,
	"current_place" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "field_event_athletes_session_entry_unique" UNIQUE("session_id","entry_id")
);
--> statement-breakpoint
CREATE TABLE "field_event_flights" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"flight_number" integer NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "field_flights_session_flight_unique" UNIQUE("session_id","flight_number")
);
--> statement-breakpoint
CREATE TABLE "field_event_marks" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"athlete_id" integer NOT NULL,
	"attempt_number" integer NOT NULL,
	"height_index" integer,
	"attempt_at_height" integer,
	"mark_type" text NOT NULL,
	"measurement" real,
	"measurement_display" text,
	"wind" real,
	"is_best" boolean DEFAULT false,
	"is_dark_mark" boolean DEFAULT false,
	"dark_measurement" real,
	"recorded_at" timestamp DEFAULT now(),
	CONSTRAINT "field_event_marks_athlete_attempt_unique" UNIQUE("athlete_id","attempt_number","height_index")
);
--> statement-breakpoint
CREATE TABLE "field_event_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" varchar NOT NULL,
	"status" text DEFAULT 'setup',
	"measurement_unit" text DEFAULT 'metric',
	"record_wind" boolean DEFAULT false,
	"has_finals" boolean DEFAULT false,
	"prelim_attempts" integer DEFAULT 3,
	"finals_attempts" integer DEFAULT 3,
	"athletes_to_finals" integer DEFAULT 8,
	"total_attempts" integer DEFAULT 6,
	"alive_group_size" integer,
	"stop_alive_at_count" integer,
	"current_flight_number" integer DEFAULT 1,
	"current_athlete_index" integer DEFAULT 0,
	"current_attempt_number" integer DEFAULT 1,
	"current_height_index" integer DEFAULT 0,
	"is_in_finals" boolean DEFAULT false,
	"access_code" varchar(6),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "field_event_sessions_event_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "field_heights" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"height_index" integer NOT NULL,
	"height_meters" real NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_jump_off" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "field_heights_session_height_unique" UNIQUE("session_id","height_index")
);
--> statement-breakpoint
CREATE TABLE "ingest_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar,
	"name" text NOT NULL,
	"port_type" text NOT NULL,
	"port" integer NOT NULL,
	"host" text DEFAULT '0.0.0.0',
	"enabled" boolean DEFAULT true,
	"last_data_at" timestamp,
	"is_connected" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "layout_objects" (
	"id" serial PRIMARY KEY NOT NULL,
	"scene_id" integer NOT NULL,
	"name" varchar(255),
	"object_type" varchar(50) NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"width" real NOT NULL,
	"height" real NOT NULL,
	"z_index" integer DEFAULT 0 NOT NULL,
	"rotation" real DEFAULT 0,
	"data_binding" jsonb,
	"config" jsonb,
	"style" jsonb,
	"visible" boolean DEFAULT true,
	"locked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "layout_scenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar,
	"name" varchar(255) NOT NULL,
	"description" text,
	"canvas_width" integer DEFAULT 1920 NOT NULL,
	"canvas_height" integer DEFAULT 1080 NOT NULL,
	"aspect_ratio" varchar(20) DEFAULT '16:9',
	"background_color" varchar(50) DEFAULT '#000000',
	"background_image" text,
	"is_template" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "live_event_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_number" integer NOT NULL,
	"meet_id" varchar,
	"event_type" text NOT NULL,
	"mode" text NOT NULL,
	"heat" integer DEFAULT 1,
	"total_heats" integer DEFAULT 1,
	"round" integer DEFAULT 1,
	"flight" integer DEFAULT 1,
	"wind" text,
	"status" text,
	"distance" text,
	"event_name" text,
	"entries" jsonb DEFAULT '[]'::jsonb,
	"running_time" text,
	"is_armed" boolean DEFAULT false,
	"is_running" boolean DEFAULT false,
	"last_update_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "live_event_data_unique" UNIQUE("event_number","heat","round","flight","event_type","meet_id")
);
--> statement-breakpoint
CREATE TABLE "lynx_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar,
	"port_type" text NOT NULL,
	"port" integer NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meet_ingestion_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar NOT NULL,
	"lynx_files_directory" text,
	"lynx_files_enabled" boolean DEFAULT false,
	"lynx_files_last_scan_at" timestamp,
	"lynx_files_processed_count" integer DEFAULT 0,
	"hytek_mdb_path" text,
	"hytek_mdb_enabled" boolean DEFAULT false,
	"hytek_mdb_last_import_at" timestamp,
	"hytek_mdb_last_hash" text,
	"hytek_mdb_poll_interval_sec" integer DEFAULT 60,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "meet_ingestion_settings_meet_id_unique" UNIQUE("meet_id")
);
--> statement-breakpoint
CREATE TABLE "processed_ingestion_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar NOT NULL,
	"file_path" text NOT NULL,
	"file_type" text NOT NULL,
	"file_hash" text NOT NULL,
	"processed_at" timestamp DEFAULT now(),
	"records_processed" integer DEFAULT 0,
	CONSTRAINT "processed_files_meet_file_unique" UNIQUE("meet_id","file_path")
);
--> statement-breakpoint
CREATE TABLE "scene_template_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar,
	"display_type" varchar(20) NOT NULL,
	"display_mode" varchar(50) NOT NULL,
	"scene_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_display_mapping" UNIQUE("meet_id","display_type","display_mode")
);
--> statement-breakpoint
CREATE TABLE "weather_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"observed_at" timestamp DEFAULT now() NOT NULL,
	"temperature_c" real NOT NULL,
	"wind_speed_ms" real NOT NULL,
	"wind_direction_deg" integer NOT NULL,
	"humidity_pct" integer NOT NULL,
	"pressure_hpa" integer NOT NULL,
	"precipitation_mm" real,
	"raw_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "weather_station_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar NOT NULL,
	"provider" varchar DEFAULT 'openweathermap' NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"api_key" text NOT NULL,
	"polling_interval_sec" integer DEFAULT 300 NOT NULL,
	"units" varchar DEFAULT 'metric' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weather_station_configs_meet_id_unique" UNIQUE("meet_id")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "session_name" text;--> statement-breakpoint
ALTER TABLE "meets" ADD COLUMN "primary_color" text DEFAULT '#0066CC';--> statement-breakpoint
ALTER TABLE "meets" ADD COLUMN "secondary_color" text DEFAULT '#003366';--> statement-breakpoint
ALTER TABLE "meets" ADD COLUMN "accent_color" text DEFAULT '#FFD700';--> statement-breakpoint
ALTER TABLE "meets" ADD COLUMN "text_color" text DEFAULT '#FFFFFF';--> statement-breakpoint
ALTER TABLE "athlete_bests" ADD CONSTRAINT "athlete_bests_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_bests" ADD CONSTRAINT "athlete_bests_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_devices" ADD CONSTRAINT "display_devices_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_devices" ADD CONSTRAINT "display_devices_assigned_event_id_events_id_fk" FOREIGN KEY ("assigned_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_devices" ADD CONSTRAINT "display_devices_assigned_layout_id_composite_layouts_id_fk" FOREIGN KEY ("assigned_layout_id") REFERENCES "public"."composite_layouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_live_state" ADD CONSTRAINT "event_live_state_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_live_state" ADD CONSTRAINT "event_live_state_current_athlete_id_athletes_id_fk" FOREIGN KEY ("current_athlete_id") REFERENCES "public"."athletes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_athlete_queue" ADD CONSTRAINT "field_athlete_queue_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_athlete_queue" ADD CONSTRAINT "field_athlete_queue_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_event_athletes" ADD CONSTRAINT "field_event_athletes_session_id_field_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."field_event_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_event_athletes" ADD CONSTRAINT "field_event_athletes_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_event_flights" ADD CONSTRAINT "field_event_flights_session_id_field_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."field_event_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_event_marks" ADD CONSTRAINT "field_event_marks_session_id_field_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."field_event_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_event_marks" ADD CONSTRAINT "field_event_marks_athlete_id_field_event_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."field_event_athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_event_sessions" ADD CONSTRAINT "field_event_sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_heights" ADD CONSTRAINT "field_heights_session_id_field_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."field_event_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingest_config" ADD CONSTRAINT "ingest_config_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layout_objects" ADD CONSTRAINT "layout_objects_scene_id_layout_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."layout_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layout_scenes" ADD CONSTRAINT "layout_scenes_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_event_data" ADD CONSTRAINT "live_event_data_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lynx_configs" ADD CONSTRAINT "lynx_configs_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_ingestion_settings" ADD CONSTRAINT "meet_ingestion_settings_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processed_ingestion_files" ADD CONSTRAINT "processed_ingestion_files_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_template_mappings" ADD CONSTRAINT "scene_template_mappings_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_template_mappings" ADD CONSTRAINT "scene_template_mappings_scene_id_layout_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."layout_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_readings" ADD CONSTRAINT "weather_readings_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_station_configs" ADD CONSTRAINT "weather_station_configs_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_bests_athlete_idx" ON "athlete_bests" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "display_devices_meet_id_idx" ON "display_devices" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "display_devices_status_idx" ON "display_devices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_live_state_event_id_idx" ON "event_live_state" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "field_athlete_queue_event_id_idx" ON "field_athlete_queue" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "field_athlete_queue_status_idx" ON "field_athlete_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "field_event_athletes_session_idx" ON "field_event_athletes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "field_event_athletes_entry_idx" ON "field_event_athletes" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "field_event_marks_session_idx" ON "field_event_marks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "field_event_marks_athlete_idx" ON "field_event_marks" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "field_event_sessions_event_idx" ON "field_event_sessions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "field_event_sessions_access_code_idx" ON "field_event_sessions" USING btree ("access_code");--> statement-breakpoint
CREATE INDEX "field_heights_session_idx" ON "field_heights" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "layout_objects_scene_id_idx" ON "layout_objects" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "layout_scenes_meet_id_idx" ON "layout_scenes" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "live_event_data_event_number_idx" ON "live_event_data" USING btree ("event_number");--> statement-breakpoint
CREATE INDEX "live_event_data_meet_id_idx" ON "live_event_data" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "live_event_data_event_type_idx" ON "live_event_data" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "lynx_configs_meet_id_idx" ON "lynx_configs" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "processed_files_meet_idx" ON "processed_ingestion_files" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "processed_files_path_idx" ON "processed_ingestion_files" USING btree ("file_path");--> statement-breakpoint
CREATE INDEX "scene_template_mappings_meet_id_idx" ON "scene_template_mappings" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "weather_readings_meet_idx" ON "weather_readings" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "weather_readings_observed_idx" ON "weather_readings" USING btree ("observed_at");