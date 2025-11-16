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

// ====================
// EVENT TYPE CATEGORIZATION - SINGLE SOURCE OF TRUTH
// ====================

export const EVENT_TYPE_CATEGORIES = {
  TIME_EVENTS: [
    '100m', '200m', '400m', '800m', '1500m', '3000m', '5000m', '10000m',
    '110m_hurdles', '400m_hurdles',
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
}, (table) => ({
  meetCodeIdx: index("meet_code_idx").on(table.meetCode),
  seasonIdIdx: index("meets_season_id_idx").on(table.seasonId),
}));

export const insertMeetSchema = createInsertSchema(meets).omit({ id: true }).extend({
  status: meetStatusEnum.optional(),
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
  meetAthleteUnique: unique("athletes_meet_athlete_unique").on(table.meetId, table.athleteNumber),
}));

export const insertAthleteSchema = createInsertSchema(athletes).omit({ id: true });
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type Athlete = typeof athletes.$inferSelect;

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
  eventDate: timestamp("event_date"), // Scheduled date for this event
  eventTime: text("event_time"), // Scheduled time string (e.g., "2:30 PM")
  hytekStatus: text("hytek_status"), // unseeded, seeded, done, scored from MDB
  isScored: boolean("is_scored").default(false), // Derived: true if hytekStatus = 'done' or 'scored'
  lastResultSource: text("last_result_source"), // port, lif, lff, manual
  lastResultAt: timestamp("last_result_at"), // When results were last updated
}, (table) => ({
  meetEventUnique: unique("events_meet_event_unique").on(table.meetId, table.eventNumber),
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
  
  // Flags
  isDisqualified: boolean("is_disqualified").default(false),
  isScratched: boolean("is_scratched").default(false),
  
  // Notes
  notes: text("notes"),
}, (table) => ({
  eventAthleteUnique: unique("entries_event_athlete_unique").on(table.eventId, table.athleteId),
}));

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
export type BoardConfig = typeof boardConfigs.$inferSelect;

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
  | { type: "layout_update"; data: { layoutId: string; cellId?: string } }
  | { type: "connection_status"; connected: boolean };

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
