CREATE TABLE "wind_readings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"heat_number" integer,
	"attempt_id" varchar,
	"wind_speed" real NOT NULL,
	"is_legal" boolean NOT NULL,
	"source" varchar(50) DEFAULT 'manual',
	"recorded_at" timestamp DEFAULT now(),
	"recorder_id" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "wind_readings" ADD CONSTRAINT "wind_readings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;