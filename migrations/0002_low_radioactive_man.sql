CREATE TABLE "field_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" varchar NOT NULL,
	"attempt_index" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"measurement" real,
	"measured_by" varchar(100),
	"recorded_at" timestamp DEFAULT now(),
	"source" varchar(50) DEFAULT 'judge',
	"notes" text,
	CONSTRAINT "field_attempts_entry_id_attempt_index_unique" UNIQUE("entry_id","attempt_index")
);
--> statement-breakpoint
CREATE TABLE "judge_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meet_id" varchar NOT NULL,
	"event_id" varchar,
	"code" varchar(8) NOT NULL,
	"pin" varchar(6),
	"judge_name" varchar(100),
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "judge_tokens_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "field_attempts" ADD CONSTRAINT "field_attempts_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judge_tokens" ADD CONSTRAINT "judge_tokens_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judge_tokens" ADD CONSTRAINT "judge_tokens_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;