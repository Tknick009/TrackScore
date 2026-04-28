CREATE TABLE "combined_event_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"combined_event_id" integer NOT NULL,
	"event_id" varchar NOT NULL,
	"sequence_order" integer NOT NULL,
	"day" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "combined_event_totals" (
	"id" serial PRIMARY KEY NOT NULL,
	"combined_event_id" integer NOT NULL,
	"athlete_id" varchar NOT NULL,
	"total_points" integer DEFAULT 0,
	"events_completed" integer DEFAULT 0,
	"event_breakdown" jsonb,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "combined_event_totals_combined_event_id_athlete_id_unique" UNIQUE("combined_event_id","athlete_id")
);
--> statement-breakpoint
CREATE TABLE "combined_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar NOT NULL,
	"name" text NOT NULL,
	"event_type" text NOT NULL,
	"gender" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "combined_event_components" ADD CONSTRAINT "combined_event_components_combined_event_id_combined_events_id_fk" FOREIGN KEY ("combined_event_id") REFERENCES "public"."combined_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combined_event_components" ADD CONSTRAINT "combined_event_components_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combined_event_totals" ADD CONSTRAINT "combined_event_totals_combined_event_id_combined_events_id_fk" FOREIGN KEY ("combined_event_id") REFERENCES "public"."combined_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combined_event_totals" ADD CONSTRAINT "combined_event_totals_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combined_events" ADD CONSTRAINT "combined_events_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;