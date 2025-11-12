import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Event Types
export const eventTypeEnum = z.enum([
  // Sprints
  "100m", "200m", "400m",
  // Middle Distance
  "800m", "1500m", "3000m",
  // Distance
  "5000m", "10000m",
  // Hurdles
  "110m_hurdles", "400m_hurdles",
  // Relays
  "4x100m", "4x400m",
  // Field - Jumps
  "high_jump", "long_jump", "triple_jump", "pole_vault",
  // Field - Throws
  "shot_put", "discus", "javelin", "hammer"
]);

export type EventType = z.infer<typeof eventTypeEnum>;

// Event Categories
export const eventCategoryEnum = z.enum(["track", "field_jump", "field_throw"]);
export type EventCategory = z.infer<typeof eventCategoryEnum>;

// Event Status
export const eventStatusEnum = z.enum(["scheduled", "in_progress", "completed"]);
export type EventStatus = z.infer<typeof eventStatusEnum>;

// Gender
export const genderEnum = z.enum(["men", "women", "mixed"]);
export type Gender = z.infer<typeof genderEnum>;

// Athletes
export const athletes = pgTable("athletes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteIdNumber: integer("athlete_id_number").notNull().unique(), // ID Number for athlete
  name: text("name").notNull(),
  bib: text("bib").notNull(),
  team: text("team"),
  country: text("country"),
});

export const insertAthleteSchema = createInsertSchema(athletes).omit({
  id: true,
}).extend({
  athleteIdNumber: z.number().int().positive(),
});

export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type Athlete = typeof athletes.$inferSelect;

// Events
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventNumber: integer("event_number").notNull().unique(), // Event number to match timing software
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  gender: text("gender").notNull(),
  heat: integer("heat").default(1),
  round: text("round").default("Final"),
  status: text("status").notNull().default("scheduled"),
  windReading: real("wind_reading"),
  startTime: timestamp("start_time"),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
}).extend({
  eventType: eventTypeEnum,
  gender: genderEnum,
  status: eventStatusEnum,
  eventNumber: z.number().int().positive(),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Results for Track Events
export const trackResults = pgTable("track_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  athleteId: varchar("athlete_id").notNull(),
  lane: integer("lane"),
  time: real("time"),
  position: integer("position"),
  reaction: real("reaction"),
  isDisqualified: boolean("is_disqualified").default(false),
  notes: text("notes"),
});

export const insertTrackResultSchema = createInsertSchema(trackResults).omit({
  id: true,
});

export type InsertTrackResult = z.infer<typeof insertTrackResultSchema>;
export type TrackResult = typeof trackResults.$inferSelect;

// Results for Field Events
export const fieldResults = pgTable("field_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  athleteId: varchar("athlete_id").notNull(),
  attempt1: real("attempt_1"),
  attempt2: real("attempt_2"),
  attempt3: real("attempt_3"),
  attempt4: real("attempt_4"),
  attempt5: real("attempt_5"),
  attempt6: real("attempt_6"),
  bestMark: real("best_mark"),
  position: integer("position"),
  isDisqualified: boolean("is_disqualified").default(false),
  notes: text("notes"),
});

export const insertFieldResultSchema = createInsertSchema(fieldResults).omit({
  id: true,
});

export type InsertFieldResult = z.infer<typeof insertFieldResultSchema>;
export type FieldResult = typeof fieldResults.$inferSelect;

// Meet Information
export const meets = pgTable("meets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location"),
  date: timestamp("date").notNull(),
  logoUrl: text("logo_url"),
  trackLength: integer("track_length").default(400), // Track length in meters (200m, 400m, etc.)
});

// Split Times for distance running events
export const splitTimes = pgTable("split_times", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackResultId: varchar("track_result_id").notNull(),
  lapNumber: integer("lap_number").notNull(),
  splitTime: real("split_time").notNull(), // Time at this split in seconds
  cumulativeTime: real("cumulative_time").notNull(), // Total time up to this split
});

export const insertMeetSchema = createInsertSchema(meets).omit({
  id: true,
});

export type InsertMeet = z.infer<typeof insertMeetSchema>;
export type Meet = typeof meets.$inferSelect;

// Split Times
export const insertSplitTimeSchema = createInsertSchema(splitTimes).omit({
  id: true,
});

export type InsertSplitTime = z.infer<typeof insertSplitTimeSchema>;
export type SplitTime = typeof splitTimes.$inferSelect;

// Helper type for combined results with splits
export type AthleteResult = {
  athlete: Athlete;
  trackResult?: TrackResult;
  fieldResult?: FieldResult;
  splitTimes?: SplitTime[];
};

// Event with results
export type EventWithResults = Event & {
  results: AthleteResult[];
};

// Display Board State (for WebSocket broadcasting)
export type DisplayBoardState = {
  mode: "live" | "results" | "schedule" | "standings";
  currentEvent?: EventWithResults;
  meet?: Meet;
  timestamp: number;
};

// WebSocket Message Types
export type WSMessage = 
  | { type: "board_update"; data: DisplayBoardState }
  | { type: "event_update"; data: Event }
  | { type: "result_update"; data: TrackResult | FieldResult }
  | { type: "connection_status"; connected: boolean };
