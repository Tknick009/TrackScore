CREATE TABLE "medal_awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"entry_id" varchar,
	"medal_type" text NOT NULL,
	"tie_rank" integer,
	"awarded_at" timestamp DEFAULT now(),
	CONSTRAINT "medal_awards_meet_id_event_id_team_id_medal_type_unique" UNIQUE("meet_id","event_id","team_id","medal_type")
);
--> statement-breakpoint
ALTER TABLE "medal_awards" ADD CONSTRAINT "medal_awards_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medal_awards" ADD CONSTRAINT "medal_awards_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medal_awards" ADD CONSTRAINT "medal_awards_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medal_awards" ADD CONSTRAINT "medal_awards_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;