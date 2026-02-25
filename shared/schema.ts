import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, index, unique, jsonb, pgEnum, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ====================
// ENUMS
// ====================

// Event Types
export const eventTypeEnum = z.enum([
  // Sprints
  "100m", "200m", "400m",
  // Indoor Sprints
  "60m",
  // Middle Distance
  "800m", "1000m", "1500m", "3000m",
  // Distance
  "5000m", "10000m",
  // Hurdles
  "60m_hurdles", "100m_hurdles", "110m_hurdles", "400m_hurdles",
  // Relays
  "4x100m", "4x400m",
  // Field - Jumps
  "high_jump", "long_jump", "triple_jump", "pole_vault",
  // Field - Throws
  "shot_put", "discus", "javelin", "hammer"
]);
export type EventType = z.infer<typeof eventTypeEnum>;

// ====================
// EVENT TYPE CATEGORIZATION - SINGLE SOURCE OF TRUTH
// ====================

export const EVENT_TYPE_CATEGORIES = {
  TIME_EVENTS: [
    '60m', '100m', '200m', '400m', '800m', '1000m', '1500m', '3000m', '5000m', '10000m',
    '60m_hurdles', '100m_hurdles', '110m_hurdles', '400m_hurdles',
    '4x100m', '4x400m',
  ] as const,
  DISTANCE_EVENTS: [
    'long_jump', 'triple_jump',
    'shot_put', 'discus', 'javelin', 'hammer',
  ] as const,
  HEIGHT_EVENTS: [
    'high_jump', 'pole_vault',
  ] as const,
} as const;

export function isTimeEvent(eventType: string): boolean {
  return EVENT_TYPE_CATEGORIES.TIME_EVENTS.includes(eventType as any);
}

export function isDistanceEvent(eventType: string): boolean {
  return EVENT_TYPE_CATEGORIES.DISTANCE_EVENTS.includes(eventType as any);
}

export function isHeightEvent(eventType: string): boolean {
  return EVENT_TYPE_CATEGORIES.HEIGHT_EVENTS.includes(eventType as any);
}

// Wind-affected events (IAAF rules: winds >+2.0 m/s make results ineligible for records)
// Note: 60m and 60m_hurdles are indoor events — no wind measurement applies
export const WIND_AFFECTED_EVENT_TYPES = [
  "100m",
  "200m",
  "100m_hurdles",
  "110m_hurdles",
  "4x100m",
  "long_jump",
  "triple_jump"
] as const;

export function isWindAffectedEvent(eventType: string): boolean {
  return WIND_AFFECTED_EVENT_TYPES.includes(eventType as any);
}

// ====================
// PERFORMANCE PARSING AND VALIDATION - SINGLE SOURCE OF TRUTH
// ====================

export function parsePerformanceToSeconds(performance: string): number | null {
  const trimmed = performance.trim();
  
  if (!trimmed) return null;
  
  // Check for colon format (mm:ss.ss or m:ss.ss)
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length !== 2) return null;
    
    const minutes = parseInt(parts[0]);
    const seconds = parseFloat(parts[1]);
    
    if (isNaN(minutes) || isNaN(seconds) || seconds < 0 || seconds >= 60) {
      return null;
    }
    
    return minutes * 60 + seconds;
  }
  
  // Plain numeric format
  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0) return null;
  
  return num;
}

export function validatePerformanceString(performance: string): { valid: boolean, error?: string, seconds?: number } {
  const trimmed = performance.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Performance cannot be empty' };
  }
  
  const seconds = parsePerformanceToSeconds(trimmed);
  
  if (seconds === null) {
    return { valid: false, error: 'Performance must be a valid number or time format (mm:ss.ss)' };
  }
  
  if (seconds <= 0) {
    return { valid: false, error: 'Performance must be positive' };
  }
  
  return { valid: true, seconds };
}

// Event Status
export const eventStatusEnum = z.enum(["scheduled", "in_progress", "completed"]);
export type EventStatus = z.infer<typeof eventStatusEnum>;

// HyTek Event Status (from MDB)
export const hytekEventStatusEnum = z.enum(["unseeded", "seeded", "done", "scored"]);
export type HytekEventStatus = z.infer<typeof hytekEventStatusEnum>;

// Data source for provenance tracking
export const dataSourceEnum = z.enum(["mdb", "port", "lif", "lff", "manual"]);
export type DataSource = z.infer<typeof dataSourceEnum>;

// Gender (widened to accept raw MDB codes)
export const genderEnum = z.enum(["M", "F", "W", "m", "f", "w", "men", "women", "mixed"]);
export type Gender = z.infer<typeof genderEnum>;

// Result Type (for unified entries)
export const resultTypeEnum = z.enum(["time", "distance", "height", "points"]);
export type ResultType = z.infer<typeof resultTypeEnum>;

// Round Type
export const roundTypeEnum = z.enum(["preliminary", "quarterfinal", "semifinal", "final"]);
export type RoundType = z.infer<typeof roundTypeEnum>;

// Display Target Type
export const displayTargetTypeEnum = z.enum(["track_event", "field_event", "standings", "schedule"]);
export type DisplayTargetType = z.infer<typeof displayTargetTypeEnum>;

// Meet Status
export const meetStatusEnum = z.enum(["upcoming", "in_progress", "completed"]);
export type MeetStatus = z.infer<typeof meetStatusEnum>;

// Check-in Status
export const checkInStatusEnum = z.enum(["pending", "checked_in", "no_show"]);
export type CheckInStatus = z.infer<typeof checkInStatusEnum>;

// Medal Type
export const medalTypeEnum = z.enum(['gold', 'silver', 'bronze']);
export type MedalType = z.infer<typeof medalTypeEnum>;

// QR code resource types
export const qrResourceTypeEnum = z.enum(['meet', 'event', 'athlete', 'standings']);
export type QRResourceType = z.infer<typeof qrResourceTypeEnum>;

// QR code metadata (stored in memory)
export type QRCodeMeta = {
  slug: string;
  resourceType: QRResourceType;
  resourceId?: string; // meetId, eventId, athleteId (optional for standings)
  url: string;
  createdAt: Date;
};

// Social media post templates
export const socialMediaPostTypeEnum = z.enum([
  'event_result',
  'record_broken',
  'medal_count',
  'meet_highlight'
]);
export type SocialMediaPostType = z.infer<typeof socialMediaPostTypeEnum>;

export type SocialMediaPost = {
  id: string;
  type: SocialMediaPostType;
  caption: string;
  hashtags: string[];
  eventId?: string;
  athleteId?: string;
  createdAt: Date;
};

// ====================
// LAYOUT ENUMS (TypeScript const arrays for shared use)
// ====================

// Board type enum values
export const BOARD_TYPES = [
  'athlete-card-grid',
  'athlete-card-single',
  'attempt-tracker',
  'live-timer',
  'lane-visualization',
  'standings-table',
  'event-info',
  'logo-banner'
] as const;

// Data binding type values
export const BINDING_TYPES = [
  'event',
  'current-event',
  'standings',
  'static'
] as const;

// Style preset values
export const STYLE_PRESETS = [
  'none',
  'gradient-blue',
  'gradient-blue-thick',
  'gradient-blue-glow',
  'accent-yellow',
  'accent-yellow-pulse',
  'gradient-yellow-combo'
] as const;

// Board config size enums
export const CARD_SIZES = ['small', 'medium', 'large'] as const;
export const TIMER_MODES = ['countdown', 'stopwatch', 'static'] as const;
export const LANE_SIZES = ['compact', 'standard', 'expanded'] as const;
export const FONT_SIZES = ['small', 'medium', 'large'] as const;
export const GENERAL_SIZES = ['small', 'medium', 'large'] as const;

// Combined zone sizes (for form validation where both general and lane sizes are allowed)
export const ALL_ZONE_SIZES = [
  ...GENERAL_SIZES,
  ...LANE_SIZES
] as const;

// Board Type (for composite layout zones)
export const boardTypeEnum = pgEnum('board_type', BOARD_TYPES);

// ====================
// CORE TABLES
// ====================

// Seasons
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "2024-2025 Indoor Season"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
});

export const insertSeasonSchema = createInsertSchema(seasons).omit({ id: true });
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasons.$inferSelect;

// Meets
export const meets = pgTable("meets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seasonId: integer("season_id").references(() => seasons.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  location: text("location"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status").default("upcoming"), // upcoming, in_progress, completed
  trackLength: integer("track_length").default(400), // Track length in meters
  logoUrl: text("logo_url"),
  meetCode: varchar("meet_code", { length: 6 }).notNull().unique().default(sql`upper(substring(md5(random()::text) from 1 for 6))`), // 6-character code for displays to join
  mdbPath: text("mdb_path"), // Path to .mdb file for auto-refresh
  autoRefresh: boolean("auto_refresh").default(false), // Whether to poll .mdb file
  refreshInterval: integer("refresh_interval").default(30), // Seconds between polls
  lastImportAt: timestamp("last_import_at"), // When last import completed
  // Color scheme for display layouts
  primaryColor: text("primary_color").default("#0066CC"), // Main brand color
  secondaryColor: text("secondary_color").default("#003366"), // Secondary/gradient color
  accentColor: text("accent_color").default("#FFD700"), // Highlight/accent color (times, places)
  textColor: text("text_color").default("#FFFFFF"), // Primary text color
  indMaxScorersPerTeam: integer("ind_max_scorers_per_team").default(0),
  relMaxScorersPerTeam: integer("rel_max_scorers_per_team").default(0),
}, (table) => ({
  meetCodeIdx: index("meet_code_idx").on(table.meetCode),
  seasonIdIdx: index("meets_season_id_idx").on(table.seasonId),
}));

export const insertMeetSchema = createInsertSchema(meets).omit({ id: true }).extend({
  status: meetStatusEnum.optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
});
export type InsertMeet = z.infer<typeof insertMeetSchema>;
export type Meet = typeof meets.$inferSelect;

// Teams
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  teamNumber: integer("team_number").notNull(), // From .mdb Team_no
  name: text("name").notNull(),
  shortName: text("short_name"),
  abbreviation: text("abbreviation"),
  menScoreOverride: real("men_score_override"),
  womenScoreOverride: real("women_score_override"),
  primaryColor: text("primary_color"), // Team's primary brand color (hex)
  secondaryColor: text("secondary_color"), // Team's secondary brand color (hex)
}, (table) => ({
  meetIdIdx: index("teams_meet_id_idx").on(table.meetId),
  meetTeamUnique: unique("teams_meet_team_unique").on(table.meetId, table.teamNumber),
}));

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Divisions (age groups)
export const divisions = pgTable("divisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  divisionNumber: integer("division_number").notNull(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation"),
  lowAge: integer("low_age"),
  highAge: integer("high_age"),
}, (table) => ({
  meetIdIdx: index("divisions_meet_id_idx").on(table.meetId),
  meetDivisionUnique: unique("divisions_meet_division_unique").on(table.meetId, table.divisionNumber),
}));

export const insertDivisionSchema = createInsertSchema(divisions).omit({ id: true });
export type InsertDivision = z.infer<typeof insertDivisionSchema>;
export type Division = typeof divisions.$inferSelect;

// Athletes
export const athletes = pgTable("athletes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  athleteNumber: integer("athlete_number").notNull(), // From .mdb Ath_no
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  teamId: varchar("team_id"), // Reference to teams table
  divisionId: varchar("division_id"), // Reference to divisions table
  bibNumber: text("bib_number"),
  gender: text("gender"),
}, (table) => ({
  meetIdIdx: index("athletes_meet_id_idx").on(table.meetId),
  teamIdIdx: index("athletes_team_id_idx").on(table.teamId),
  meetAthleteUnique: unique("athletes_meet_athlete_unique").on(table.meetId, table.athleteNumber),
}));

export const insertAthleteSchema = createInsertSchema(athletes).omit({ id: true });
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type Athlete = typeof athletes.$inferSelect;

// Athlete Personal Bests (College and Season)
export const bestTypeEnum = z.enum(["college", "season"]);
export type BestType = z.infer<typeof bestTypeEnum>;

export const athleteBests = pgTable("athlete_bests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // e.g., "100m", "long_jump", "shot_put"
  bestType: text("best_type").notNull(), // "college" or "season"
  mark: real("mark").notNull(), // Stored in base units (seconds for track, meters for field)
  seasonId: integer("season_id").references(() => seasons.id, { onDelete: "set null" }), // For season bests
  achievedAt: timestamp("achieved_at"), // When the best was achieved
  meetName: text("meet_name"), // Name of the meet where it was achieved
  source: text("source").default("manual"), // "manual", "import", "calculated"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  athleteEventBestUnique: unique("athlete_bests_unique").on(table.athleteId, table.eventType, table.bestType, table.seasonId),
  athleteIdx: index("athlete_bests_athlete_idx").on(table.athleteId),
}));

export const insertAthleteBestSchema = createInsertSchema(athleteBests).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  bestType: bestTypeEnum,
});
export type InsertAthleteBest = z.infer<typeof insertAthleteBestSchema>;
export type AthleteBest = typeof athleteBests.$inferSelect;

// Events
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  eventNumber: integer("event_number").notNull(), // From .mdb Event_no
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  gender: text("gender").notNull(),
  distance: integer("distance"), // Event distance in meters
  status: text("status").notNull().default("scheduled"),
  numRounds: integer("num_rounds").default(1),
  numLanes: integer("num_lanes").default(8),
  advanceByPlace: integer("advance_by_place"), // Athletes per heat that advance by position (big Q)
  advanceByTime: integer("advance_by_time"), // Athletes that advance by time across all heats (little q)
  isMultiEvent: boolean("is_multi_event").default(false), // Part of a combined event (decathlon, heptathlon, etc.)
  eventDate: timestamp("event_date"), // Scheduled date for this event
  eventTime: text("event_time"), // Scheduled time string (e.g., "2:30 PM")
  sessionName: text("session_name"), // Session name from HyTek (e.g., "Thursday AM", "Friday Finals")
  hytekStatus: text("hytek_status"), // unseeded, seeded, done, scored from MDB
  isScored: boolean("is_scored").default(false), // Derived: true if hytekStatus = 'done' or 'scored'
  lastResultSource: text("last_result_source"), // port, lif, lff, manual
  lastResultAt: timestamp("last_result_at"), // When results were last updated
}, (table) => ({
  meetEventUnique: unique("events_meet_event_unique").on(table.meetId, table.eventNumber),
  meetIdIdx: index("events_meet_id_idx").on(table.meetId),
  genderIdx: index("events_gender_idx").on(table.gender),
  isScoredIdx: index("events_is_scored_idx").on(table.isScored),
}));

export const insertEventSchema = createInsertSchema(events).omit({ id: true }).extend({
  eventType: z.string(), // Allow any event type string from MDB
  gender: z.string(), // Allow raw MDB gender codes
  status: eventStatusEnum,
  hytekStatus: hytekEventStatusEnum.optional(),
  lastResultSource: dataSourceEnum.optional(),
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
  
  preliminaryPoints: real("preliminary_points"),
  quarterfinalPoints: real("quarterfinal_points"),
  semifinalPoints: real("semifinal_points"),
  finalPoints: real("final_points"),
  
  // Flags
  isDisqualified: boolean("is_disqualified").default(false),
  isScratched: boolean("is_scratched").default(false),
  
  // Team Scoring
  scoringStatus: text("scoring_status").default("pending"),
  scoredPoints: real("scored_points"),
  
  // Notes
  notes: text("notes"),
  
  // Check-in tracking
  checkInStatus: text("check_in_status").default("pending"), // pending, checked_in, no_show
  checkInTime: timestamp("check_in_time"),
  checkInOperator: text("check_in_operator"), // Name/ID of person who checked in athlete
  checkInMethod: text("check_in_method"), // manual, qr_code, bulk, etc.
}, (table) => ({
  eventAthleteUnique: unique("entries_event_athlete_unique").on(table.eventId, table.athleteId),
  eventIdIdx: index("entries_event_id_idx").on(table.eventId),
  athleteIdIdx: index("entries_athlete_id_idx").on(table.athleteId),
  teamIdIdx: index("entries_team_id_idx").on(table.teamId),
  eventPlaceIdx: index("entries_event_place_idx").on(table.eventId, table.finalPlace),
}));

export const insertEntrySchema = createInsertSchema(entries).omit({ id: true }).extend({
  resultType: resultTypeEnum,
});
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entries.$inferSelect;

// Event Split Configurations (default + meet-specific)
export const eventSplitConfigs = pgTable("event_split_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  meetId: varchar("meet_id").references(() => meets.id, { onDelete: "cascade" }),
  splitOrder: integer("split_order").notNull(),
  distanceMeters: integer("distance_meters").notNull(),
  label: varchar("label", { length: 100 }),
  expectedLapCount: integer("expected_lap_count"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertEventSplitConfigSchema = createInsertSchema(eventSplitConfigs).omit({
  id: true,
  createdAt: true
});
export type InsertEventSplitConfig = z.infer<typeof insertEventSplitConfigSchema>;
export type EventSplitConfig = typeof eventSplitConfigs.$inferSelect;

// Recorded split times for entries
export const entrySplits = pgTable("entry_splits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: varchar("entry_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
  splitConfigId: varchar("split_config_id").references(() => eventSplitConfigs.id, { onDelete: "set null" }),
  splitIndex: integer("split_index").notNull(),
  distanceMeters: integer("distance_meters").notNull(),
  elapsedSeconds: real("elapsed_seconds").notNull(),
  source: varchar("source", { length: 50 }).default("manual"),
  recordedAt: timestamp("recorded_at").defaultNow(),
  recorderId: varchar("recorder_id", { length: 100 })
});

export const insertEntrySplitSchema = createInsertSchema(entrySplits).omit({
  id: true,
  recordedAt: true
});
export type InsertEntrySplit = z.infer<typeof insertEntrySplitSchema>;
export type EntrySplit = typeof entrySplits.$inferSelect;

// Result Updates (audit trail for timing data ingestion)
export const resultUpdates = pgTable("result_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: varchar("entry_id").notNull(),
  round: text("round").notNull(), // preliminary, quarterfinal, semifinal, final
  source: text("source").notNull(), // port, lif, lff, manual
  mark: real("mark"), // The timing/distance/height value
  wind: real("wind"),
  place: integer("place"),
  rawPayload: jsonb("raw_payload"), // Original data from source
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  wasAccepted: boolean("was_accepted").default(true), // False if rejected due to score-lock
  rejectionReason: text("rejection_reason"), // e.g., "Event is scored"
}, (table) => ({
  entryIdIdx: index("result_updates_entry_id_idx").on(table.entryId),
  createdAtIdx: index("result_updates_created_at_idx").on(table.createdAt),
}));

export const insertResultUpdateSchema = createInsertSchema(resultUpdates).omit({ id: true, createdAt: true }).extend({
  round: roundTypeEnum,
  source: dataSourceEnum,
});
export type InsertResultUpdate = z.infer<typeof insertResultUpdateSchema>;
export type ResultUpdate = typeof resultUpdates.$inferSelect;

// ====================
// DISPLAY MANAGEMENT
// ====================

// Display Computers
export const displayComputers = pgTable("display_computers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  computerName: text("computer_name").notNull(), // Friendly name from user
  authToken: varchar("auth_token").notNull().default(sql`gen_random_uuid()`), // UUID for authentication
  lastSeenAt: timestamp("last_seen_at"), // For heartbeat tracking
  isOnline: boolean("is_online").default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => ({
  meetIdIdx: index("display_computers_meet_id_idx").on(table.meetId),
}));

export const insertDisplayComputerSchema = createInsertSchema(displayComputers).omit({ id: true, authToken: true, createdAt: true });
export type InsertDisplayComputer = z.infer<typeof insertDisplayComputerSchema>;
export type DisplayComputer = typeof displayComputers.$inferSelect;

// Display Assignments
export const displayAssignments = pgTable("display_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  displayId: varchar("display_id").notNull().references(() => displayComputers.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // track_event, field_event, standings, schedule
  targetId: varchar("target_id"), // eventId if showing specific event
  layout: text("layout"), // JSON config for display layout
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => ({
  displayIdIdx: index("display_assignments_display_id_idx").on(table.displayId),
}));

export const insertDisplayAssignmentSchema = createInsertSchema(displayAssignments).omit({ id: true, createdAt: true }).extend({
  targetType: displayTargetTypeEnum,
});
export type InsertDisplayAssignment = z.infer<typeof insertDisplayAssignmentSchema>;
export type DisplayAssignment = typeof displayAssignments.$inferSelect;

// Display Themes - Global theme configurations per meet
export const displayThemes = pgTable("display_themes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
  
  // Colors (stored as "H S% L%" format to match CSS variables)
  accentColor: text("accent_color").default("165 95% 50%"),
  bgColor: text("bg_color").default("220 15% 8%"),
  bgElevatedColor: text("bg_elevated_color").default("220 15% 12%"),
  bgBorderColor: text("bg_border_color").default("220 15% 18%"),
  fgColor: text("fg_color").default("0 0% 95%"),
  mutedColor: text("muted_color").default("0 0% 60%"),
  
  // Typography
  headingFont: text("heading_font").default("Barlow Semi Condensed"),
  bodyFont: text("body_font").default("Roboto"),
  numbersFont: text("numbers_font").default("Barlow Semi Condensed"),
  
  // Branding (JSONB for flexibility)
  logoUrl: text("logo_url"),
  sponsorLogos: jsonb("sponsor_logos").$type<{ url: string; label?: string; order: number }[]>(),
  
  // Feature toggles (JSONB for flexibility)
  features: jsonb("features").$type<{
    showTeamColors?: boolean;
    showReactionTimes?: boolean;
    showSplits?: boolean;
  }>().default({"showTeamColors":true,"showReactionTimes":true,"showSplits":true}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  meetIdIdx: index("display_themes_meet_id_idx").on(table.meetId),
  meetNameUnique: unique("display_themes_meet_name_unique").on(table.meetId, table.name),
}));

export const insertDisplayThemeSchema = createInsertSchema(displayThemes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDisplayTheme = z.infer<typeof insertDisplayThemeSchema>;
export type DisplayTheme = typeof displayThemes.$inferSelect;

// Board Configs - Per-board theme overrides
export const boardConfigs = pgTable("board_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  boardId: varchar("board_id").notNull().references(() => displayComputers.id, { onDelete: "cascade" }),
  themeId: varchar("theme_id").references(() => displayThemes.id, { onDelete: "set null" }),
  
  // Overrides (JSONB for flexibility - can override any theme field)
  overrides: jsonb("overrides").$type<{
    accentColor?: string;
    bgColor?: string;
    logoUrl?: string;
    features?: Record<string, boolean>;
    // ... any other theme fields
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  meetIdIdx: index("board_configs_meet_id_idx").on(table.meetId),
  boardUnique: unique("board_configs_board_unique").on(table.meetId, table.boardId),
}));

export const insertBoardConfigSchema = createInsertSchema(boardConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBoardConfig = z.infer<typeof insertBoardConfigSchema>;
export type SelectBoardConfig = typeof boardConfigs.$inferSelect;

// Display Layouts (multi-event grid configurations)
export const displayLayouts = pgTable("display_layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Main Stadium", "Field Events", etc.
  description: text("description"),
  rows: integer("rows").notNull().default(2),
  cols: integer("cols").notNull().default(2),
  isTemplate: boolean("is_template").default(false), // Can be reused across meets
  templateId: varchar("template_id"), // Reference to template if cloned
  version: integer("version").default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  meetIdIdx: index("display_layouts_meet_id_idx").on(table.meetId),
}));

export const insertDisplayLayoutSchema = createInsertSchema(displayLayouts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDisplayLayout = z.infer<typeof insertDisplayLayoutSchema>;
export type DisplayLayout = typeof displayLayouts.$inferSelect;

// Layout Cells (individual grid cells with board assignments)
export const layoutCells = pgTable("layout_cells", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layoutId: varchar("layout_id").notNull().references(() => displayLayouts.id, { onDelete: "cascade" }),
  row: integer("row").notNull(), // 0-indexed row position
  col: integer("col").notNull(), // 0-indexed col position
  rowSpan: integer("row_span").notNull().default(1),
  colSpan: integer("col_span").notNull().default(1),
  eventId: varchar("event_id"), // References events.id (nullable for empty cells)
  eventType: text("event_type"), // Fallback if event deleted: "track", "field", etc.
  boardType: text("board_type").notNull().default("live_time"), // "live_time", "single_result", "standings", "field_event"
  settings: jsonb("settings"), // Board-specific customization (colors, fonts, etc.)
}, (table) => ({
  layoutIdIdx: index("layout_cells_layout_id_idx").on(table.layoutId),
  layoutPositionUnique: unique("layout_cells_layout_position_unique").on(table.layoutId, table.row, table.col),
}));

export const insertLayoutCellSchema = createInsertSchema(layoutCells).omit({ id: true });
export type InsertLayoutCell = z.infer<typeof insertLayoutCellSchema>;
export type LayoutCell = typeof layoutCells.$inferSelect;

// ====================
// ASSET MANAGEMENT
// ====================

// Athlete Photos (headshots for display boards)
export const athletePhotos = pgTable("athlete_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id, { onDelete: "cascade" }),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(), // Relative path: uploads/athletes/{meetId}/{athleteId}/photo.jpg
  originalFilename: text("original_filename").notNull(),
  contentType: text("content_type").notNull(), // image/jpeg, image/png, etc.
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  byteSize: integer("byte_size").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
}, (table) => ({
  athleteIdIdx: index("athlete_photos_athlete_id_idx").on(table.athleteId),
  meetIdIdx: index("athlete_photos_meet_id_idx").on(table.meetId),
  athleteIdUnique: unique("athlete_photos_athlete_id_unique").on(table.athleteId), // One photo per athlete
}));

export const insertAthletePhotoSchema = createInsertSchema(athletePhotos).omit({ id: true, uploadedAt: true });
export type InsertAthletePhoto = z.infer<typeof insertAthletePhotoSchema>;
export type AthletePhoto = typeof athletePhotos.$inferSelect;

// Team Logos (for display alongside athlete names)
export const teamLogos = pgTable("team_logos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(), // Relative path: uploads/teams/{meetId}/{teamId}/logo.png
  originalFilename: text("original_filename").notNull(),
  contentType: text("content_type").notNull(), // image/png, image/svg+xml, etc.
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  byteSize: integer("byte_size").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
}, (table) => ({
  teamIdIdx: index("team_logos_team_id_idx").on(table.teamId),
  meetIdIdx: index("team_logos_meet_id_idx").on(table.meetId),
  teamIdUnique: unique("team_logos_team_id_unique").on(table.teamId), // One logo per team
}));

export const insertTeamLogoSchema = createInsertSchema(teamLogos).omit({ id: true, uploadedAt: true });
export type InsertTeamLogo = z.infer<typeof insertTeamLogoSchema>;
export type TeamLogo = typeof teamLogos.$inferSelect;

// ====================
// WEATHER STATION
// ====================

export const weatherStationConfigs = pgTable("weather_station_configs", {
  id: serial("id").primaryKey(),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  provider: varchar("provider").notNull().default("openweathermap"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  // API keys are encrypted at rest using AES-256-GCM with environment-stored key
  apiKey: text("api_key").notNull(),
  pollingIntervalSec: integer("polling_interval_sec").notNull().default(300),
  units: varchar("units").notNull().default("metric"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueMeet: unique().on(table.meetId)
}));

export const weatherReadings = pgTable("weather_readings", {
  id: serial("id").primaryKey(),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  provider: varchar("provider").notNull(),
  observedAt: timestamp("observed_at").notNull().defaultNow(),
  temperatureC: real("temperature_c").notNull(),
  windSpeedMs: real("wind_speed_ms").notNull(),
  windDirectionDeg: integer("wind_direction_deg").notNull(),
  humidityPct: integer("humidity_pct").notNull(),
  pressureHPa: integer("pressure_hpa").notNull(),
  precipitationMm: real("precipitation_mm"),
  rawData: jsonb("raw_data")
}, (table) => ({
  meetIdx: index("weather_readings_meet_idx").on(table.meetId),
  observedIdx: index("weather_readings_observed_idx").on(table.observedAt)
}));

export const insertWeatherConfigSchema = createInsertSchema(weatherStationConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  apiKey: z.string().min(1),
  pollingIntervalSec: z.number().min(60).default(300),
  units: z.enum(['metric', 'imperial']).default('metric')
});

export const insertWeatherReadingSchema = createInsertSchema(weatherReadings).omit({
  id: true
});

export type WeatherStationConfig = typeof weatherStationConfigs.$inferSelect;
export type InsertWeatherConfig = z.infer<typeof insertWeatherConfigSchema>;
export type WeatherReading = typeof weatherReadings.$inferSelect;
export type InsertWeatherReading = z.infer<typeof insertWeatherReadingSchema>;

// ====================
// DISPLAY DEVICES (Remote Display Management)
// ====================

export const displayDeviceStatusEnum = z.enum(['online', 'offline', 'idle']);
export type DisplayDeviceStatus = z.infer<typeof displayDeviceStatusEnum>;

export const displayModeEnum = z.enum(['track', 'field']);
export type DisplayMode = z.infer<typeof displayModeEnum>;

export const displayDevices = pgTable("display_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  deviceName: text("device_name").notNull(), // Friendly name for the display (e.g., "Finish Line Board", "Field Event 1")
  displayType: text("display_type").default("P10"), // P10, P6, or BigBoard - the physical display hardware type
  displayMode: text("display_mode").default("track"), // "track" = auto-show from Lynx port 5055, "field" = manual event assignment
  currentTemplate: text("current_template"), // The template/preset currently being shown (e.g., "p10-results", "meet-logo")
  lastIp: text("last_ip"), // Last known IP address
  assignedEventId: varchar("assigned_event_id").references(() => events.id, { onDelete: "set null" }), // Which event to show (only used for field mode)
  assignedLayoutId: integer("assigned_layout_id").references(() => compositeLayouts.id, { onDelete: "set null" }), // Optional: composite layout
  autoMode: boolean("auto_mode").default(true), // When true, display auto-switches templates based on Lynx timing events
  pagingSize: integer("paging_size").default(8), // Number of results to show at once (1-20)
  pagingInterval: integer("paging_interval").default(5), // Seconds between page scrolls (1-60)
  fieldPort: integer("field_port"),
  isBigBoard: boolean("is_big_board").default(false),
  displayWidth: integer("display_width"),
  displayHeight: integer("display_height"),
  status: text("status").default("offline"), // online, offline, idle
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  meetIdIdx: index("display_devices_meet_id_idx").on(table.meetId),
  statusIdx: index("display_devices_status_idx").on(table.status),
}));

export const insertDisplayDeviceSchema = createInsertSchema(displayDevices).omit({ 
  id: true, 
  createdAt: true,
  lastSeenAt: true 
});
export type InsertDisplayDevice = z.infer<typeof insertDisplayDeviceSchema>;
export type DisplayDevice = typeof displayDevices.$inferSelect;

// Display device with assigned event details
export type DisplayDeviceWithEvent = DisplayDevice & {
  assignedEvent?: Event;
};

// ====================
// COMPOSITE LAYOUTS
// ====================

// Composite Layouts - Template-driven multi-board layouts
export const compositeLayouts = pgTable('composite_layouts', {
  id: serial('id').primaryKey(),
  meetId: varchar('meet_id').references(() => meets.id, { onDelete: 'cascade' }), // varchar to match meets.id
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  aspectRatio: varchar('aspect_ratio', { length: 20 }).default('16:9'),
  previewUrl: text('preview_url'),
  backgroundStyle: varchar('background_style', { length: 50 }).default('default'),
  baseTheme: varchar('base_theme', { length: 50 }).default('stadium'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Layout Zones - Individual display zones within a composite layout
export const layoutZones = pgTable('layout_zones', {
  id: serial('id').primaryKey(),
  layoutId: integer('layout_id').references(() => compositeLayouts.id, { onDelete: 'cascade' }).notNull(),
  order: integer('order').notNull(),
  
  // Percentage-based positioning
  xPercent: real('x_percent').notNull(),
  yPercent: real('y_percent').notNull(),
  widthPercent: real('width_percent').notNull(),
  heightPercent: real('height_percent').notNull(),
  
  // Optional constraints
  minWidth: integer('min_width'),
  maxWidth: integer('max_width'),
  minHeight: integer('min_height'),
  maxHeight: integer('max_height'),
  
  // Board configuration
  boardType: boardTypeEnum('board_type').notNull(),
  dataBinding: jsonb('data_binding').notNull(),
  boardConfig: jsonb('board_config').notNull(),
  
  // Styling
  stylePreset: varchar('style_preset', { length: 50 }).default('none'),
  
  createdAt: timestamp('created_at').defaultNow()
});

// Data binding types (discriminated union)
export type DataBinding = 
  | { type: 'event'; eventId: string; heatNumber?: number; limit?: number } // eventId is string to match events.id
  | { type: 'current-event' }
  | { type: 'standings'; eventId?: string; limit?: number }
  | { type: 'static'; content: string };

// Board config types (discriminated union by board type)
export type BoardConfig = 
  | { boardType: 'athlete-card-grid'; cardSize: 'small' | 'medium' | 'large'; columns: number }
  | { boardType: 'athlete-card-single'; cardSize: 'small' | 'medium' | 'large' }
  | { boardType: 'attempt-tracker'; size: 'small' | 'medium' | 'large'; showMarks: boolean }
  | { boardType: 'live-timer'; mode: 'countdown' | 'stopwatch' | 'static'; size: 'small' | 'medium' | 'large'; showMillis: boolean }
  | { boardType: 'lane-visualization'; size: 'compact' | 'standard' | 'expanded'; totalLanes: number; showProgress: boolean; showTimes: boolean }
  | { boardType: 'standings-table'; maxRows: number; showPhotos: boolean }
  | { boardType: 'event-info'; fontSize: 'small' | 'medium' | 'large' }
  | { boardType: 'logo-banner'; height: number };

// Zod validation schemas
export const dataBindingSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('event'), eventId: z.string(), heatNumber: z.number().optional(), limit: z.number().optional() }),
  z.object({ type: z.literal('current-event') }),
  z.object({ type: z.literal('standings'), eventId: z.string().optional(), limit: z.number().optional() }),
  z.object({ type: z.literal('static'), content: z.string() }),
]);

export const boardConfigSchema = z.discriminatedUnion('boardType', [
  z.object({ boardType: z.literal('athlete-card-grid'), cardSize: z.enum(CARD_SIZES), columns: z.number() }),
  z.object({ boardType: z.literal('athlete-card-single'), cardSize: z.enum(CARD_SIZES) }),
  z.object({ boardType: z.literal('attempt-tracker'), size: z.enum(GENERAL_SIZES), showMarks: z.boolean() }),
  z.object({ boardType: z.literal('live-timer'), mode: z.enum(TIMER_MODES), size: z.enum(GENERAL_SIZES), showMillis: z.boolean() }),
  z.object({ boardType: z.literal('lane-visualization'), size: z.enum(LANE_SIZES), totalLanes: z.number(), showProgress: z.boolean(), showTimes: z.boolean() }),
  z.object({ boardType: z.literal('standings-table'), maxRows: z.number(), showPhotos: z.boolean() }),
  z.object({ boardType: z.literal('event-info'), fontSize: z.enum(FONT_SIZES) }),
  z.object({ boardType: z.literal('logo-banner'), height: z.number() }),
]);

export const stylePresetSchema = z.enum(STYLE_PRESETS);

// Insert/Select schemas
export const insertCompositeLayoutSchema = createInsertSchema(compositeLayouts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLayoutZoneSchema = createInsertSchema(layoutZones)
  .omit({ id: true, createdAt: true })
  .extend({
    dataBinding: dataBindingSchema,
    boardConfig: boardConfigSchema,
    stylePreset: stylePresetSchema,
  });
export const updateLayoutZoneSchema = insertLayoutZoneSchema.partial();

export type InsertCompositeLayout = z.infer<typeof insertCompositeLayoutSchema>;
export type InsertLayoutZone = z.infer<typeof insertLayoutZoneSchema>;

export type SelectCompositeLayout = typeof compositeLayouts.$inferSelect;
export type SelectLayoutZone = typeof layoutZones.$inferSelect;

// ====================
// SCENE-BASED LAYOUTS (ResulTV-style object system)
// ====================

// Object types available for insertion
export const LAYOUT_OBJECT_TYPES = [
  'results-table',      // Results/standings table for one or more events
  'timer',              // Live timer/clock display
  'event-header',       // Event name and info header
  'athlete-card',       // Single athlete display with photo
  'athlete-grid',       // Grid of multiple athletes
  'team-standings',     // Team score standings
  'lane-graphic',       // Lane assignment visualization
  'attempt-tracker',    // Field event attempt display
  'logo',               // Image/logo display
  'text',               // Custom text block
  'clock',              // Time of day
  'wind-reading',       // Wind speed display
  'split-times',        // Split times display
  'record-indicator',   // Meet/facility record indicator
  'field-transition',   // Curtain-wipe overlay triggered by field athlete call-up
] as const;
export type LayoutObjectType = typeof LAYOUT_OBJECT_TYPES[number];

// Data source types for binding objects to data
export const DATA_SOURCE_TYPES = [
  'events',             // Specific event ID(s)
  'current-track',      // Current track event from Lynx port 5055
  'current-field',      // Current field event from a port
  'live-data',          // Live timing data from specific port
  'standings',          // Team or individual standings
  'static',             // No dynamic data (logos, text, etc.)
] as const;
export type DataSourceType = typeof DATA_SOURCE_TYPES[number];

// Layout Scenes - Container for a collection of objects
export const layoutScenes = pgTable('layout_scenes', {
  id: serial('id').primaryKey(),
  meetId: varchar('meet_id').references(() => meets.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Canvas dimensions (reference size, objects use percentages)
  canvasWidth: integer('canvas_width').notNull().default(1920),
  canvasHeight: integer('canvas_height').notNull().default(1080),
  aspectRatio: varchar('aspect_ratio', { length: 20 }).default('16:9'),
  
  // Scene styling
  backgroundColor: varchar('background_color', { length: 50 }).default('#000000'),
  backgroundImage: text('background_image'),
  
  // Template/reuse flags
  isTemplate: boolean('is_template').default(false),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  meetIdIdx: index('layout_scenes_meet_id_idx').on(table.meetId),
}));

// Scene Data Binding - defines what data source(s) an object uses
export type SceneDataBinding = {
  sourceType: DataSourceType;
  eventIds?: string[];        // For 'events' type - specific event IDs
  lynxPort?: number;          // For 'live-data' or 'current-field' - which Lynx port
  fieldPort?: number;         // For field event objects - which field port (4560-4569) to bind to
  divisionId?: string;        // For 'standings' - filter by division
  limit?: number;             // Max number of results to show
  heatNumber?: number;        // For specific heat display
  showAllHeats?: boolean;     // Show combined results from all heats
  fieldCode?: string;         // For text objects - dynamic field code like {place}, {name}, etc.
  fieldKey?: string;          // For simple field boxes - key from FIELD_BINDINGS registry
  athleteIndex?: number;      // ResulTV-style line number (0-indexed). Line 1 = 0, Line 2 = 1, etc.
};

// Scene Object Config - type-specific configuration
export type SceneObjectConfig = {
  // Common options
  fontSize?: 'small' | 'medium' | 'large' | 'xlarge';
  showPhotos?: boolean;
  showTeamLogos?: boolean;
  showFlags?: boolean;
  maxRows?: number;
  columns?: number;
  
  // Timer options
  timerMode?: 'stopwatch' | 'countdown' | 'time-of-day';
  showMilliseconds?: boolean;
  
  // Lane visualization options
  totalLanes?: number;
  showProgress?: boolean;
  showTimes?: boolean;
  
  // Attempt tracker options
  showMarks?: boolean;
  highlightBest?: boolean;
  
  // Text options
  textContent?: string;
  textAlign?: 'left' | 'center' | 'right';
  text?: string;
  fontWeight?: string;
  textColor?: string;
  dynamicText?: string;
  
  // Logo options
  imageUrl?: string;
  imageFit?: 'contain' | 'cover' | 'fill';
  logoType?: 'meet' | 'custom';
  logoUrl?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  
  // Results table options
  boardType?: 'live-results' | 'live-time' | 'field-event' | 'standings' | 'scrolling';
  scrollOnComplete?: boolean;
  
  // Paging/scrolling options
  resultsPerPage?: number;
  pageDurationSeconds?: number;
  
  // Event header options
  staticText?: string;
  showStatus?: boolean;
  
  // Standings options
  maxTeams?: number;
  
  // Conditional visibility - hide object when condition is met
  conditionalVisibility?: 'always' | 'hide-when-no-wind' | 'hide-when-nwi';
};

// Scene Object Style - visual styling
export type SceneObjectStyle = {
  backgroundColor?: string;
  backgroundStyle?: 'solid' | 'transparent';
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderSides?: ('all' | 'top' | 'right' | 'bottom' | 'left')[];
  borderRadius?: number;
  opacity?: number;
  padding?: number;
  paddingLeft?: number;
  paddingRight?: number;
  fontFamily?: string;
  boxShadow?: string;
  fontSize?: string;
  textAlign?: 'left' | 'center' | 'right';
};

// Layout Objects - Individual objects within a scene
export const layoutObjects = pgTable('layout_objects', {
  id: serial('id').primaryKey(),
  sceneId: integer('scene_id').references(() => layoutScenes.id, { onDelete: 'cascade' }).notNull(),
  
  // Object identity
  name: varchar('name', { length: 255 }),
  objectType: varchar('object_type', { length: 50 }).notNull(),
  
  // Positioning (percentage-based for resolution independence)
  x: real('x').notNull(),           // Left position (0-100%)
  y: real('y').notNull(),           // Top position (0-100%)
  width: real('width').notNull(),   // Width (0-100%)
  height: real('height').notNull(), // Height (0-100%)
  
  // Layering and transform
  zIndex: integer('z_index').notNull().default(0),
  rotation: real('rotation').default(0),
  
  // Data binding - supports multiple event sources
  dataBinding: jsonb('data_binding').$type<SceneDataBinding>(),
  
  // Component-specific configuration
  config: jsonb('config').$type<SceneObjectConfig>(),
  
  // Visual styling
  style: jsonb('style').$type<SceneObjectStyle>(),
  
  // State
  visible: boolean('visible').default(true),
  locked: boolean('locked').default(false),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sceneIdIdx: index('layout_objects_scene_id_idx').on(table.sceneId),
}));

// Zod validation schemas for scene data
export const sceneDataBindingSchema = z.object({
  sourceType: z.enum(DATA_SOURCE_TYPES),
  eventIds: z.array(z.string()).optional(),
  lynxPort: z.number().optional(),
  divisionId: z.string().optional(),
  limit: z.number().optional(),
  heatNumber: z.number().optional(),
  showAllHeats: z.boolean().optional(),
  fieldCode: z.string().optional(),
  fieldKey: z.string().optional(),
  athleteIndex: z.number().optional(),
});

export const sceneObjectConfigSchema = z.object({
  fontSize: z.enum(['small', 'medium', 'large', 'xlarge']).optional(),
  showPhotos: z.boolean().optional(),
  showTeamLogos: z.boolean().optional(),
  showFlags: z.boolean().optional(),
  maxRows: z.number().optional(),
  columns: z.number().optional(),
  timerMode: z.enum(['stopwatch', 'countdown', 'time-of-day']).optional(),
  showMilliseconds: z.boolean().optional(),
  totalLanes: z.number().optional(),
  showProgress: z.boolean().optional(),
  showTimes: z.boolean().optional(),
  showMarks: z.boolean().optional(),
  highlightBest: z.boolean().optional(),
  textContent: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  imageUrl: z.string().optional(),
  imageFit: z.enum(['contain', 'cover', 'fill']).optional(),
  conditionalVisibility: z.enum(['always', 'hide-when-no-wind', 'hide-when-nwi']).optional(),
}).passthrough();

export const sceneObjectStyleSchema = z.object({
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  borderRadius: z.number().optional(),
  opacity: z.number().optional(),
  padding: z.number().optional(),
  paddingLeft: z.number().optional(),
  paddingRight: z.number().optional(),
  fontFamily: z.string().optional(),
  boxShadow: z.string().optional(),
}).passthrough();

// Insert/Select schemas
export const insertLayoutSceneSchema = createInsertSchema(layoutScenes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLayoutObjectSchema = createInsertSchema(layoutObjects)
  .omit({ id: true, createdAt: true })
  .extend({
    dataBinding: sceneDataBindingSchema.optional(),
    config: sceneObjectConfigSchema.optional(),
    style: sceneObjectStyleSchema.optional(),
  });

export type InsertLayoutScene = z.infer<typeof insertLayoutSceneSchema>;
export type InsertLayoutObject = z.infer<typeof insertLayoutObjectSchema>;
export type SelectLayoutScene = typeof layoutScenes.$inferSelect;
export type SelectLayoutObject = typeof layoutObjects.$inferSelect;

// Scene with all its objects
export type LayoutSceneWithObjects = SelectLayoutScene & {
  objects: SelectLayoutObject[];
};

// ====================
// SCENE TEMPLATE MAPPINGS
// ====================

// Display modes that can be mapped to custom scenes
export const SCENE_DISPLAY_MODES = [
  'meet_logo',
  'team_scores', 
  'start_list',
  'running_time',
  'track_results',
  'field_results',
  'field_results_vertical',   // Vertical field events (HJ, PV) - height bar display
  'field_results_horizontal', // Horizontal field events (LJ, TJ, SP, Discus) - distance display
  'field_standings',
  'multi_track',    // Multi-event track results (shows points)
  'multi_field',    // Multi-event field results (shows points)
  'multi_field_vertical',     // Multi-event vertical field results
  'multi_field_horizontal',   // Multi-event horizontal field results
] as const;
export type SceneDisplayMode = typeof SCENE_DISPLAY_MODES[number];

// Display types that can have scene mappings
export const SCENE_DISPLAY_TYPES = ['P10', 'P6', 'BigBoard', 'Custom'] as const;
export type SceneDisplayType = typeof SCENE_DISPLAY_TYPES[number];

// Scene Template Mappings - Links custom scenes to display types and modes
export const sceneTemplateMappings = pgTable('scene_template_mappings', {
  id: serial('id').primaryKey(),
  meetId: varchar('meet_id').references(() => meets.id, { onDelete: 'cascade' }),
  displayType: varchar('display_type', { length: 20 }).notNull(), // P10, P6, BigBoard
  displayMode: varchar('display_mode', { length: 50 }).notNull(), // start_list, running_time, etc.
  sceneId: integer('scene_id').references(() => layoutScenes.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  meetIdIdx: index('scene_template_mappings_meet_id_idx').on(table.meetId),
  uniqueMapping: unique('unique_display_mapping').on(table.meetId, table.displayType, table.displayMode),
}));

export const insertSceneTemplateMappingSchema = createInsertSchema(sceneTemplateMappings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSceneTemplateMapping = z.infer<typeof insertSceneTemplateMappingSchema>;
export type SelectSceneTemplateMapping = typeof sceneTemplateMappings.$inferSelect;

// ====================
// RECORDS SYSTEM
// ====================

// Record Books - Collections of records (Facility, Meet, National, etc.)
export const recordBooks = pgTable('record_books', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  scope: text('scope', { enum: ['facility', 'meet', 'national', 'international', 'custom'] }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Individual Records within a Record Book
export const records = pgTable('records', {
  id: serial('id').primaryKey(),
  recordBookId: integer('record_book_id').references(() => recordBooks.id, { onDelete: 'cascade' }).notNull(),
  eventType: text('event_type').notNull(),
  gender: text('gender').notNull(),
  performance: text('performance').notNull(),
  athleteName: text('athlete_name').notNull(),
  team: text('team'),
  date: timestamp('date').notNull(),
  location: text('location'),
  wind: text('wind'),
  notes: text('notes'),
  verifiedBy: text('verified_by'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  eventTypeIdx: index('records_event_type_idx').on(table.eventType),
  bookIdIdx: index('records_book_id_idx').on(table.recordBookId),
  genderIdx: index('records_gender_idx').on(table.gender),
}));

// Record scope enum
export const recordScopeEnum = z.enum(['facility', 'meet', 'national', 'international', 'custom']);
export type RecordScope = z.infer<typeof recordScopeEnum>;

// Insert/Select schemas for Record Books
export const insertRecordBookSchema = createInsertSchema(recordBooks).omit({ id: true, createdAt: true }).extend({
  scope: recordScopeEnum,
});
export type InsertRecordBook = z.infer<typeof insertRecordBookSchema>;
export type SelectRecordBook = typeof recordBooks.$inferSelect;

// Insert/Select schemas for Records
export const insertRecordSchema = createInsertSchema(records).omit({ id: true, createdAt: true }).extend({
  // Use custom validation instead of regex to handle both numeric and time formats
  performance: z.string().refine(
    (val) => parsePerformanceToSeconds(val) !== null,
    { message: 'Performance must be a valid number or time format (mm:ss.ss)' }
  ),
  eventType: z.string().min(1, 'Event type is required'),
  athleteName: z.string().min(1, 'Athlete name is required'),
});
export type InsertRecord = z.infer<typeof insertRecordSchema>;
export type SelectRecord = typeof records.$inferSelect;

// Record Book with Records (for detailed views)
export type RecordBookWithRecords = SelectRecordBook & {
  records: SelectRecord[];
};

// Record comparison result
export type RecordCheck = {
  recordId: number;
  recordBookId: number;
  recordBookName: string;
  isRecord: boolean;
  isTied: boolean;
  margin: string;
  existingPerformance: string;
  newPerformance: string;
};

// ====================
// TEAM SCORING SYSTEM
// ====================

// Scoring Presets (Global Reusable Templates)
export const scoringPresets = pgTable("scoring_presets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  defaultRelayMultiplier: real("default_relay_multiplier").default(1.0),
  allowRelayScoring: boolean("allow_relay_scoring").default(true),
  description: text("description"),
});

export const presetRules = pgTable("preset_rules", {
  id: serial("id").primaryKey(),
  presetId: integer("preset_id").notNull().references(() => scoringPresets.id, { onDelete: "cascade" }),
  place: integer("place").notNull(),
  points: real("points").notNull(),
  isRelayOverride: boolean("is_relay_override").default(false),
}, (table) => ({
  presetPlaceUnique: unique("preset_rules_preset_place").on(table.presetId, table.place, table.isRelayOverride),
}));

// Meet Scoring Profiles
export const meetScoringProfiles = pgTable("meet_scoring_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }).unique(),
  presetId: integer("preset_id").notNull().references(() => scoringPresets.id),
  genderMode: text("gender_mode").notNull().default("combined"),
  divisionMode: text("division_mode").notNull().default("overall"),
  allowRelayScoring: boolean("allow_relay_scoring").default(true),
  customTieBreak: jsonb("custom_tie_break").$type<{ rule: string; priority: number }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meetScoringOverrides = pgTable("meet_scoring_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => meetScoringProfiles.id, { onDelete: "cascade" }),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  pointsMap: jsonb("points_map").$type<Record<number, number>>(),
  relayMultiplier: real("relay_multiplier"),
}, (table) => ({
  profileEventUnique: unique("scoring_overrides_profile_event").on(table.profileId, table.eventId),
}));

export const meetScoringState = pgTable("meet_scoring_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => meetScoringProfiles.id, { onDelete: "cascade" }).unique(),
  lastComputedAt: timestamp("last_computed_at"),
  checksum: text("checksum"),
});

// Team Scoring Results (Cached Aggregations)
export const teamScoringResults = pgTable("team_scoring_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => meetScoringProfiles.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  gender: text("gender"),
  division: text("division"),
  pointsAwarded: real("points_awarded").notNull().default(0),
  eventBreakdown: jsonb("event_breakdown").$type<{ eventId: string; eventName: string; points: number; athletes: { athleteId: string; name: string; place: number; points: number }[] }[]>(),
  tieBreakData: jsonb("tie_break_data").$type<{ totalWins: number; headToHead: Record<string, number> }>(),
  computedAt: timestamp("computed_at").defaultNow(),
}, (table) => ({
  profileTeamIdx: index("team_scoring_results_profile_team").on(table.profileId, table.teamId),
}));

// Meet Scoring Rules (imported directly from HyTek MDB Scoring table)
export const meetScoringRules = pgTable("meet_scoring_rules", {
  id: serial("id").primaryKey(),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  gender: text("gender").notNull(),
  place: integer("place").notNull(),
  indScore: real("ind_score").notNull().default(0),
  relScore: real("rel_score").notNull().default(0),
  combevtScore: real("combevt_score").notNull().default(0),
}, (table) => ({
  meetGenderPlaceUnique: unique("meet_scoring_rules_meet_gender_place").on(table.meetId, table.gender, table.place),
}));

// Wind Readings (IAAF rules: winds >+2.0 m/s make results ineligible for records)
export const windReadings = pgTable("wind_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  heatNumber: integer("heat_number"), // For track events with heats
  attemptId: varchar("attempt_id"), // For field events (jump attempts)
  windSpeed: real("wind_speed").notNull(), // meters per second
  isLegal: boolean("is_legal").notNull(), // true if windSpeed <= 2.0
  source: varchar("source", { length: 50 }).default("manual"), // "manual", "gauge", "hytek"
  recordedAt: timestamp("recorded_at").defaultNow(),
  recorderId: varchar("recorder_id", { length: 100 })
});

export const insertWindReadingSchema = createInsertSchema(windReadings).omit({
  id: true,
  recordedAt: true,
  isLegal: true // Calculated server-side
});
export type InsertWindReading = z.infer<typeof insertWindReadingSchema>;
export type WindReading = typeof windReadings.$inferSelect;

// Field attempts table - individual attempt tracking
export const fieldAttempts = pgTable("field_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: varchar("entry_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
  attemptIndex: integer("attempt_index").notNull(), // 1-6
  status: varchar("status", { length: 20 }).notNull(), // "mark", "foul", "pass", "scratch"
  measurement: real("measurement"), // meters (null for foul/pass/scratch)
  measuredBy: varchar("measured_by", { length: 100 }),
  recordedAt: timestamp("recorded_at").defaultNow(),
  source: varchar("source", { length: 50 }).default("judge"), // "judge", "control", "import"
  notes: text("notes")
}, (table) => ({
  entryAttemptUnique: unique().on(table.entryId, table.attemptIndex)
}));

export const insertFieldAttemptSchema = createInsertSchema(fieldAttempts).omit({
  id: true,
  recordedAt: true
});
export type InsertFieldAttempt = z.infer<typeof insertFieldAttemptSchema>;
export type FieldAttempt = typeof fieldAttempts.$inferSelect;

// Judge tokens for event access
export const judgeTokens = pgTable("judge_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetId: varchar("meet_id").notNull().references(() => meets.id, { onDelete: "cascade" }),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }), // null = all events
  code: varchar("code", { length: 8 }).notNull().unique(), // e.g., "ABCD1234"
  pin: varchar("pin", { length: 6 }), // Optional PIN
  judgeName: varchar("judge_name", { length: 100 }),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertJudgeTokenSchema = createInsertSchema(judgeTokens).omit({
  id: true,
  createdAt: true
});
export type InsertJudgeToken = z.infer<typeof insertJudgeTokenSchema>;
export type JudgeToken = typeof judgeTokens.$inferSelect;

// ====================
// MEDAL TRACKING
// ====================

// Medal awards table - persists medal awards per event
export const medalAwards = pgTable("medal_awards", {
  id: serial("id").primaryKey(),
  meetId: varchar("meet_id").references(() => meets.id, { onDelete: "cascade" }).notNull(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  entryId: varchar("entry_id").references(() => entries.id, { onDelete: "cascade" }),
  medalType: text("medal_type").notNull(),
  tieRank: integer("tie_rank"),
  awardedAt: timestamp("awarded_at").defaultNow()
}, (table) => ({
  meetEventTeamUnique: unique().on(table.meetId, table.eventId, table.teamId, table.medalType)
}));

export const insertMedalAwardSchema = createInsertSchema(medalAwards).omit({
  id: true,
  awardedAt: true
}).extend({
  medalType: medalTypeEnum
});
export type InsertMedalAward = z.infer<typeof insertMedalAwardSchema>;
export type SelectMedalAward = typeof medalAwards.$inferSelect;

// Medal standings aggregated by team
export type MedalStanding = {
  teamId: string;
  teamName: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
};

// ====================
// COMBINED EVENTS (Decathlon, Heptathlon, Pentathlon)
// ====================

// Combined events (decathlon, heptathlon, pentathlon)
export const combinedEvents = pgTable("combined_events", {
  id: serial("id").primaryKey(),
  meetId: varchar("meet_id").references(() => meets.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(), // e.g., "Men's Decathlon"
  eventType: text("event_type").notNull(), // "decathlon", "heptathlon", "pentathlon"
  gender: text("gender").notNull(),
  status: text("status").default("scheduled").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Component events that make up combined event
export const combinedEventComponents = pgTable("combined_event_components", {
  id: serial("id").primaryKey(),
  combinedEventId: integer("combined_event_id").references(() => combinedEvents.id, { onDelete: "cascade" }).notNull(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  sequenceOrder: integer("sequence_order").notNull(), // 1-10 for decathlon
  day: integer("day"), // 1 or 2
  createdAt: timestamp("created_at").defaultNow()
});

// Athlete totals in combined events
export const combinedEventTotals = pgTable("combined_event_totals", {
  id: serial("id").primaryKey(),
  combinedEventId: integer("combined_event_id").references(() => combinedEvents.id, { onDelete: "cascade" }).notNull(),
  athleteId: varchar("athlete_id").references(() => athletes.id, { onDelete: "cascade" }).notNull(),
  totalPoints: integer("total_points").default(0),
  eventsCompleted: integer("events_completed").default(0),
  eventBreakdown: jsonb("event_breakdown"), // JSON array of {eventId, points, performance}
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  combinedAthleteUnique: unique().on(table.combinedEventId, table.athleteId)
}));

// Insert/Select schemas
export const insertCombinedEventSchema = createInsertSchema(combinedEvents).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertCombinedEvent = z.infer<typeof insertCombinedEventSchema>;
export type SelectCombinedEvent = typeof combinedEvents.$inferSelect;

export const insertCombinedEventComponentSchema = createInsertSchema(combinedEventComponents).omit({
  id: true,
  createdAt: true
});
export type InsertCombinedEventComponent = z.infer<typeof insertCombinedEventComponentSchema>;
export type SelectCombinedEventComponent = typeof combinedEventComponents.$inferSelect;

// Combined event standing
export type CombinedEventStanding = {
  rank: number;
  athleteId: string;
  athleteName: string;
  teamName?: string;
  totalPoints: number;
  eventsCompleted: number;
  breakdown: Array<{
    eventName: string;
    performance?: string;
    points: number;
  }>;
};

// ====================
// SPONSOR MANAGEMENT
// ====================

// Sponsor tiers enum
export const sponsorTierEnum = z.enum(['platinum', 'gold', 'silver', 'bronze', 'supporter']);
export type SponsorTier = z.infer<typeof sponsorTierEnum>;

// Sponsors table
export const sponsors = pgTable("sponsors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tier: text("tier").notNull(), // platinum, gold, silver, bronze, supporter
  logoStorageKey: text("logo_storage_key"), // FileStorage key
  logoUrl: text("logo_url"), // External URL alternative
  clickthroughUrl: text("clickthrough_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Sponsor assignments to meets/events
export const sponsorAssignments = pgTable("sponsor_assignments", {
  id: serial("id").primaryKey(),
  sponsorId: integer("sponsor_id").references(() => sponsors.id, { onDelete: "cascade" }).notNull(),
  meetId: varchar("meet_id").references(() => meets.id, { onDelete: "cascade" }),
  eventType: text("event_type"), // Optional: show sponsor only for specific events
  weight: integer("weight").default(1), // Higher weight = shown more often
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  priority: integer("priority").default(0), // For sorting
  createdAt: timestamp("created_at").defaultNow()
});

// Sponsor rotation profiles (per layout zone)
export const sponsorRotationProfiles = pgTable("sponsor_rotation_profiles", {
  id: serial("id").primaryKey(),
  meetId: varchar("meet_id").references(() => meets.id, { onDelete: "cascade" }).notNull(),
  zoneName: text("zone_name").notNull(), // e.g., "footer", "sidebar"
  displayMode: text("display_mode").notNull(), // "persistent", "footer", "interstitial"
  dwellMs: integer("dwell_ms").default(5000), // 5 seconds per sponsor
  transitionMs: integer("transition_ms").default(500), // 0.5 second transition
  maxQueueLength: integer("max_queue_length").default(10),
  fallbackAssetKey: text("fallback_asset_key"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  meetZoneUnique: unique().on(table.meetId, table.zoneName)
}));

// Insert/Select schemas
export const insertSponsorSchema = createInsertSchema(sponsors).omit({
  id: true,
  createdAt: true
}).extend({
  tier: sponsorTierEnum
});
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type SelectSponsor = typeof sponsors.$inferSelect;

export const insertSponsorAssignmentSchema = createInsertSchema(sponsorAssignments).omit({
  id: true,
  createdAt: true
});
export type InsertSponsorAssignment = z.infer<typeof insertSponsorAssignmentSchema>;
export type SelectSponsorAssignment = typeof sponsorAssignments.$inferSelect;

export const insertSponsorRotationProfileSchema = createInsertSchema(sponsorRotationProfiles).omit({
  id: true,
  createdAt: true
});
export type InsertSponsorRotationProfile = z.infer<typeof insertSponsorRotationProfileSchema>;
export type SelectSponsorRotationProfile = typeof sponsorRotationProfiles.$inferSelect;

// Zod schemas and types for scoring presets
export const insertScoringPresetSchema = createInsertSchema(scoringPresets).omit({ id: true });
export type InsertScoringPreset = z.infer<typeof insertScoringPresetSchema>;
export type ScoringPreset = typeof scoringPresets.$inferSelect;

export const insertPresetRuleSchema = createInsertSchema(presetRules).omit({ id: true });
export type InsertPresetRule = z.infer<typeof insertPresetRuleSchema>;
export type PresetRule = typeof presetRules.$inferSelect;

// Zod schemas and types for meet scoring profiles
export const genderModeEnum = z.enum(["combined", "separate"]);
export const divisionModeEnum = z.enum(["overall", "by_division"]);

export const insertMeetScoringProfileSchema = createInsertSchema(meetScoringProfiles).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  genderMode: genderModeEnum,
  divisionMode: divisionModeEnum,
});
export type InsertMeetScoringProfile = z.infer<typeof insertMeetScoringProfileSchema>;
export type MeetScoringProfile = typeof meetScoringProfiles.$inferSelect;

export const insertMeetScoringOverrideSchema = createInsertSchema(meetScoringOverrides).omit({ id: true });
export type InsertMeetScoringOverride = z.infer<typeof insertMeetScoringOverrideSchema>;
export type MeetScoringOverride = typeof meetScoringOverrides.$inferSelect;

export const insertMeetScoringStateSchema = createInsertSchema(meetScoringState).omit({ id: true });
export type InsertMeetScoringState = z.infer<typeof insertMeetScoringStateSchema>;
export type MeetScoringState = typeof meetScoringState.$inferSelect;

export const insertTeamScoringResultSchema = createInsertSchema(teamScoringResults).omit({ id: true, computedAt: true });
export type InsertTeamScoringResult = z.infer<typeof insertTeamScoringResultSchema>;
export type TeamScoringResult = typeof teamScoringResults.$inferSelect;

// Helper types for team scoring
export type TeamStandingsEntry = {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  totalPoints: number;
  eventCount: number;
  eventBreakdown: { eventId: string; eventName: string; points: number }[];
  rank: number;
};

export type EventPointsBreakdown = {
  eventId: string;
  eventName: string;
  entries: {
    place: number;
    athleteId: string;
    athleteName: string;
    teamId: string | null;
    teamName: string | null;
    points: number;
  }[];
};

export type ScoringPresetWithRules = ScoringPreset & {
  rules: PresetRule[];
};

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

// ====================
// FIELD EVENT STANDINGS TYPES
// ====================

export interface HorizontalStanding {
  athleteId: number;
  place: number;
  bestMark: number | null;
  bestMarkDisplay: string | null;
  attempts: FieldEventMark[];
  legalMarks: number[];
  isTied: boolean;
}

export interface VerticalStanding {
  athleteId: number;
  place: number;
  highestCleared: number | null;
  highestClearedDisplay: string | null;
  missesAtWinningHeight: number;
  totalMisses: number;
  attemptSequence: string;
  isTied: boolean;
  isEliminated: boolean;
}

export interface FieldEventUpdatePayload {
  athletes: (FieldEventAthlete & { entry?: Entry; athlete?: Athlete })[];
  marks: FieldEventMark[];
  heights?: FieldHeight[];
  standings: HorizontalStanding[] | VerticalStanding[];
  currentAthleteId: number | null;
  currentAttempt: number;
  currentHeight?: number;
  sessionStatus: string;
  eventType: 'horizontal' | 'vertical';
}

// WebSocket Message Types
export type WSMessage = 
  | { type: "board_update"; data: DisplayBoardState }
  | { type: "event_update"; data: Event }
  | { type: "entry_update"; data: Entry }
  | { type: "layout_update"; data: { layoutId: string; cellId?: string } }
  | { type: "team_scoring_update"; meetId: string; standings: TeamStandingsEntry[] }
  | { type: "medal_standings_update"; meetId: string; standings: MedalStanding[] }
  | { type: "check_in_update"; meetId: string; eventId: string; entry: EntryWithDetails }
  | { type: "split_update"; meetId: string; eventId: string; entryId: string; splits: EntrySplit[] }
  | { type: "wind_update"; meetId: string; eventId: string; reading: WindReading }
  | { type: "field_attempt_update"; meetId: string; eventId: string; entryId: string; attempt: FieldAttempt }
  | { type: "sponsor_rotation"; meetId: string; zoneName: string; sponsor: SelectSponsor }
  | { type: "combined_event_update"; meetId: string; combinedEventId: number; standings: CombinedEventStanding[] }
  | { type: "finishlynx_update"; meetId: string; timestamp: string }
  | { type: "connection_status"; connected: boolean }
  | { type: "overlay_show"; overlayType: string; config: Record<string, any> }
  | { type: "overlay_hide"; overlayType: string }
  | { type: "overlay_update"; overlayType: string; data: Record<string, any> }
  | { type: "weather_update"; meetId: string; reading: WeatherReading }
  | { type: "devices_updated"; data: { meetId: string } }
  | { type: "display_assignment"; data: { deviceId: string; deviceName: string; eventId: string | null; event: any; meet: any } }
  | { type: "track_mode_change"; data: { eventNumber: number; mode: TrackDisplayMode; eventId?: string; [key: string]: any } }
  | { type: "clock_update"; data: { eventNumber: number; time: string; command?: string } }
  | { type: "result_received"; data: { eventNumber: number; lane: number; place: number; time: string; athleteName?: string } }
  | { type: "field_mode_change"; data: { eventNumber: number; mode: FieldDisplayMode; [key: string]: any } }
  | { type: "field_athlete_up"; data: { eventNumber: number; athleteName: string; attemptNumber: number; mark?: string } }
  | { type: "lynx_connection"; data: { portType: LynxPortType; connected: boolean } }
  | { type: "field_event_update"; sessionId: number; eventId: string; meetId: string | null; update: FieldEventUpdatePayload }
  | { type: "lap_counter_update"; lap: number; mode: "lap" | "logo"; meetId?: string }
  | { type: "device_registered"; data: { deviceId: string; deviceName: string; meetId: string; assignedEventId?: string | null; status?: string; displayType?: string; fieldPort?: string | null; isBigBoard?: boolean; displayMode?: string; autoMode?: boolean } }
  | { type: "device_registration_error"; error: string }
  | { type: "layout-command"; data: { layout: string; command: any } }
  | { type: "lynx_clock"; data: { time: string; isRunning: boolean } }
  | { type: "lynx_wind"; data: { wind: string } }
  | { type: "lynx_page"; data: any }
  | { type: "hytek_import_complete"; meetId: string }
  | { type: "heat_counts_update"; meetId: string; heatCounts: any[] };

export type OverlayType = 'lower-third' | 'scorebug' | 'athlete-spotlight' | 'team-standings';

export interface OverlayConfig {
  type: OverlayType;
  meetId?: string;
  eventId?: string;
  athleteId?: string;
  teamId?: string;
  variant?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center';
}

// Zod validation schema for overlay payloads
export const overlayConfigSchema = z.object({
  overlayType: z.enum(['lower-third', 'scorebug', 'athlete-spotlight', 'team-standings']),
  config: z.object({
    meetId: z.string().optional(),
    eventId: z.string().optional(),
    athleteId: z.string().optional(),
    teamId: z.string().optional(),
    variant: z.string().optional()
  })
});

export type OverlayConfigPayload = z.infer<typeof overlayConfigSchema>;

// ====================
// RELATIONS
// ====================

import { relations } from "drizzle-orm";

export const eventsRelations = relations(events, ({ one, many }) => ({
  meet: one(meets, {
    fields: [events.meetId],
    references: [meets.id],
  }),
  entries: many(entries),
}));

export const athletesRelations = relations(athletes, ({ one, many }) => ({
  meet: one(meets, {
    fields: [athletes.meetId],
    references: [meets.id],
  }),
  team: one(teams, {
    fields: [athletes.teamId],
    references: [teams.id],
  }),
  division: one(divisions, {
    fields: [athletes.divisionId],
    references: [divisions.id],
  }),
  entries: many(entries),
  bests: many(athleteBests),
}));

export const athleteBestsRelations = relations(athleteBests, ({ one }) => ({
  athlete: one(athletes, {
    fields: [athleteBests.athleteId],
    references: [athletes.id],
  }),
  season: one(seasons, {
    fields: [athleteBests.seasonId],
    references: [seasons.id],
  }),
}));

export const entriesRelations = relations(entries, ({ one, many }) => ({
  event: one(events, {
    fields: [entries.eventId],
    references: [events.id],
  }),
  athlete: one(athletes, {
    fields: [entries.athleteId],
    references: [athletes.id],
  }),
  team: one(teams, {
    fields: [entries.teamId],
    references: [teams.id],
  }),
  division: one(divisions, {
    fields: [entries.divisionId],
    references: [divisions.id],
  }),
  splits: many(entrySplits),
}));

export const entrySplitsRelations = relations(entrySplits, ({ one }) => ({
  entry: one(entries, {
    fields: [entrySplits.entryId],
    references: [entries.id],
  }),
}));

export const seasonsRelations = relations(seasons, ({ many }) => ({
  meets: many(meets),
}));

export const meetsRelations = relations(meets, ({ one, many }) => ({
  season: one(seasons, {
    fields: [meets.seasonId],
    references: [seasons.id],
  }),
  events: many(events),
  teams: many(teams),
  divisions: many(divisions),
  athletes: many(athletes),
  displayComputers: many(displayComputers),
  displayAssignments: many(displayAssignments),
  displayThemes: many(displayThemes),
  boardConfigs: many(boardConfigs),
  displayLayouts: many(displayLayouts),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  meet: one(meets, {
    fields: [teams.meetId],
    references: [meets.id],
  }),
  athletes: many(athletes),
}));

export const divisionsRelations = relations(divisions, ({ one, many }) => ({
  meet: one(meets, {
    fields: [divisions.meetId],
    references: [meets.id],
  }),
  athletes: many(athletes),
}));

export const displayComputersRelations = relations(displayComputers, ({ one, many }) => ({
  meet: one(meets, {
    fields: [displayComputers.meetId],
    references: [meets.id],
  }),
  assignments: many(displayAssignments),
}));

export const displayAssignmentsRelations = relations(displayAssignments, ({ one }) => ({
  meet: one(meets, {
    fields: [displayAssignments.meetId],
    references: [meets.id],
  }),
  display: one(displayComputers, {
    fields: [displayAssignments.displayId],
    references: [displayComputers.id],
  }),
}));

export const displayThemesRelations = relations(displayThemes, ({ one, many }) => ({
  meet: one(meets, {
    fields: [displayThemes.meetId],
    references: [meets.id],
  }),
  boardConfigs: many(boardConfigs),
}));

export const boardConfigsRelations = relations(boardConfigs, ({ one }) => ({
  meet: one(meets, {
    fields: [boardConfigs.meetId],
    references: [meets.id],
  }),
  board: one(displayComputers, {
    fields: [boardConfigs.boardId],
    references: [displayComputers.id],
  }),
  theme: one(displayThemes, {
    fields: [boardConfigs.themeId],
    references: [displayThemes.id],
  }),
}));

export const displayLayoutsRelations = relations(displayLayouts, ({ one, many }) => ({
  meet: one(meets, {
    fields: [displayLayouts.meetId],
    references: [meets.id],
  }),
  cells: many(layoutCells),
}));

export const layoutCellsRelations = relations(layoutCells, ({ one }) => ({
  layout: one(displayLayouts, {
    fields: [layoutCells.layoutId],
    references: [displayLayouts.id],
  }),
}));

// ====================
// LYNX DATA INGEST CONFIGURATION
// ====================

// Track display modes for automatic state transitions
export const trackDisplayModeEnum = z.enum(['idle', 'start_list', 'running', 'photo_finish', 'results', 'awards']);
export type TrackDisplayMode = z.infer<typeof trackDisplayModeEnum>;

// Field display modes
export const fieldDisplayModeEnum = z.enum(['idle', 'athlete_up', 'attempt_in_progress', 'result_posted', 'standings']);
export type FieldDisplayMode = z.infer<typeof fieldDisplayModeEnum>;

// Lynx port types
// 'results_big' is for big board display (more lines per page), same parsing as 'results'
export const lynxPortTypeEnum = z.enum(['clock', 'results', 'results_big', 'field', 'start_list']);
export type LynxPortType = z.infer<typeof lynxPortTypeEnum>;

// Ingest configuration - stores TCP port settings for Lynx data
export const ingestConfig = pgTable('ingest_config', {
  id: serial('id').primaryKey(),
  meetId: varchar('meet_id').references(() => meets.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "FinishLynx Clock", "FinishLynx Results", "FieldLynx"
  portType: text('port_type').notNull(), // 'clock', 'results', 'field', 'start_list'
  port: integer('port').notNull(), // TCP port number
  host: text('host').default('0.0.0.0'), // Listen address
  enabled: boolean('enabled').default(true),
  lastDataAt: timestamp('last_data_at'),
  isConnected: boolean('is_connected').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertIngestConfigSchema = createInsertSchema(ingestConfig).omit({ id: true, createdAt: true, lastDataAt: true, isConnected: true });
export type InsertIngestConfig = z.infer<typeof insertIngestConfigSchema>;
export type IngestConfig = typeof ingestConfig.$inferSelect;

// Event Live State - tracks real-time state for each active event
export const eventLiveState = pgTable('event_live_state', {
  id: serial('id').primaryKey(),
  eventId: varchar('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  
  // Track event state
  trackMode: text('track_mode').default('idle'), // idle, start_list, running, photo_finish, results, awards
  isArmed: boolean('is_armed').default(false),
  isRunning: boolean('is_running').default(false),
  runningTime: text('running_time'), // Current clock time string
  startTime: timestamp('start_time'), // When the gun went off
  
  // Field event state
  fieldMode: text('field_mode').default('idle'), // idle, athlete_up, attempt_in_progress, result_posted, standings
  currentAthleteId: varchar('current_athlete_id').references(() => athletes.id, { onDelete: 'set null' }),
  currentAttemptNumber: integer('current_attempt_number'),
  currentHeight: text('current_height'), // For height events
  currentFlightNumber: integer('current_flight_number'),
  
  // Common
  lastLynxEventNumber: integer('last_lynx_event_number'), // Event # from Lynx data
  lastLynxHeatNumber: integer('last_lynx_heat_number'),
  lastUpdateAt: timestamp('last_update_at').defaultNow(),
  rawData: jsonb('raw_data'), // Last raw data received for debugging
}, (table) => ({
  eventIdIdx: index('event_live_state_event_id_idx').on(table.eventId),
}));

export const insertEventLiveStateSchema = createInsertSchema(eventLiveState).omit({ id: true, lastUpdateAt: true });
export type InsertEventLiveState = z.infer<typeof insertEventLiveStateSchema>;
export type EventLiveState = typeof eventLiveState.$inferSelect;

// Field Athlete Queue - tracks order of athletes in field events
export const fieldAthleteQueue = pgTable('field_athlete_queue', {
  id: serial('id').primaryKey(),
  eventId: varchar('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  athleteId: varchar('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }).notNull(),
  flightNumber: integer('flight_number').default(1),
  orderInFlight: integer('order_in_flight').notNull(),
  status: text('status').default('waiting'), // waiting, up, completed
  currentAttempt: integer('current_attempt').default(0),
}, (table) => ({
  eventIdIdx: index('field_athlete_queue_event_id_idx').on(table.eventId),
  statusIdx: index('field_athlete_queue_status_idx').on(table.status),
}));

export const insertFieldAthleteQueueSchema = createInsertSchema(fieldAthleteQueue).omit({ id: true });
export type InsertFieldAthleteQueue = z.infer<typeof insertFieldAthleteQueueSchema>;
export type FieldAthleteQueue = typeof fieldAthleteQueue.$inferSelect;

// Parsed Lynx packet structure (for in-memory use)
export interface LynxPacket {
  sourcePort: number;
  portType: LynxPortType;
  raw: string;
  eventNumber?: number;
  heatNumber?: number;
  laneNumber?: number;
  athleteName?: string;
  teamName?: string;
  time?: string;
  place?: number;
  status?: string; // 'armed', 'running', 'finished', etc.
  fieldMark?: string;
  attemptNumber?: number;
  attemptResult?: 'O' | 'X' | 'P' | '-'; // Pass, make, miss, skip
  timestamp: number;
}

// ====================
// LYNX CONFIGURATION (per-meet port settings)
// ====================

export const lynxConfigs = pgTable('lynx_configs', {
  id: serial('id').primaryKey(),
  meetId: varchar('meet_id').references(() => meets.id, { onDelete: 'cascade' }),
  portType: text('port_type').notNull(), // clock, results, field, start_list
  port: integer('port').notNull(),
  name: text('name').notNull(),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  meetIdIdx: index('lynx_configs_meet_id_idx').on(table.meetId),
}));

export const insertLynxConfigSchema = createInsertSchema(lynxConfigs).omit({ id: true, createdAt: true });
export type InsertLynxConfig = z.infer<typeof insertLynxConfigSchema>;
export type LynxConfig = typeof lynxConfigs.$inferSelect;

// ====================
// LIVE EVENT DATA (real-time results from Lynx)
// ====================

export const liveEventData = pgTable('live_event_data', {
  id: serial('id').primaryKey(),
  eventNumber: integer('event_number').notNull(),
  meetId: varchar('meet_id').references(() => meets.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // track, field
  mode: text('mode').notNull(), // start_list, running, results, athlete_up
  heat: integer('heat').default(1),
  totalHeats: integer('total_heats').default(1), // Total heats from database for "Heat X of Y" display
  round: integer('round').default(1),
  flight: integer('flight').default(1),
  wind: text('wind'),
  status: text('status'), // ARMED, RUNNING, OFFICIAL, etc.
  distance: text('distance'),
  eventName: text('event_name'), // Full event name for display (e.g., "100 Meters Finals")
  entries: jsonb('entries').default([]), // Array of athletes with results
  runningTime: text('running_time'),
  isArmed: boolean('is_armed').default(false),
  isRunning: boolean('is_running').default(false),
  lastUpdateAt: timestamp('last_update_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  eventNumberIdx: index('live_event_data_event_number_idx').on(table.eventNumber),
  meetIdIdx: index('live_event_data_meet_id_idx').on(table.meetId),
  eventTypeIdx: index('live_event_data_event_type_idx').on(table.eventType),
  uniqueEventHeat: unique('live_event_data_unique').on(table.eventNumber, table.heat, table.round, table.flight, table.eventType, table.meetId),
}));

export const insertLiveEventDataSchema = createInsertSchema(liveEventData).omit({ id: true, lastUpdateAt: true, createdAt: true });
export type InsertLiveEventData = z.infer<typeof insertLiveEventDataSchema>;
export type LiveEventData = typeof liveEventData.$inferSelect;

// Live track result entry structure
export interface LiveTrackEntry {
  place?: string;
  lane?: string;
  bib?: string;
  name?: string;
  affiliation?: string;
  time?: string;
  reactionTime?: string;
  lapsToGo?: string;
  cumulativeSplit?: string;
  lastSplit?: string;
  firstName?: string;
  lastName?: string;
}

// Live field result entry structure
export interface LiveFieldEntry {
  place?: string;
  name?: string;
  affiliation?: string;
  bib?: string;
  mark?: string;
  attemptNumber?: string;
  attempts?: string; // XO, XXO, etc.
  wind?: string;
  markConverted?: string;
  bestMark?: string;
  attemptMarks?: string[];
}

// Meet live state aggregate (for API responses)
export interface MeetLiveState {
  meetId: string;
  activeTrackEvent?: {
    event: Event;
    mode: TrackDisplayMode;
    runningTime?: string;
    isArmed: boolean;
    isRunning: boolean;
  };
  activeFieldEvents: Array<{
    event: Event;
    mode: FieldDisplayMode;
    currentAthlete?: Athlete;
    currentAttemptNumber?: number;
    currentHeight?: string;
  }>;
  recentResults: Array<{
    event: Event;
    results: Entry[];
  }>;
  teamScores?: TeamScoringResult[];
  timestamp: number;
}

// ====================
// FILE INGESTION SETTINGS
// ====================

// Meet ingestion settings - stores file paths for auto-import
export const meetIngestionSettings = pgTable('meet_ingestion_settings', {
  id: serial('id').primaryKey(),
  meetId: varchar('meet_id').references(() => meets.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Lynx Files settings
  lynxFilesDirectory: text('lynx_files_directory'), // Directory containing LIF/LFF files
  lynxFilesEnabled: boolean('lynx_files_enabled').default(false),
  lynxFilesLastScanAt: timestamp('lynx_files_last_scan_at'),
  lynxFilesProcessedCount: integer('lynx_files_processed_count').default(0),
  
  // HyTek MDB settings
  hytekMdbPath: text('hytek_mdb_path'), // Path to HyTek .mdb file
  hytekMdbEnabled: boolean('hytek_mdb_enabled').default(false),
  hytekMdbLastImportAt: timestamp('hytek_mdb_last_import_at'),
  hytekMdbLastHash: text('hytek_mdb_last_hash'), // File hash for change detection
  hytekMdbPollIntervalSec: integer('hytek_mdb_poll_interval_sec').default(60),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertMeetIngestionSettingsSchema = createInsertSchema(meetIngestionSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lynxFilesLastScanAt: true,
  lynxFilesProcessedCount: true,
  hytekMdbLastImportAt: true,
  hytekMdbLastHash: true,
});

export type InsertMeetIngestionSettings = z.infer<typeof insertMeetIngestionSettingsSchema>;
export type MeetIngestionSettings = typeof meetIngestionSettings.$inferSelect;

// Processed files tracking - prevents re-processing the same files
export const processedIngestionFiles = pgTable('processed_ingestion_files', {
  id: serial('id').primaryKey(),
  meetId: varchar('meet_id').references(() => meets.id, { onDelete: 'cascade' }).notNull(),
  filePath: text('file_path').notNull(),
  fileType: text('file_type').notNull(), // 'lif', 'lff', 'mdb'
  fileHash: text('file_hash').notNull(), // SHA256 hash of file content
  processedAt: timestamp('processed_at').defaultNow(),
  recordsProcessed: integer('records_processed').default(0),
}, (table) => ({
  meetFileIdx: index('processed_files_meet_idx').on(table.meetId),
  filePathIdx: index('processed_files_path_idx').on(table.filePath),
  meetFileUnique: unique('processed_files_meet_file_unique').on(table.meetId, table.filePath),
}));

export const insertProcessedFileSchema = createInsertSchema(processedIngestionFiles).omit({
  id: true,
  processedAt: true,
});

export type InsertProcessedFile = z.infer<typeof insertProcessedFileSchema>;
export type ProcessedFile = typeof processedIngestionFiles.$inferSelect;

// ====================
// FIELD EVENT ENTRY SYSTEM
// ====================

// Field Event Session - configuration for officiating a field event
export const fieldEventSessions = pgTable('field_event_sessions', {
  id: serial('id').primaryKey(),
  eventId: varchar('event_id').references(() => events.id, { onDelete: 'cascade' }), // Nullable for EVT-based sessions
  
  // Session status
  status: text('status').default('setup'), // setup, check_in, in_progress, completed
  
  // Measurement configuration
  measurementUnit: text('measurement_unit').default('metric'), // metric, english
  recordWind: boolean('record_wind').default(false), // For long jump, triple jump
  
  // Display configuration
  showBibNumbers: boolean('show_bib_numbers').default(true), // Show competitor numbers on screen
  
  // Attempt configuration (horizontal events)
  hasFinals: boolean('has_finals').default(false),
  prelimAttempts: integer('prelim_attempts').default(3), // Attempts in prelims
  finalsAttempts: integer('finals_attempts').default(3), // Additional attempts in finals
  athletesToFinals: integer('athletes_to_finals').default(8), // How many advance
  totalAttempts: integer('total_attempts').default(6), // If no prelims/finals split
  
  // Vertical event configuration
  aliveGroupSize: integer('alive_group_size'), // e.g., 5 for 5-alive
  stopAliveAtCount: integer('stop_alive_at_count'), // Stop alive groups when X athletes remain
  
  // Current state
  currentFlightNumber: integer('current_flight_number').default(1),
  currentAthleteIndex: integer('current_athlete_index').default(0),
  currentAttemptNumber: integer('current_attempt_number').default(1),
  currentHeightIndex: integer('current_height_index').default(0),
  isInFinals: boolean('is_in_finals').default(false),
  
  // Access control
  accessCode: varchar('access_code', { length: 6 }), // 6-char code for officials to join
  
  // Auto-export configuration
  lffExportPath: text('lff_export_path'), // Directory path for automatic LFF export after every change
  
  // EVT file import configuration
  evtFilePath: text('evt_file_path'), // Path to FinishLynx .evt file for athlete import
  evtEventNumber: integer('evt_event_number'), // Event number within the EVT file to match
  evtEventName: text('evt_event_name'), // Event name from EVT file (for display when no DB event)
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  eventIdIdx: index('field_event_sessions_event_idx').on(table.eventId),
  accessCodeIdx: index('field_event_sessions_access_code_idx').on(table.accessCode),
}));

export const insertFieldEventSessionSchema = createInsertSchema(fieldEventSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFieldEventSession = z.infer<typeof insertFieldEventSessionSchema>;
export type FieldEventSession = typeof fieldEventSessions.$inferSelect;

// Field Heights - height progression for vertical events
export const fieldHeights = pgTable('field_heights', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => fieldEventSessions.id, { onDelete: 'cascade' }).notNull(),
  heightIndex: integer('height_index').notNull(), // Order in progression (0, 1, 2...)
  heightMeters: real('height_meters').notNull(), // Height in meters
  isActive: boolean('is_active').default(true), // Can be disabled
  isJumpOff: boolean('is_jump_off').default(false), // Jump-off height
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sessionIdx: index('field_heights_session_idx').on(table.sessionId),
  sessionHeightUnique: unique('field_heights_session_height_unique').on(table.sessionId, table.heightIndex),
}));

export const insertFieldHeightSchema = createInsertSchema(fieldHeights).omit({
  id: true,
  createdAt: true,
});
export type InsertFieldHeight = z.infer<typeof insertFieldHeightSchema>;
export type FieldHeight = typeof fieldHeights.$inferSelect;

// Field Event Flights - manage athletes in flights
export const fieldEventFlights = pgTable('field_event_flights', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => fieldEventSessions.id, { onDelete: 'cascade' }).notNull(),
  flightNumber: integer('flight_number').notNull(),
  status: text('status').default('pending'), // pending, in_progress, completed
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sessionFlightUnique: unique('field_flights_session_flight_unique').on(table.sessionId, table.flightNumber),
}));

export const insertFieldEventFlightSchema = createInsertSchema(fieldEventFlights).omit({
  id: true,
  createdAt: true,
});
export type InsertFieldEventFlight = z.infer<typeof insertFieldEventFlightSchema>;
export type FieldEventFlight = typeof fieldEventFlights.$inferSelect;

// Field Athletes - athletes in a field event session with check-in status
export const fieldEventAthletes = pgTable('field_event_athletes', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => fieldEventSessions.id, { onDelete: 'cascade' }).notNull(),
  entryId: varchar('entry_id').references(() => entries.id, { onDelete: 'cascade' }), // Nullable for EVT imports
  flightNumber: integer('flight_number').default(1),
  orderInFlight: integer('order_in_flight').notNull(),
  
  // Check-in status
  checkInStatus: text('check_in_status').default('pending'), // pending, checked_in, scratched
  checkedInAt: timestamp('checked_in_at'),
  
  // Competition status
  competitionStatus: text('competition_status').default('waiting'), // waiting, up, on_deck, on_hold, completed, retired, checked_out
  checkedOutAt: timestamp('checked_out_at'),
  retiredAt: timestamp('retired_at'),
  
  // For vertical events - starting height (pass up)
  startingHeightIndex: integer('starting_height_index').default(0),
  
  // Best mark tracking
  bestMark: real('best_mark'),
  currentPlace: integer('current_place'),
  
  // EVT file import data (used when no entry exists)
  evtBibNumber: varchar('evt_bib_number', { length: 20 }),
  evtFirstName: varchar('evt_first_name', { length: 100 }),
  evtLastName: varchar('evt_last_name', { length: 100 }),
  evtTeam: varchar('evt_team', { length: 100 }),
  
  // Finals tracking
  isFinalist: boolean('is_finalist').default(false),
  finalsOrder: integer('finals_order'), // Order in finals flight
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  sessionIdx: index('field_event_athletes_session_idx').on(table.sessionId),
  entryIdx: index('field_event_athletes_entry_idx').on(table.entryId),
  sessionBibUnique: unique('field_event_athletes_session_bib_unique').on(table.sessionId, table.evtBibNumber),
}));

export const insertFieldEventAthleteSchema = createInsertSchema(fieldEventAthletes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  checkedInAt: true,
  checkedOutAt: true,
  retiredAt: true,
});
export type InsertFieldEventAthlete = z.infer<typeof insertFieldEventAthleteSchema>;
export type FieldEventAthlete = typeof fieldEventAthletes.$inferSelect;

// Field Event Marks - individual marks/attempts for field events
export const fieldEventMarks = pgTable('field_event_marks', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => fieldEventSessions.id, { onDelete: 'cascade' }).notNull(),
  athleteId: integer('athlete_id').references(() => fieldEventAthletes.id, { onDelete: 'cascade' }).notNull(),
  
  // Attempt info
  attemptNumber: integer('attempt_number').notNull(), // 1-6 for horizontal, varies for vertical
  heightIndex: integer('height_index'), // For vertical events - which height
  attemptAtHeight: integer('attempt_at_height'), // For vertical - attempt 1, 2, or 3 at this height
  
  // Mark data
  markType: text('mark_type').notNull(), // mark, foul, pass, scratch, cleared, missed
  measurement: real('measurement'), // Meters (null for foul/pass/scratch/missed)
  measurementDisplay: text('measurement_display'), // Original display format (e.g., "57-05.25")
  wind: real('wind'), // Wind reading for this attempt
  
  // Metadata
  isBest: boolean('is_best').default(false),
  isDarkMark: boolean('is_dark_mark').default(false), // Recorded but fouled
  darkMeasurement: real('dark_measurement'), // The dark mark value
  isFinalsRound: boolean('is_finals_round').default(false), // True if this mark was recorded during finals
  
  recordedAt: timestamp('recorded_at').defaultNow(),
}, (table) => ({
  sessionIdx: index('field_event_marks_session_idx').on(table.sessionId),
  athleteIdx: index('field_event_marks_athlete_idx').on(table.athleteId),
  athleteAttemptUnique: unique('field_event_marks_athlete_attempt_unique').on(table.athleteId, table.attemptNumber, table.heightIndex),
}));

export const insertFieldEventMarkSchema = createInsertSchema(fieldEventMarks).omit({
  id: true,
  recordedAt: true,
});
export type InsertFieldEventMark = z.infer<typeof insertFieldEventMarkSchema>;
export type FieldEventMark = typeof fieldEventMarks.$inferSelect;

// Type for field event session with related data
export interface FieldEventSessionWithDetails extends FieldEventSession {
  event?: Event;
  heights?: FieldHeight[];
  athletes?: (FieldEventAthlete & { entry?: Entry; athlete?: Athlete })[];
  marks?: FieldEventMark[];
}

// ====================
// EXTERNAL SCOREBOARDS
// ====================

// External Scoreboard - configuration for sending results to external displays
export const externalScoreboards = pgTable('external_scoreboards', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  
  // LSS file configuration
  lssDirectory: text('lss_directory'), // Directory to write/read LSS files
  
  // Network configuration
  targetIp: text('target_ip').notNull(),
  targetPort: integer('target_port').notNull(),
  
  // Field event session association
  sessionId: integer('session_id').references(() => fieldEventSessions.id, { onDelete: 'set null' }),
  
  // Device following - only receive updates from this specific device name
  followDeviceName: text('follow_device_name'), // null = receive from all devices
  
  // Status
  isActive: boolean('is_active').default(false),
  lastStatus: text('last_status'), // JSON string with connection status info
  lastSentAt: timestamp('last_sent_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  sessionIdx: index('external_scoreboards_session_idx').on(table.sessionId),
}));

export const insertExternalScoreboardSchema = createInsertSchema(externalScoreboards).omit({
  id: true,
  isActive: true,
  lastStatus: true,
  lastSentAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExternalScoreboard = z.infer<typeof insertExternalScoreboardSchema>;
export type ExternalScoreboard = typeof externalScoreboards.$inferSelect;
