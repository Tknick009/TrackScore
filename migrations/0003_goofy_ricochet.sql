CREATE TABLE "sponsor_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"sponsor_id" integer NOT NULL,
	"meet_id" varchar,
	"event_type" text,
	"weight" integer DEFAULT 1,
	"start_at" timestamp,
	"end_at" timestamp,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sponsor_rotation_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar NOT NULL,
	"zone_name" text NOT NULL,
	"display_mode" text NOT NULL,
	"dwell_ms" integer DEFAULT 5000,
	"transition_ms" integer DEFAULT 500,
	"max_queue_length" integer DEFAULT 10,
	"fallback_asset_key" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sponsor_rotation_profiles_meet_id_zone_name_unique" UNIQUE("meet_id","zone_name")
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"logo_storage_key" text,
	"logo_url" text,
	"clickthrough_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sponsor_assignments" ADD CONSTRAINT "sponsor_assignments_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_assignments" ADD CONSTRAINT "sponsor_assignments_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_rotation_profiles" ADD CONSTRAINT "sponsor_rotation_profiles_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;