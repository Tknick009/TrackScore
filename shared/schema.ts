import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ====================
// ENUMS
// ====================

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

// Event Status
export const eventStatusEnum = z.enum(["scheduled", "in_progress", "completed"]);
export type EventStatus = z.infer<typeof eventStatusEnum>;

// Gender (widened to accept raw MDB codes)
export const genderEnum = z.enum(["M", "F", "W", "m", "f", "w", "men", "women", "mixed"]);
export type Gender = z.infer<typeof genderEnum>;

// Result Type (for unified entries)
export const resultTypeEnum = z.enum(["time", "distance", "height", "points"]);
export type ResultType = z.infer<typeof resultTypeEnum>;

// Round Type
export const roundTypeEnum = z.enum(["preliminary", "quarterfinal", "semifinal", "final"]);
export type RoundType = z.infer<typeof roundTypeEnum>;

// ====================
// CORE TABLES
// ====================

// Meets
export const meets = pgTable("meets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  trackLength: integer("track_length").default(400), // Track length in meters
  logoUrl: text("logo_url"),
});

export const insertMeetSchema = createInsertSchema(meets).omit({ id: true });
export type InsertMeet = z.infer<typeof insertMeetSchema>;
export type Meet = typeof meets.$inferSelect;

// Teams
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamNumber: integer("team_number").notNull().unique(), // From .mdb Team_no
  name: text("name").notNull(),
  shortName: text("short_name"),
  abbreviation: text("abbreviation"),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Divisions (age groups)
export const divisions = pgTable("divisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  divisionNumber: integer("division_number").notNull().unique(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation"),
  lowAge: integer("low_age"),
  highAge: integer("high_age"),
});

export const insertDivisionSchema = createInsertSchema(divisions).omit({ id: true });
export type InsertDivision = z.infer<typeof insertDivisionSchema>;
export type Division = typeof divisions.$inferSelect;

// Athletes
export const athletes = pgTable("athletes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteNumber: integer("athlete_number").notNull().unique(), // From .mdb Ath_no
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  teamId: varchar("team_id"), // Reference to teams table
  divisionId: varchar("division_id"), // Reference to divisions table
  bibNumber: text("bib_number"),
  gender: text("gender"),
});

export const insertAthleteSchema = createInsertSchema(athletes).omit({ id: true });
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type Athlete = typeof athletes.$inferSelect;

// Events
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull(), // Reference to meets table
  eventNumber: integer("event_number").notNull().unique(), // From .mdb Event_no
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  gender: text("gender").notNull(),
  distance: integer("distance"), // Event distance in meters
  status: text("status").notNull().default("scheduled"),
  numRounds: integer("num_rounds").default(1),
  numLanes: integer("num_lanes").default(8),
});

export const insertEventSchema = createInsertSchema(events).omit({ id: true }).extend({
  eventType: z.string(), // Allow any event type string from MDB
  gender: z.string(), // Allow raw MDB gender codes
  status: eventStatusEnum,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// ====================
// ENTRY-CENTRIC MODEL
// ====================

// Entries (unified registration + results for ALL events)
export const entries = pgTable("entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  athleteId: varchar("athlete_id").notNull(),
  teamId: varchar("team_id"), // Denormalized for convenience
  divisionId: varchar("division_id"), // Division for this entry
  
  // Registration data
  seedMark: real("seed_mark"), // Seed time or distance
  resultType: text("result_type").notNull().default("time"), // time, distance, height, points
  
  // Assignment data
  preliminaryHeat: integer("preliminary_heat"),
  preliminaryLane: integer("preliminary_lane"),
  quarterfinalHeat: integer("quarterfinal_heat"),
  quarterfinalLane: integer("quarterfinal_lane"),
  semifinalHeat: integer("semifinal_heat"),
  semifinalLane: integer("semifinal_lane"),
  finalHeat: integer("final_heat"),
  finalLane: integer("final_lane"),
  
  // Result data (denormalized per round)
  preliminaryMark: real("preliminary_mark"),
  preliminaryPlace: integer("preliminary_place"),
  preliminaryWind: real("preliminary_wind"),
  
  quarterfinalMark: real("quarterfinal_mark"),
  quarterfinalPlace: integer("quarterfinal_place"),
  quarterfinalWind: real("quarterfinal_wind"),
  
  semifinalMark: real("semifinal_mark"),
  semifinalPlace: integer("semifinal_place"),
  semifinalWind: real("semifinal_wind"),
  
  finalMark: real("final_mark"),
  finalPlace: integer("final_place"),
  finalWind: real("final_wind"),
  
  // Flags
  isDisqualified: boolean("is_disqualified").default(false),
  isScratched: boolean("is_scratched").default(false),
  
  // Notes
  notes: text("notes"),
});

export const insertEntrySchema = createInsertSchema(entries).omit({ id: true }).extend({
  resultType: resultTypeEnum,
});
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entries.$inferSelect;

// Entry Splits (for lap/attempt breakdowns)
export const entrySplits = pgTable("entry_splits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: varchar("entry_id").notNull(),
  round: text("round").notNull(), // preliminary, quarterfinal, semifinal, final
  splitNumber: integer("split_number").notNull(), // 1, 2, 3, etc. (lap or attempt number)
  splitTime: real("split_time"), // For running events
  cumulativeTime: real("cumulative_time"), // Total time up to this split
  distance: real("distance"), // For field events (attempt distance/height)
});

export const insertEntrySplitSchema = createInsertSchema(entrySplits).omit({ id: true }).extend({
  round: roundTypeEnum,
});
export type InsertEntrySplit = z.infer<typeof insertEntrySplitSchema>;
export type EntrySplit = typeof entrySplits.$inferSelect;

// ====================
// HELPER TYPES
// ====================

// Entry with full athlete and team info
export type EntryWithDetails = Entry & {
  athlete: Athlete;
  team?: Team;
  event: Event;
  splits?: EntrySplit[];
};

// Event with all entries
export type EventWithEntries = Event & {
  entries: EntryWithDetails[];
};

// Display Board State (for WebSocket broadcasting)
export type DisplayBoardState = {
  mode: "live" | "results" | "schedule" | "standings";
  currentEvent?: EventWithEntries;
  meet?: Meet;
  timestamp: number;
};

// WebSocket Message Types
export type WSMessage = 
  | { type: "board_update"; data: DisplayBoardState }
  | { type: "event_update"; data: Event }
  | { type: "entry_update"; data: Entry }
  | { type: "connection_status"; connected: boolean };
