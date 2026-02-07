import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
  type Event,
  type InsertEvent,
  type Athlete,
  type InsertAthlete,
  type Entry,
  type InsertEntry,
  type Meet,
  type InsertMeet,
  type Team,
  type InsertTeam,
  type Division,
  type InsertDivision,
  type Season,
  type InsertSeason,
  type EntryWithDetails,
  type EventWithEntries,
  type DisplayDevice,
  type InsertDisplayDevice,
  type DisplayDeviceWithEvent,
  type DisplayComputer,
  type InsertDisplayComputer,
  type DisplayAssignment,
  type InsertDisplayAssignment,
  type DisplayTheme,
  type InsertDisplayTheme,
  type SelectBoardConfig,
  type InsertBoardConfig,
  type BoardConfig,
  type DisplayLayout,
  type InsertDisplayLayout,
  type LayoutCell,
  type InsertLayoutCell,
  type AthletePhoto,
  type InsertAthletePhoto,
  type TeamLogo,
  type InsertTeamLogo,
  type SelectCompositeLayout,
  type InsertCompositeLayout,
  type SelectLayoutZone,
  type InsertLayoutZone,
  type SelectRecordBook,
  type InsertRecordBook,
  type SelectRecord,
  type InsertRecord,
  type RecordCheck,
  type ScoringPreset,
  type InsertScoringPreset,
  type PresetRule,
  type InsertPresetRule,
  type MeetScoringProfile,
  type InsertMeetScoringProfile,
  type MeetScoringOverride,
  type InsertMeetScoringOverride,
  type MeetScoringState,
  type InsertMeetScoringState,
  type TeamScoringResult,
  type InsertTeamScoringResult,
  type TeamStandingsEntry,
  type EventPointsBreakdown,
  type EventSplitConfig,
  type InsertEventSplitConfig,
  type EntrySplit,
  type InsertEntrySplit,
  type WindReading,
  type InsertWindReading,
  type FieldAttempt,
  type InsertFieldAttempt,
  type JudgeToken,
  type InsertJudgeToken,
  type SelectSponsor,
  type InsertSponsor,
  type SelectSponsorAssignment,
  type InsertSponsorAssignment,
  type SelectSponsorRotationProfile,
  type InsertSponsorRotationProfile,
  type SelectMedalAward,
  type InsertMedalAward,
  type MedalStanding,
  type MedalType,
  type SelectCombinedEvent,
  type InsertCombinedEvent,
  type SelectCombinedEventComponent,
  type InsertCombinedEventComponent,
  type CombinedEventStanding,
  type QRCodeMeta,
  type SocialMediaPost,
  type WeatherStationConfig,
  type InsertWeatherConfig,
  type WeatherReading,
  type InsertWeatherReading,
  type LynxConfig,
  type InsertLynxConfig,
  type LiveEventData,
  type InsertLiveEventData,
  type AthleteBest,
  type InsertAthleteBest,
  type InsertLayoutScene,
  type InsertLayoutObject,
  type SelectLayoutScene,
  type SelectLayoutObject,
  type LayoutSceneWithObjects,
  type MeetIngestionSettings,
  type InsertMeetIngestionSettings,
  type ProcessedFile,
  type InsertProcessedFile,
  type ExternalScoreboard,
  type InsertExternalScoreboard,
  type FieldEventSession,
  type InsertFieldEventSession,
  type FieldHeight,
  type InsertFieldHeight,
  type FieldEventFlight,
  type InsertFieldEventFlight,
  type FieldEventAthlete,
  type InsertFieldEventAthlete,
  type FieldEventMark,
  type InsertFieldEventMark,
  type FieldEventSessionWithDetails,
  type SelectSceneTemplateMapping,
  type InsertSceneTemplateMapping,
  isTimeEvent,
  isDistanceEvent,
  isHeightEvent,
  parsePerformanceToSeconds,
} from "@shared/schema";
import type { IStorage, RecordBookWithRecords } from "../storage";
import * as fs from "fs";
import * as path from "path";

export interface SyncEvent {
  id: number;
  tableName: string;
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: string;
  createdAt: string;
  syncedAt: string | null;
}

export class SQLiteStorage implements IStorage {
  private db: Database.Database;
  private qrCodes: Map<string, QRCodeMeta> = new Map();

  getSqliteDb(): Database.Database {
    return this.db;
  }
  private socialMediaPosts: Map<string, SocialMediaPost> = new Map();
  private resultSignatures: Map<string, Date> = new Map();
  private externalScoreboards: Map<number, ExternalScoreboard> = new Map();
  private externalScoreboardIdCounter: number = 1;

  constructor(dbPath: string = ':memory:') {
    // Create the directory if it doesn't exist (for file-based databases)
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.createTables();
    try { this.db.prepare('ALTER TABLE display_devices ADD COLUMN field_port INTEGER DEFAULT NULL').run(); } catch(e) {}
    try { this.db.prepare('ALTER TABLE display_devices ADD COLUMN is_big_board INTEGER DEFAULT 0').run(); } catch(e) {}
  }

  private createTables(): void {
    this.db.exec(`
      -- Seasons
      CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        is_active INTEGER DEFAULT 1
      );

      -- Meets
      CREATE TABLE IF NOT EXISTS meets (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        season_id INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        location TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT DEFAULT 'upcoming',
        track_length INTEGER DEFAULT 400,
        logo_url TEXT,
        meet_code TEXT UNIQUE NOT NULL DEFAULT (upper(substr(hex(randomblob(3)), 1, 6))),
        mdb_path TEXT,
        auto_refresh INTEGER DEFAULT 0,
        refresh_interval INTEGER DEFAULT 30,
        last_import_at TEXT,
        primary_color TEXT DEFAULT '#0066CC',
        secondary_color TEXT DEFAULT '#003366',
        accent_color TEXT DEFAULT '#FFD700',
        text_color TEXT DEFAULT '#FFFFFF'
      );
      CREATE INDEX IF NOT EXISTS meets_meet_code_idx ON meets(meet_code);
      CREATE INDEX IF NOT EXISTS meets_season_id_idx ON meets(season_id);

      -- Teams
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        team_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        short_name TEXT,
        abbreviation TEXT,
        UNIQUE(meet_id, team_number)
      );
      CREATE INDEX IF NOT EXISTS teams_meet_id_idx ON teams(meet_id);

      -- Divisions
      CREATE TABLE IF NOT EXISTS divisions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        division_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        abbreviation TEXT,
        low_age INTEGER,
        high_age INTEGER,
        UNIQUE(meet_id, division_number)
      );
      CREATE INDEX IF NOT EXISTS divisions_meet_id_idx ON divisions(meet_id);

      -- Athletes
      CREATE TABLE IF NOT EXISTS athletes (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        athlete_number INTEGER NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        team_id TEXT,
        division_id TEXT,
        bib_number TEXT,
        gender TEXT,
        UNIQUE(meet_id, athlete_number)
      );
      CREATE INDEX IF NOT EXISTS athletes_meet_id_idx ON athletes(meet_id);

      -- Athlete Bests
      CREATE TABLE IF NOT EXISTS athlete_bests (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        best_type TEXT NOT NULL,
        mark REAL NOT NULL,
        season_id INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
        achieved_at TEXT,
        meet_name TEXT,
        source TEXT DEFAULT 'manual',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(athlete_id, event_type, best_type, season_id)
      );
      CREATE INDEX IF NOT EXISTS athlete_bests_athlete_idx ON athlete_bests(athlete_id);

      -- Events
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        event_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        gender TEXT NOT NULL,
        distance INTEGER,
        status TEXT NOT NULL DEFAULT 'scheduled',
        num_rounds INTEGER DEFAULT 1,
        num_lanes INTEGER DEFAULT 8,
        event_date TEXT,
        event_time TEXT,
        session_name TEXT,
        hytek_status TEXT,
        is_scored INTEGER DEFAULT 0,
        last_result_source TEXT,
        last_result_at TEXT,
        lynx_event_number TEXT,
        UNIQUE(meet_id, event_number)
      );

      -- Entries
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        event_id TEXT NOT NULL,
        athlete_id TEXT NOT NULL,
        team_id TEXT,
        division_id TEXT,
        seed_mark REAL,
        result_type TEXT NOT NULL DEFAULT 'time',
        preliminary_heat INTEGER,
        preliminary_lane INTEGER,
        quarterfinal_heat INTEGER,
        quarterfinal_lane INTEGER,
        semifinal_heat INTEGER,
        semifinal_lane INTEGER,
        final_heat INTEGER,
        final_lane INTEGER,
        preliminary_mark REAL,
        preliminary_place INTEGER,
        preliminary_wind REAL,
        quarterfinal_mark REAL,
        quarterfinal_place INTEGER,
        quarterfinal_wind REAL,
        semifinal_mark REAL,
        semifinal_place INTEGER,
        semifinal_wind REAL,
        final_mark REAL,
        final_place INTEGER,
        final_wind REAL,
        is_disqualified INTEGER DEFAULT 0,
        is_scratched INTEGER DEFAULT 0,
        scoring_status TEXT DEFAULT 'pending',
        scored_points REAL,
        notes TEXT,
        check_in_status TEXT DEFAULT 'pending',
        check_in_time TEXT,
        check_in_operator TEXT,
        check_in_method TEXT,
        UNIQUE(event_id, athlete_id)
      );

      -- Event Split Configs
      CREATE TABLE IF NOT EXISTS event_split_configs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        event_type TEXT NOT NULL,
        meet_id TEXT REFERENCES meets(id) ON DELETE CASCADE,
        split_order INTEGER NOT NULL,
        distance_meters INTEGER NOT NULL,
        label TEXT,
        expected_lap_count INTEGER,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Entry Splits
      CREATE TABLE IF NOT EXISTS entry_splits (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        split_config_id TEXT REFERENCES event_split_configs(id) ON DELETE SET NULL,
        split_index INTEGER NOT NULL,
        distance_meters INTEGER NOT NULL,
        elapsed_seconds REAL NOT NULL,
        source TEXT DEFAULT 'manual',
        recorded_at TEXT DEFAULT (datetime('now')),
        recorder_id TEXT
      );

      -- Display Computers
      CREATE TABLE IF NOT EXISTS display_computers (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        computer_name TEXT NOT NULL,
        auth_token TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
        last_seen_at TEXT,
        is_online INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS display_computers_meet_id_idx ON display_computers(meet_id);

      -- Display Assignments
      CREATE TABLE IF NOT EXISTS display_assignments (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        display_id TEXT NOT NULL REFERENCES display_computers(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL,
        target_id TEXT,
        layout TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS display_assignments_display_id_idx ON display_assignments(display_id);

      -- Display Devices
      CREATE TABLE IF NOT EXISTS display_devices (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        device_name TEXT NOT NULL,
        display_type TEXT NOT NULL DEFAULT 'P10',
        display_mode TEXT DEFAULT 'track',
        status TEXT DEFAULT 'offline',
        assigned_event_id TEXT,
        assigned_layout_id INTEGER,
        auto_mode INTEGER DEFAULT 1,
        paging_size INTEGER DEFAULT 8,
        paging_interval INTEGER DEFAULT 5,
        field_port INTEGER DEFAULT NULL,
        is_big_board INTEGER DEFAULT 0,
        current_template TEXT,
        last_ip TEXT,
        last_seen_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS display_devices_meet_id_idx ON display_devices(meet_id);

      -- Display Themes
      CREATE TABLE IF NOT EXISTS display_themes (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        accent_color TEXT DEFAULT '165 95% 50%',
        bg_color TEXT DEFAULT '220 15% 8%',
        bg_elevated_color TEXT DEFAULT '220 15% 12%',
        bg_border_color TEXT DEFAULT '220 15% 18%',
        fg_color TEXT DEFAULT '0 0% 95%',
        muted_color TEXT DEFAULT '0 0% 60%',
        heading_font TEXT DEFAULT 'Barlow Semi Condensed',
        body_font TEXT DEFAULT 'Roboto',
        numbers_font TEXT DEFAULT 'Barlow Semi Condensed',
        logo_url TEXT,
        sponsor_logos TEXT,
        features TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Board Configs
      CREATE TABLE IF NOT EXISTS board_configs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        board_id TEXT NOT NULL,
        theme_id TEXT,
        overrides TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Display Layouts
      CREATE TABLE IF NOT EXISTS display_layouts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        rows INTEGER NOT NULL DEFAULT 2,
        cols INTEGER NOT NULL DEFAULT 2,
        is_template INTEGER DEFAULT 0,
        template_id TEXT,
        version INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Layout Cells
      CREATE TABLE IF NOT EXISTS layout_cells (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        layout_id TEXT NOT NULL REFERENCES display_layouts(id) ON DELETE CASCADE,
        row INTEGER NOT NULL,
        col INTEGER NOT NULL,
        row_span INTEGER DEFAULT 1,
        col_span INTEGER DEFAULT 1,
        event_id TEXT,
        event_type TEXT,
        board_type TEXT NOT NULL DEFAULT 'live_time',
        settings TEXT
      );

      -- Athlete Photos
      CREATE TABLE IF NOT EXISTS athlete_photos (
        athlete_id TEXT PRIMARY KEY,
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        storage_key TEXT NOT NULL,
        original_filename TEXT,
        content_type TEXT,
        width INTEGER,
        height INTEGER,
        byte_size INTEGER,
        uploaded_at TEXT DEFAULT (datetime('now'))
      );

      -- Team Logos
      CREATE TABLE IF NOT EXISTS team_logos (
        team_id TEXT PRIMARY KEY,
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        storage_key TEXT NOT NULL,
        original_filename TEXT,
        content_type TEXT,
        width INTEGER,
        height INTEGER,
        byte_size INTEGER,
        uploaded_at TEXT DEFAULT (datetime('now'))
      );

      -- Composite Layouts
      CREATE TABLE IF NOT EXISTS composite_layouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT REFERENCES meets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        aspect_ratio TEXT DEFAULT '16:9',
        preview_url TEXT,
        background_style TEXT DEFAULT 'default',
        base_theme TEXT DEFAULT 'stadium',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Layout Zones
      CREATE TABLE IF NOT EXISTS layout_zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        layout_id INTEGER NOT NULL REFERENCES composite_layouts(id) ON DELETE CASCADE,
        display_order INTEGER NOT NULL,
        x_percent REAL NOT NULL,
        y_percent REAL NOT NULL,
        width_percent REAL NOT NULL,
        height_percent REAL NOT NULL,
        min_width INTEGER,
        max_width INTEGER,
        min_height INTEGER,
        max_height INTEGER,
        board_type TEXT NOT NULL,
        data_binding TEXT NOT NULL,
        board_config TEXT NOT NULL,
        style_preset TEXT DEFAULT 'none',
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Record Books
      CREATE TABLE IF NOT EXISTS record_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        scope TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Records
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_book_id INTEGER NOT NULL REFERENCES record_books(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        gender TEXT NOT NULL,
        performance TEXT NOT NULL,
        athlete_name TEXT NOT NULL,
        team TEXT,
        date TEXT NOT NULL,
        location TEXT,
        wind TEXT,
        notes TEXT,
        verified_by TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS records_event_type_idx ON records(event_type);
      CREATE INDEX IF NOT EXISTS records_book_id_idx ON records(record_book_id);
      CREATE INDEX IF NOT EXISTS records_gender_idx ON records(gender);

      -- Scoring Presets
      CREATE TABLE IF NOT EXISTS scoring_presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        default_relay_multiplier REAL DEFAULT 1.0,
        allow_relay_scoring INTEGER DEFAULT 1,
        description TEXT
      );

      -- Preset Rules
      CREATE TABLE IF NOT EXISTS preset_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        preset_id INTEGER NOT NULL REFERENCES scoring_presets(id) ON DELETE CASCADE,
        place INTEGER NOT NULL,
        points REAL NOT NULL,
        is_relay_override INTEGER DEFAULT 0,
        UNIQUE(preset_id, place, is_relay_override)
      );

      -- Meet Scoring Profiles
      CREATE TABLE IF NOT EXISTS meet_scoring_profiles (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT UNIQUE NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        preset_id INTEGER NOT NULL REFERENCES scoring_presets(id),
        gender_mode TEXT NOT NULL DEFAULT 'combined',
        division_mode TEXT NOT NULL DEFAULT 'overall',
        allow_relay_scoring INTEGER DEFAULT 1,
        custom_tie_break TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Meet Scoring Overrides
      CREATE TABLE IF NOT EXISTS meet_scoring_overrides (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        profile_id TEXT NOT NULL REFERENCES meet_scoring_profiles(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL,
        points_map TEXT,
        relay_multiplier REAL,
        UNIQUE(profile_id, event_id)
      );

      -- Meet Scoring State
      CREATE TABLE IF NOT EXISTS meet_scoring_state (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        profile_id TEXT UNIQUE NOT NULL REFERENCES meet_scoring_profiles(id) ON DELETE CASCADE,
        last_computed_at TEXT,
        checksum TEXT
      );

      -- Team Scoring Results
      CREATE TABLE IF NOT EXISTS team_scoring_results (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        profile_id TEXT NOT NULL REFERENCES meet_scoring_profiles(id) ON DELETE CASCADE,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        event_id TEXT,
        gender TEXT,
        division TEXT,
        points_awarded REAL NOT NULL DEFAULT 0,
        event_breakdown TEXT,
        tie_break_data TEXT,
        computed_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS team_scoring_results_profile_team ON team_scoring_results(profile_id, team_id);

      -- Wind Readings
      CREATE TABLE IF NOT EXISTS wind_readings (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        heat_number INTEGER,
        attempt_id TEXT,
        wind_speed REAL NOT NULL,
        is_legal INTEGER NOT NULL,
        source TEXT DEFAULT 'manual',
        recorded_at TEXT DEFAULT (datetime('now')),
        recorder_id TEXT
      );

      -- Field Attempts
      CREATE TABLE IF NOT EXISTS field_attempts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        attempt_index INTEGER NOT NULL,
        status TEXT NOT NULL,
        measurement REAL,
        measured_by TEXT,
        recorded_at TEXT DEFAULT (datetime('now')),
        source TEXT DEFAULT 'judge',
        notes TEXT,
        UNIQUE(entry_id, attempt_index)
      );

      -- Judge Tokens
      CREATE TABLE IF NOT EXISTS judge_tokens (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
        code TEXT UNIQUE NOT NULL,
        pin TEXT,
        judge_name TEXT,
        is_active INTEGER DEFAULT 1,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Sponsors
      CREATE TABLE IF NOT EXISTS sponsors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tier TEXT NOT NULL,
        logo_storage_key TEXT,
        logo_url TEXT,
        clickthrough_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Sponsor Assignments
      CREATE TABLE IF NOT EXISTS sponsor_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
        meet_id TEXT REFERENCES meets(id) ON DELETE CASCADE,
        event_type TEXT,
        weight INTEGER DEFAULT 1,
        start_at TEXT,
        end_at TEXT,
        priority INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Sponsor Rotation Profiles
      CREATE TABLE IF NOT EXISTS sponsor_rotation_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        zone_name TEXT NOT NULL,
        display_mode TEXT NOT NULL,
        dwell_ms INTEGER DEFAULT 5000,
        transition_ms INTEGER DEFAULT 500,
        max_queue_length INTEGER DEFAULT 10,
        fallback_asset_key TEXT,
        is_active INTEGER DEFAULT 1
      );

      -- Medal Awards
      CREATE TABLE IF NOT EXISTS medal_awards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
        medal_type TEXT NOT NULL,
        tie_rank INTEGER,
        awarded_at TEXT DEFAULT (datetime('now')),
        UNIQUE(meet_id, event_id, team_id, medal_type)
      );

      -- Combined Events
      CREATE TABLE IF NOT EXISTS combined_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        gender TEXT NOT NULL,
        status TEXT DEFAULT 'scheduled',
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Combined Event Components
      CREATE TABLE IF NOT EXISTS combined_event_components (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        combined_event_id INTEGER NOT NULL REFERENCES combined_events(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        sequence_order INTEGER NOT NULL,
        day INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Combined Event Totals
      CREATE TABLE IF NOT EXISTS combined_event_totals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        combined_event_id INTEGER NOT NULL REFERENCES combined_events(id) ON DELETE CASCADE,
        athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
        total_points INTEGER DEFAULT 0,
        events_completed INTEGER DEFAULT 0,
        event_breakdown TEXT,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(combined_event_id, athlete_id)
      );

      -- Weather Station Configs
      CREATE TABLE IF NOT EXISTS weather_station_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT NOT NULL UNIQUE REFERENCES meets(id) ON DELETE CASCADE,
        provider TEXT NOT NULL DEFAULT 'openweathermap',
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        api_key TEXT NOT NULL,
        polling_interval_sec INTEGER NOT NULL DEFAULT 300,
        units TEXT NOT NULL DEFAULT 'metric',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Weather Readings
      CREATE TABLE IF NOT EXISTS weather_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        observed_at TEXT NOT NULL DEFAULT (datetime('now')),
        temperature_c REAL NOT NULL,
        wind_speed_ms REAL NOT NULL,
        wind_direction_deg INTEGER NOT NULL,
        humidity_pct INTEGER NOT NULL,
        pressure_hpa INTEGER NOT NULL,
        precipitation_mm REAL,
        raw_data TEXT
      );
      CREATE INDEX IF NOT EXISTS weather_readings_meet_idx ON weather_readings(meet_id);
      CREATE INDEX IF NOT EXISTS weather_readings_observed_idx ON weather_readings(observed_at);

      -- Lynx Configs
      CREATE TABLE IF NOT EXISTS lynx_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT REFERENCES meets(id) ON DELETE CASCADE,
        port_type TEXT NOT NULL,
        port INTEGER NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS lynx_configs_meet_id_idx ON lynx_configs(meet_id);

      -- Live Event Data
      CREATE TABLE IF NOT EXISTS live_event_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_number INTEGER NOT NULL,
        meet_id TEXT REFERENCES meets(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        mode TEXT NOT NULL,
        heat INTEGER DEFAULT 1,
        round INTEGER DEFAULT 1,
        flight INTEGER DEFAULT 1,
        wind TEXT,
        status TEXT,
        distance TEXT,
        entries TEXT DEFAULT '[]',
        running_time TEXT,
        is_armed INTEGER DEFAULT 0,
        is_running INTEGER DEFAULT 0,
        last_update_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(event_number, heat, round, flight, event_type, meet_id)
      );
      CREATE INDEX IF NOT EXISTS live_event_data_event_number_idx ON live_event_data(event_number);
      CREATE INDEX IF NOT EXISTS live_event_data_meet_id_idx ON live_event_data(meet_id);

      -- Layout Scenes
      CREATE TABLE IF NOT EXISTS layout_scenes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT REFERENCES meets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        canvas_width INTEGER DEFAULT 1920,
        canvas_height INTEGER DEFAULT 1080,
        aspect_ratio TEXT DEFAULT '16:9',
        background_color TEXT DEFAULT '#000000',
        background_image TEXT,
        is_template INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS layout_scenes_meet_id_idx ON layout_scenes(meet_id);

      -- Layout Objects
      CREATE TABLE IF NOT EXISTS layout_objects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scene_id INTEGER NOT NULL REFERENCES layout_scenes(id) ON DELETE CASCADE,
        name TEXT,
        object_type TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        z_index INTEGER DEFAULT 0,
        rotation REAL DEFAULT 0,
        data_binding TEXT,
        config TEXT,
        style TEXT,
        visible INTEGER DEFAULT 1,
        locked INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS layout_objects_scene_id_idx ON layout_objects(scene_id);

      -- Meet Ingestion Settings
      CREATE TABLE IF NOT EXISTS meet_ingestion_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT UNIQUE NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        lynx_files_directory TEXT,
        lynx_files_enabled INTEGER DEFAULT 0,
        lynx_files_last_scan_at TEXT,
        lynx_files_processed_count INTEGER DEFAULT 0,
        hytek_mdb_path TEXT,
        hytek_mdb_enabled INTEGER DEFAULT 0,
        hytek_mdb_last_import_at TEXT,
        hytek_mdb_last_hash TEXT,
        hytek_mdb_poll_interval_sec INTEGER DEFAULT 60,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Processed Ingestion Files
      CREATE TABLE IF NOT EXISTS processed_ingestion_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        processed_at TEXT DEFAULT (datetime('now')),
        records_processed INTEGER DEFAULT 0,
        UNIQUE(meet_id, file_path)
      );
      CREATE INDEX IF NOT EXISTS processed_files_meet_idx ON processed_ingestion_files(meet_id);
      CREATE INDEX IF NOT EXISTS processed_files_path_idx ON processed_ingestion_files(file_path);

      -- Sync Events (for tracking outbound changes)
      CREATE TABLE IF NOT EXISTS sync_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('insert', 'update', 'delete')),
        payload TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        synced_at TEXT
      );
      CREATE INDEX IF NOT EXISTS sync_events_pending_idx ON sync_events(synced_at) WHERE synced_at IS NULL;

      -- Scene Template Mappings (maps display type + mode to scene)
      CREATE TABLE IF NOT EXISTS scene_template_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id TEXT REFERENCES meets(id) ON DELETE CASCADE,
        display_type TEXT NOT NULL,
        display_mode TEXT NOT NULL,
        scene_id INTEGER NOT NULL REFERENCES layout_scenes(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(meet_id, display_type, display_mode)
      );
      CREATE INDEX IF NOT EXISTS scene_template_mappings_meet_id_idx ON scene_template_mappings(meet_id);
    `);
  }

  private generateId(): string {
    return randomUUID();
  }

  private toBoolean(val: number | null | undefined): boolean {
    return val === 1;
  }

  private fromBoolean(val: boolean | null | undefined): number {
    return val ? 1 : 0;
  }

  private parseJson<T>(json: string | null | undefined): T | null {
    if (!json) return null;
    try {
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }

  private toJson(obj: any): string {
    return JSON.stringify(obj);
  }

  private logSyncEvent(tableName: string, recordId: string, operation: 'insert' | 'update' | 'delete', payload: any): void {
    this.db.prepare(`
      INSERT INTO sync_events (table_name, record_id, operation, payload)
      VALUES (?, ?, ?, ?)
    `).run(tableName, recordId, operation, this.toJson(payload));
  }

  public getPendingSyncEvents(): SyncEvent[] {
    const rows = this.db.prepare('SELECT * FROM sync_events WHERE synced_at IS NULL ORDER BY created_at ASC').all();
    return rows as SyncEvent[];
  }

  public markSyncEventsCompleted(ids: number[]): void {
    if (ids.length === 0) return;
    const stmt = this.db.prepare(`UPDATE sync_events SET synced_at = datetime('now') WHERE id = ?`);
    const transaction = this.db.transaction(() => {
      for (const id of ids) {
        stmt.run(id);
      }
    });
    transaction();
  }

  public clearSyncedEvents(): void {
    this.db.prepare('DELETE FROM sync_events WHERE synced_at IS NOT NULL').run();
  }

  private mapMeetRow(row: any): Meet {
    return {
      id: row.id,
      seasonId: row.season_id,
      name: row.name,
      location: row.location,
      startDate: row.start_date ? new Date(row.start_date) : new Date(),
      endDate: row.end_date ? new Date(row.end_date) : null,
      status: row.status,
      trackLength: row.track_length,
      logoUrl: row.logo_url,
      meetCode: row.meet_code,
      mdbPath: row.mdb_path,
      autoRefresh: this.toBoolean(row.auto_refresh),
      refreshInterval: row.refresh_interval,
      lastImportAt: row.last_import_at ? new Date(row.last_import_at) : null,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      accentColor: row.accent_color,
      textColor: row.text_color,
    };
  }

  private mapEventRow(row: any): Event {
    return {
      id: row.id,
      meetId: row.meet_id,
      eventNumber: row.event_number,
      name: row.name,
      eventType: row.event_type,
      gender: row.gender,
      distance: row.distance,
      status: row.status,
      numRounds: row.num_rounds,
      numLanes: row.num_lanes,
      eventDate: row.event_date ? new Date(row.event_date) : null,
      eventTime: row.event_time,
      sessionName: row.session_name,
      hytekStatus: row.hytek_status,
      isScored: this.toBoolean(row.is_scored),
      advanceByPlace: row.advance_by_place ?? null,
      advanceByTime: row.advance_by_time ?? null,
      isMultiEvent: this.toBoolean(row.is_multi_event),
      lastResultSource: row.last_result_source,
      lastResultAt: row.last_result_at ? new Date(row.last_result_at) : null,
    };
  }

  private mapAthleteRow(row: any): Athlete {
    return {
      id: row.id,
      meetId: row.meet_id,
      athleteNumber: row.athlete_number,
      firstName: row.first_name,
      lastName: row.last_name,
      teamId: row.team_id,
      divisionId: row.division_id,
      bibNumber: row.bib_number,
      gender: row.gender,
    };
  }

  private mapTeamRow(row: any): Team {
    return {
      id: row.id,
      meetId: row.meet_id,
      teamNumber: row.team_number,
      name: row.name,
      shortName: row.short_name,
      abbreviation: row.abbreviation,
    };
  }

  private mapDivisionRow(row: any): Division {
    return {
      id: row.id,
      meetId: row.meet_id,
      divisionNumber: row.division_number,
      name: row.name,
      abbreviation: row.abbreviation,
      lowAge: row.low_age,
      highAge: row.high_age,
    };
  }

  private mapSeasonRow(row: any): Season {
    return {
      id: row.id,
      name: row.name,
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : null,
      isActive: this.toBoolean(row.is_active),
    };
  }

  private mapEntryRow(row: any): Entry {
    return {
      id: row.id,
      eventId: row.event_id,
      athleteId: row.athlete_id,
      teamId: row.team_id,
      divisionId: row.division_id,
      seedMark: row.seed_mark,
      resultType: row.result_type,
      preliminaryHeat: row.preliminary_heat,
      preliminaryLane: row.preliminary_lane,
      quarterfinalHeat: row.quarterfinal_heat,
      quarterfinalLane: row.quarterfinal_lane,
      semifinalHeat: row.semifinal_heat,
      semifinalLane: row.semifinal_lane,
      finalHeat: row.final_heat,
      finalLane: row.final_lane,
      preliminaryMark: row.preliminary_mark,
      preliminaryPlace: row.preliminary_place,
      preliminaryWind: row.preliminary_wind,
      quarterfinalMark: row.quarterfinal_mark,
      quarterfinalPlace: row.quarterfinal_place,
      quarterfinalWind: row.quarterfinal_wind,
      semifinalMark: row.semifinal_mark,
      semifinalPlace: row.semifinal_place,
      semifinalWind: row.semifinal_wind,
      finalMark: row.final_mark,
      finalPlace: row.final_place,
      finalWind: row.final_wind,
      isDisqualified: this.toBoolean(row.is_disqualified),
      isScratched: this.toBoolean(row.is_scratched),
      scoringStatus: row.scoring_status,
      scoredPoints: row.scored_points,
      notes: row.notes,
      checkInStatus: row.check_in_status,
      checkInTime: row.check_in_time ? new Date(row.check_in_time) : null,
      checkInOperator: row.check_in_operator,
      checkInMethod: row.check_in_method,
    };
  }

  // ============= EVENTS =============
  async getEvents(): Promise<Event[]> {
    const rows = this.db.prepare('SELECT * FROM events').all();
    return rows.map((row: any) => this.mapEventRow(row));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const row = this.db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    return row ? this.mapEventRow(row) : undefined;
  }

  async getEventsByMeetId(meetId: string): Promise<Event[]> {
    const rows = this.db.prepare('SELECT * FROM events WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => this.mapEventRow(row));
  }

  async getEventsByLynxEventNumber(lynxEventNumber: number): Promise<Event[]> {
    const lynxNumStr = String(lynxEventNumber);
    const rows = this.db.prepare('SELECT * FROM events WHERE lynx_event_number IS NOT NULL').all();
    const matched = rows
      .filter((row: any) => {
        if (!row.lynx_event_number) return false;
        const stored = String(row.lynx_event_number).trim();
        const numPart = stored.replace(/^0+/, '').split(/[-\s]/)[0];
        return numPart === lynxNumStr || stored === lynxNumStr || parseInt(numPart, 10) === lynxEventNumber;
      })
      .map((row: any) => this.mapEventRow(row));
    if (matched.length > 0) return matched;
    const fallbackRows = this.db.prepare('SELECT * FROM events WHERE event_number = ?').all(lynxEventNumber);
    return fallbackRows.map((row: any) => this.mapEventRow(row));
  }

  async getCurrentEvent(): Promise<EventWithEntries | undefined> {
    const allEvents = await this.getEvents();
    let currentEvent = allEvents.find((e) => e.status === "in_progress");
    if (!currentEvent) {
      currentEvent = allEvents.find((e) => e.status === "scheduled");
    }
    if (!currentEvent) {
      const completedEvents = allEvents.filter((e) => e.status === "completed");
      if (completedEvents.length > 0) {
        currentEvent = completedEvents[completedEvents.length - 1];
      }
    }
    if (!currentEvent) return undefined;
    return this.getEventWithEntries(currentEvent.id);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO events (id, meet_id, event_number, name, event_type, gender, distance, status, num_rounds, num_lanes, event_date, event_time, session_name, hytek_status, is_scored, last_result_source, last_result_at, lynx_event_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      event.meetId,
      event.eventNumber,
      event.name,
      event.eventType,
      event.gender,
      event.distance ?? null,
      event.status || 'scheduled',
      event.numRounds ?? 1,
      event.numLanes ?? 8,
      event.eventDate?.toISOString() ?? null,
      event.eventTime ?? null,
      event.sessionName ?? null,
      event.hytekStatus ?? null,
      this.fromBoolean(event.isScored ?? false),
      event.lastResultSource ?? null,
      event.lastResultAt?.toISOString() ?? null,
      (event as any).lynxEventNumber ?? null
    );
    const created = (await this.getEvent(id))!;
    this.logSyncEvent('events', id, 'insert', created);
    return created;
  }

  async updateEventStatus(id: string, status: string): Promise<Event | undefined> {
    this.db.prepare('UPDATE events SET status = ? WHERE id = ?').run(status, id);
    const updated = await this.getEvent(id);
    if (updated) this.logSyncEvent('events', id, 'update', updated);
    return updated;
  }

  async updateEvent(id: string, updates: Record<string, any>): Promise<Event | undefined> {
    const colMap: Record<string, string> = {
      advanceByPlace: 'advance_by_place',
      advanceByTime: 'advance_by_time',
      hytekStatus: 'hytek_status',
      isScored: 'is_scored',
      status: 'status',
      numRounds: 'num_rounds',
      numLanes: 'num_lanes',
    };
    const sets: string[] = [];
    const vals: any[] = [];
    for (const [jsKey, val] of Object.entries(updates)) {
      const col = colMap[jsKey];
      if (col) {
        sets.push(`${col} = ?`);
        vals.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }
    if (sets.length === 0) return undefined;
    vals.push(id);
    this.db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    const updated = await this.getEvent(id);
    if (updated) this.logSyncEvent('events', id, 'update', updated);
    return updated;
  }

  // ============= ATHLETES =============
  async getAthletes(): Promise<Athlete[]> {
    const rows = this.db.prepare('SELECT * FROM athletes').all();
    return rows.map((row: any) => this.mapAthleteRow(row));
  }

  async getAthlete(id: string): Promise<Athlete | undefined> {
    const row = this.db.prepare('SELECT * FROM athletes WHERE id = ?').get(id);
    return row ? this.mapAthleteRow(row) : undefined;
  }

  async getAthletesByMeetId(meetId: string): Promise<Athlete[]> {
    const rows = this.db.prepare('SELECT * FROM athletes WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => this.mapAthleteRow(row));
  }

  async createAthlete(athlete: InsertAthlete): Promise<Athlete> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO athletes (id, meet_id, athlete_number, first_name, last_name, team_id, division_id, bib_number, gender)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      athlete.meetId,
      athlete.athleteNumber,
      athlete.firstName,
      athlete.lastName,
      athlete.teamId ?? null,
      athlete.divisionId ?? null,
      athlete.bibNumber ?? null,
      athlete.gender ?? null
    );
    const created = (await this.getAthlete(id))!;
    this.logSyncEvent('athletes', id, 'insert', created);
    return created;
  }

  // ============= ENTRIES =============
  async getEntries(): Promise<Entry[]> {
    const rows = this.db.prepare('SELECT * FROM entries').all();
    return rows.map((row: any) => this.mapEntryRow(row));
  }

  async getEntry(id: string): Promise<EntryWithDetails | null> {
    const row = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    if (!row) return null;
    return this.enrichEntry(this.mapEntryRow(row));
  }

  async getEntriesByEvent(eventId: string): Promise<Entry[]> {
    const rows = this.db.prepare('SELECT * FROM entries WHERE event_id = ?').all(eventId);
    return rows.map((row: any) => this.mapEntryRow(row));
  }

  async getEntriesByAthlete(athleteId: string): Promise<EntryWithDetails[]> {
    const rows = this.db.prepare('SELECT * FROM entries WHERE athlete_id = ?').all(athleteId);
    const entries = rows.map((row: any) => this.mapEntryRow(row));
    return Promise.all(entries.map(e => this.enrichEntry(e)));
  }

  async getEntriesWithDetails(eventId: string): Promise<EntryWithDetails[]> {
    const entries = await this.getEntriesByEvent(eventId);
    return Promise.all(entries.map(e => this.enrichEntry(e)));
  }

  private async enrichEntry(entry: Entry): Promise<EntryWithDetails> {
    const athlete = await this.getAthlete(entry.athleteId);
    const event = await this.getEvent(entry.eventId);
    let team: Team | undefined;
    if (athlete?.teamId) {
      team = await this.getTeam(athlete.teamId);
    }
    
    let performance: string | undefined;
    const mark = entry.finalMark ?? entry.semifinalMark ?? entry.quarterfinalMark ?? entry.preliminaryMark;
    if (mark !== null && mark !== undefined) {
      if (event && isTimeEvent(event.eventType)) {
        const totalSeconds = mark;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0) {
          performance = `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
        } else {
          performance = seconds.toFixed(2);
        }
      } else {
        performance = mark.toFixed(2);
      }
    }

    return {
      ...entry,
      athlete,
      event,
      team,
      performance,
    } as EntryWithDetails;
  }

  async createEntry(entry: InsertEntry): Promise<Entry> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO entries (id, event_id, athlete_id, team_id, division_id, seed_mark, result_type, preliminary_heat, preliminary_lane, quarterfinal_heat, quarterfinal_lane, semifinal_heat, semifinal_lane, final_heat, final_lane, preliminary_mark, preliminary_place, preliminary_wind, quarterfinal_mark, quarterfinal_place, quarterfinal_wind, semifinal_mark, semifinal_place, semifinal_wind, final_mark, final_place, final_wind, is_disqualified, is_scratched, scoring_status, scored_points, notes, check_in_status, check_in_time, check_in_operator, check_in_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.eventId,
      entry.athleteId,
      entry.teamId ?? null,
      entry.divisionId ?? null,
      entry.seedMark ?? null,
      entry.resultType || 'time',
      entry.preliminaryHeat ?? null,
      entry.preliminaryLane ?? null,
      entry.quarterfinalHeat ?? null,
      entry.quarterfinalLane ?? null,
      entry.semifinalHeat ?? null,
      entry.semifinalLane ?? null,
      entry.finalHeat ?? null,
      entry.finalLane ?? null,
      entry.preliminaryMark ?? null,
      entry.preliminaryPlace ?? null,
      entry.preliminaryWind ?? null,
      entry.quarterfinalMark ?? null,
      entry.quarterfinalPlace ?? null,
      entry.quarterfinalWind ?? null,
      entry.semifinalMark ?? null,
      entry.semifinalPlace ?? null,
      entry.semifinalWind ?? null,
      entry.finalMark ?? null,
      entry.finalPlace ?? null,
      entry.finalWind ?? null,
      this.fromBoolean(entry.isDisqualified ?? false),
      this.fromBoolean(entry.isScratched ?? false),
      entry.scoringStatus ?? 'pending',
      entry.scoredPoints ?? null,
      entry.notes ?? null,
      entry.checkInStatus ?? 'pending',
      entry.checkInTime?.toISOString() ?? null,
      entry.checkInOperator ?? null,
      entry.checkInMethod ?? null
    );
    const row = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    const created = this.mapEntryRow(row);
    this.logSyncEvent('entries', id, 'insert', created);
    return created;
  }

  async updateEntry(id: string, updates: Partial<InsertEntry>): Promise<Entry | undefined> {
    const existing = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    if (!existing) return undefined;

    const setClause: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      eventId: 'event_id',
      athleteId: 'athlete_id',
      teamId: 'team_id',
      divisionId: 'division_id',
      seedMark: 'seed_mark',
      resultType: 'result_type',
      preliminaryHeat: 'preliminary_heat',
      preliminaryLane: 'preliminary_lane',
      quarterfinalHeat: 'quarterfinal_heat',
      quarterfinalLane: 'quarterfinal_lane',
      semifinalHeat: 'semifinal_heat',
      semifinalLane: 'semifinal_lane',
      finalHeat: 'final_heat',
      finalLane: 'final_lane',
      preliminaryMark: 'preliminary_mark',
      preliminaryPlace: 'preliminary_place',
      preliminaryWind: 'preliminary_wind',
      quarterfinalMark: 'quarterfinal_mark',
      quarterfinalPlace: 'quarterfinal_place',
      quarterfinalWind: 'quarterfinal_wind',
      semifinalMark: 'semifinal_mark',
      semifinalPlace: 'semifinal_place',
      semifinalWind: 'semifinal_wind',
      finalMark: 'final_mark',
      finalPlace: 'final_place',
      finalWind: 'final_wind',
      isDisqualified: 'is_disqualified',
      isScratched: 'is_scratched',
      scoringStatus: 'scoring_status',
      scoredPoints: 'scored_points',
      notes: 'notes',
      checkInStatus: 'check_in_status',
      checkInTime: 'check_in_time',
      checkInOperator: 'check_in_operator',
      checkInMethod: 'check_in_method',
    };

    for (const [key, val] of Object.entries(updates)) {
      const dbField = fieldMap[key];
      if (dbField) {
        setClause.push(`${dbField} = ?`);
        if (key === 'isDisqualified' || key === 'isScratched') {
          values.push(this.fromBoolean(val as boolean));
        } else if (key === 'checkInTime' && val instanceof Date) {
          values.push(val.toISOString());
        } else {
          values.push(val ?? null);
        }
      }
    }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE entries SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    const updated = this.mapEntryRow(row);
    this.logSyncEvent('entries', id, 'update', updated);
    return updated;
  }

  // ============= SEASONS =============
  async getSeasons(): Promise<Season[]> {
    const rows = this.db.prepare('SELECT * FROM seasons').all();
    return rows.map((row: any) => this.mapSeasonRow(row));
  }

  async getSeason(id: number): Promise<Season | undefined> {
    const row = this.db.prepare('SELECT * FROM seasons WHERE id = ?').get(id);
    return row ? this.mapSeasonRow(row) : undefined;
  }

  async createSeason(season: InsertSeason): Promise<Season> {
    const result = this.db.prepare(`
      INSERT INTO seasons (name, start_date, end_date, is_active)
      VALUES (?, ?, ?, ?)
    `).run(
      season.name,
      season.startDate.toISOString(),
      season.endDate?.toISOString() ?? null,
      this.fromBoolean(season.isActive ?? true)
    );
    const created = (await this.getSeason(result.lastInsertRowid as number))!;
    this.logSyncEvent('seasons', String(created.id), 'insert', created);
    return created;
  }

  async updateSeason(id: number, updates: Partial<InsertSeason>): Promise<Season | undefined> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { setClause.push('name = ?'); values.push(updates.name); }
    if (updates.startDate !== undefined) { setClause.push('start_date = ?'); values.push(updates.startDate.toISOString()); }
    if (updates.endDate !== undefined) { setClause.push('end_date = ?'); values.push(updates.endDate?.toISOString() ?? null); }
    if (updates.isActive !== undefined) { setClause.push('is_active = ?'); values.push(this.fromBoolean(updates.isActive)); }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE seasons SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = await this.getSeason(id);
    if (updated) this.logSyncEvent('seasons', String(id), 'update', updated);
    return updated;
  }

  async deleteSeason(id: number): Promise<void> {
    this.logSyncEvent('seasons', String(id), 'delete', { id });
    this.db.prepare('DELETE FROM seasons WHERE id = ?').run(id);
  }

  // ============= MEETS =============
  async getMeets(): Promise<Meet[]> {
    const rows = this.db.prepare('SELECT * FROM meets').all();
    return rows.map((row: any) => this.mapMeetRow(row));
  }

  async getMeet(id: string): Promise<Meet | undefined> {
    const row = this.db.prepare('SELECT * FROM meets WHERE id = ?').get(id);
    return row ? this.mapMeetRow(row) : undefined;
  }

  async getMeetByCode(meetCode: string): Promise<Meet | undefined> {
    const row = this.db.prepare('SELECT * FROM meets WHERE meet_code = ?').get(meetCode);
    return row ? this.mapMeetRow(row) : undefined;
  }

  async getMeetsBySeason(seasonId: number): Promise<Meet[]> {
    const rows = this.db.prepare('SELECT * FROM meets WHERE season_id = ?').all(seasonId);
    return rows.map((row: any) => this.mapMeetRow(row));
  }

  async createMeet(meet: InsertMeet): Promise<Meet> {
    const id = this.generateId();
    const meetCode = meet.meetCode || this.generateMeetCode();
    
    this.db.prepare(`
      INSERT INTO meets (id, season_id, name, location, start_date, end_date, status, track_length, logo_url, meet_code, mdb_path, auto_refresh, refresh_interval, primary_color, secondary_color, accent_color, text_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      meet.seasonId ?? null,
      meet.name,
      meet.location ?? null,
      meet.startDate.toISOString(),
      meet.endDate?.toISOString() ?? null,
      meet.status ?? 'upcoming',
      meet.trackLength ?? 400,
      meet.logoUrl ?? null,
      meetCode,
      meet.mdbPath ?? null,
      this.fromBoolean(meet.autoRefresh ?? false),
      meet.refreshInterval ?? 30,
      meet.primaryColor ?? '#0066CC',
      meet.secondaryColor ?? '#003366',
      meet.accentColor ?? '#FFD700',
      meet.textColor ?? '#FFFFFF'
    );
    const created = (await this.getMeet(id))!;
    this.logSyncEvent('meets', id, 'insert', created);
    return created;
  }

  private generateMeetCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async updateMeet(id: string, data: Partial<InsertMeet>): Promise<Meet | null> {
    const existing = await this.getMeet(id);
    if (!existing) return null;

    const setClause: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      seasonId: 'season_id',
      name: 'name',
      location: 'location',
      startDate: 'start_date',
      endDate: 'end_date',
      status: 'status',
      trackLength: 'track_length',
      logoUrl: 'logo_url',
      meetCode: 'meet_code',
      mdbPath: 'mdb_path',
      autoRefresh: 'auto_refresh',
      refreshInterval: 'refresh_interval',
      lastImportAt: 'last_import_at',
      primaryColor: 'primary_color',
      secondaryColor: 'secondary_color',
      accentColor: 'accent_color',
      textColor: 'text_color',
    };

    for (const [key, val] of Object.entries(data)) {
      const dbField = fieldMap[key];
      if (dbField) {
        setClause.push(`${dbField} = ?`);
        if (key === 'autoRefresh') {
          values.push(this.fromBoolean(val as boolean));
        } else if ((key === 'startDate' || key === 'endDate' || key === 'lastImportAt') && val instanceof Date) {
          values.push(val.toISOString());
        } else {
          values.push(val ?? null);
        }
      }
    }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE meets SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = await this.getMeet(id);
    if (updated) this.logSyncEvent('meets', id, 'update', updated);
    return updated ?? null;
  }

  async updateMeetStatus(meetId: string, status: string): Promise<Meet | undefined> {
    this.db.prepare('UPDATE meets SET status = ? WHERE id = ?').run(status, meetId);
    const updated = await this.getMeet(meetId);
    if (updated) this.logSyncEvent('meets', meetId, 'update', updated);
    return updated;
  }

  async deleteMeet(id: string): Promise<boolean> {
    this.logSyncEvent('meets', id, 'delete', { id });
    const result = this.db.prepare('DELETE FROM meets WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async resetMeet(id: string): Promise<{ teamsDeleted: number; athletesDeleted: number; eventsDeleted: number; divisionsDeleted: number }> {
    const teamsResult = this.db.prepare('DELETE FROM teams WHERE meet_id = ?').run(id);
    const athletesResult = this.db.prepare('DELETE FROM athletes WHERE meet_id = ?').run(id);
    const eventsResult = this.db.prepare('DELETE FROM events WHERE meet_id = ?').run(id);
    const divisionsResult = this.db.prepare('DELETE FROM divisions WHERE meet_id = ?').run(id);
    
    return {
      teamsDeleted: teamsResult.changes,
      athletesDeleted: athletesResult.changes,
      eventsDeleted: eventsResult.changes,
      divisionsDeleted: divisionsResult.changes,
    };
  }

  async clearMeetImportData(meetId: string): Promise<{ teamsDeleted: number; athletesDeleted: number; eventsDeleted: number; divisionsDeleted: number; entriesDeleted: number }> {
    console.log(`\n🧹 Clearing import data for meet ${meetId}...`);

    const eventsCount = (this.db.prepare('SELECT COUNT(*) as count FROM events WHERE meet_id = ?').get(meetId) as any)?.count || 0;
    const entriesCount = (this.db.prepare('SELECT COUNT(*) as count FROM entries WHERE event_id IN (SELECT id FROM events WHERE meet_id = ?)').get(meetId) as any)?.count || 0;
    const athletesCount = (this.db.prepare('SELECT COUNT(*) as count FROM athletes WHERE meet_id = ?').get(meetId) as any)?.count || 0;
    const teamsCount = (this.db.prepare('SELECT COUNT(*) as count FROM teams WHERE meet_id = ?').get(meetId) as any)?.count || 0;
    const divisionsCount = (this.db.prepare('SELECT COUNT(*) as count FROM divisions WHERE meet_id = ?').get(meetId) as any)?.count || 0;

    const clearAll = this.db.transaction(() => {
      try { this.db.prepare('DELETE FROM live_event_data WHERE meet_id = ?').run(meetId); } catch (e) {}
      try { this.db.prepare('DELETE FROM team_scoring_results WHERE meet_id = ?').run(meetId); } catch (e) {}
      try { this.db.prepare('DELETE FROM meet_scoring_state WHERE profile_id IN (SELECT id FROM meet_scoring_profiles WHERE meet_id = ?)').run(meetId); } catch (e) {}
      try { this.db.prepare('DELETE FROM combined_event_totals WHERE combined_event_id IN (SELECT id FROM combined_events WHERE meet_id = ?)').run(meetId); } catch (e) {}
      try { this.db.prepare('DELETE FROM combined_event_components WHERE combined_event_id IN (SELECT id FROM combined_events WHERE meet_id = ?)').run(meetId); } catch (e) {}
      try { this.db.prepare('DELETE FROM combined_events WHERE meet_id = ?').run(meetId); } catch (e) {}
      try { this.db.prepare('DELETE FROM medal_awards WHERE meet_id = ?').run(meetId); } catch (e) {}
      try { this.db.prepare('DELETE FROM processed_ingestion_files WHERE meet_id = ?').run(meetId); } catch (e) {}
      this.db.prepare('DELETE FROM entries WHERE event_id IN (SELECT id FROM events WHERE meet_id = ?)').run(meetId);
      this.db.prepare('DELETE FROM events WHERE meet_id = ?').run(meetId);
      this.db.prepare('DELETE FROM athletes WHERE meet_id = ?').run(meetId);
      this.db.prepare('DELETE FROM teams WHERE meet_id = ?').run(meetId);
      this.db.prepare('DELETE FROM divisions WHERE meet_id = ?').run(meetId);
    });

    clearAll();

    const result = {
      teamsDeleted: teamsCount,
      athletesDeleted: athletesCount,
      eventsDeleted: eventsCount,
      divisionsDeleted: divisionsCount,
      entriesDeleted: entriesCount,
    };

    console.log(`🧹 Cleared: ${result.eventsDeleted} events, ${result.entriesDeleted} entries, ${result.athletesDeleted} athletes, ${result.teamsDeleted} teams, ${result.divisionsDeleted} divisions`);
    return result;
  }

  // ============= TEAMS =============
  async getTeams(): Promise<Team[]> {
    const rows = this.db.prepare('SELECT * FROM teams').all();
    return rows.map((row: any) => this.mapTeamRow(row));
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const row = this.db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    return row ? this.mapTeamRow(row) : undefined;
  }

  async getTeamsByMeetId(meetId: string): Promise<Team[]> {
    const rows = this.db.prepare('SELECT * FROM teams WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => this.mapTeamRow(row));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO teams (id, meet_id, team_number, name, short_name, abbreviation)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, team.meetId, team.teamNumber, team.name, team.shortName ?? null, team.abbreviation ?? null);
    const created = (await this.getTeam(id))!;
    this.logSyncEvent('teams', id, 'insert', created);
    return created;
  }

  // ============= DIVISIONS =============
  async getDivisions(): Promise<Division[]> {
    const rows = this.db.prepare('SELECT * FROM divisions').all();
    return rows.map((row: any) => this.mapDivisionRow(row));
  }

  async getDivision(id: string): Promise<Division | undefined> {
    const row = this.db.prepare('SELECT * FROM divisions WHERE id = ?').get(id);
    return row ? this.mapDivisionRow(row) : undefined;
  }

  async createDivision(division: InsertDivision): Promise<Division> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO divisions (id, meet_id, division_number, name, abbreviation, low_age, high_age)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, division.meetId, division.divisionNumber, division.name, division.abbreviation ?? null, division.lowAge ?? null, division.highAge ?? null);
    const created = (await this.getDivision(id))!;
    this.logSyncEvent('divisions', id, 'insert', created);
    return created;
  }

  // ============= EVENT WITH ENTRIES =============
  async getEventWithEntries(eventId: string): Promise<EventWithEntries | undefined> {
    const event = await this.getEvent(eventId);
    if (!event) return undefined;

    const entries = await this.getEntriesWithDetails(eventId);
    return {
      ...event,
      entries,
    };
  }

  // ============= DISPLAY MANAGEMENT =============
  async registerDisplay(meetCode: string, computerName: string): Promise<{ display: DisplayComputer, meet: Meet } | null> {
    const meet = await this.getMeetByCode(meetCode);
    if (!meet) return null;

    const id = this.generateId();
    const authToken = this.generateId();
    
    this.db.prepare(`
      INSERT INTO display_computers (id, meet_id, computer_name, auth_token, last_seen_at, is_online)
      VALUES (?, ?, ?, ?, datetime('now'), 1)
    `).run(id, meet.id, computerName, authToken);

    const row = this.db.prepare('SELECT * FROM display_computers WHERE id = ?').get(id);
    const display: DisplayComputer = {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      computerName: (row as any).computer_name,
      authToken: (row as any).auth_token,
      lastSeenAt: (row as any).last_seen_at ? new Date((row as any).last_seen_at) : null,
      isOnline: this.toBoolean((row as any).is_online),
      createdAt: new Date((row as any).created_at),
    };

    return { display, meet };
  }

  async assignDisplay(displayId: string, assignment: { targetType: string, targetId?: string, layout?: string }): Promise<DisplayAssignment | null> {
    const displayRow = this.db.prepare('SELECT meet_id FROM display_computers WHERE id = ?').get(displayId);
    if (!displayRow) return null;

    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO display_assignments (id, meet_id, display_id, target_type, target_id, layout)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, (displayRow as any).meet_id, displayId, assignment.targetType, assignment.targetId ?? null, assignment.layout ?? null);

    const row = this.db.prepare('SELECT * FROM display_assignments WHERE id = ?').get(id);
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      displayId: (row as any).display_id,
      targetType: (row as any).target_type,
      targetId: (row as any).target_id,
      layout: (row as any).layout,
      createdAt: new Date((row as any).created_at),
    };
  }

  async getDisplaysByMeet(meetId: string): Promise<DisplayComputer[]> {
    const rows = this.db.prepare('SELECT * FROM display_computers WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => ({
      id: row.id,
      meetId: row.meet_id,
      computerName: row.computer_name,
      authToken: row.auth_token,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
      isOnline: this.toBoolean(row.is_online),
      createdAt: new Date(row.created_at),
    }));
  }

  async getDisplayAssignment(displayId: string): Promise<DisplayAssignment | null> {
    const row = this.db.prepare('SELECT * FROM display_assignments WHERE display_id = ? ORDER BY created_at DESC LIMIT 1').get(displayId);
    if (!row) return null;
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      displayId: (row as any).display_id,
      targetType: (row as any).target_type,
      targetId: (row as any).target_id,
      layout: (row as any).layout,
      createdAt: new Date((row as any).created_at),
    };
  }

  async updateDisplayHeartbeat(displayId: string): Promise<void> {
    this.db.prepare(`UPDATE display_computers SET last_seen_at = datetime('now'), is_online = 1 WHERE id = ?`).run(displayId);
  }

  async verifyDisplayToken(displayId: string, authToken: string): Promise<boolean> {
    const row = this.db.prepare('SELECT auth_token FROM display_computers WHERE id = ?').get(displayId);
    return row ? (row as any).auth_token === authToken : false;
  }

  // ============= DISPLAY DEVICES =============
  private mapDisplayDeviceRow(row: any): DisplayDevice {
    return {
      id: row.id,
      meetId: row.meet_id,
      deviceName: row.device_name,
      displayType: row.display_type,
      displayMode: row.display_mode,
      status: row.status,
      assignedEventId: row.assigned_event_id,
      assignedLayoutId: row.assigned_layout_id ?? null,
      autoMode: this.toBoolean(row.auto_mode ?? true),
      pagingSize: row.paging_size ?? 8,
      pagingInterval: row.paging_interval ?? 5,
      fieldPort: row.field_port ?? null,
      isBigBoard: this.toBoolean(row.is_big_board ?? false),
      currentTemplate: row.current_template,
      lastIp: row.last_ip,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    };
  }

  async getDisplayDevices(meetId: string): Promise<DisplayDeviceWithEvent[]> {
    const rows = this.db.prepare('SELECT * FROM display_devices WHERE meet_id = ?').all(meetId);
    const result: DisplayDeviceWithEvent[] = [];
    for (const row of rows) {
      const device = this.mapDisplayDeviceRow(row);
      let assignedEvent: Event | undefined;
      if (device.assignedEventId) {
        assignedEvent = await this.getEvent(device.assignedEventId);
      }
      result.push({ ...device, assignedEvent });
    }
    return result;
  }

  async getDisplayDevice(id: string): Promise<DisplayDevice | undefined> {
    const row = this.db.prepare('SELECT * FROM display_devices WHERE id = ?').get(id);
    return row ? this.mapDisplayDeviceRow(row) : undefined;
  }

  async getDisplayDeviceByName(meetId: string, deviceName: string): Promise<DisplayDevice | undefined> {
    const row = this.db.prepare('SELECT * FROM display_devices WHERE meet_id = ? AND device_name = ?').get(meetId, deviceName);
    return row ? this.mapDisplayDeviceRow(row) : undefined;
  }

  async createOrUpdateDisplayDevice(device: InsertDisplayDevice & { lastIp?: string }): Promise<DisplayDevice> {
    const existing = await this.getDisplayDeviceByName(device.meetId, device.deviceName);
    
    if (existing) {
      this.db.prepare(`
        UPDATE display_devices SET status = 'online', last_seen_at = datetime('now'), last_ip = COALESCE(?, last_ip)
        WHERE id = ?
      `).run(device.lastIp ?? null, existing.id);
      return (await this.getDisplayDevice(existing.id))!;
    }

    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO display_devices (id, meet_id, device_name, display_type, display_mode, status, last_ip, last_seen_at)
      VALUES (?, ?, ?, ?, ?, 'online', ?, datetime('now'))
    `).run(id, device.meetId, device.deviceName, (device as any).displayType || 'P10', device.displayMode || 'track', device.lastIp ?? null);
    
    const created = (await this.getDisplayDevice(id))!;
    this.logSyncEvent('display_devices', id, 'insert', created);
    return created;
  }

  async updateDisplayDeviceStatus(id: string, status: string, lastIp?: string): Promise<DisplayDevice | undefined> {
    this.db.prepare(`
      UPDATE display_devices SET status = ?, last_seen_at = datetime('now'), last_ip = COALESCE(?, last_ip)
      WHERE id = ?
    `).run(status, lastIp ?? null, id);
    const updated = await this.getDisplayDevice(id);
    if (updated) this.logSyncEvent('display_devices', id, 'update', updated);
    return updated;
  }

  async updateDisplayDeviceMode(id: string, displayMode: 'track' | 'field'): Promise<DisplayDevice | undefined> {
    const assignedEventId = displayMode === 'track' ? null : undefined;
    if (assignedEventId === null) {
      this.db.prepare('UPDATE display_devices SET display_mode = ?, assigned_event_id = NULL WHERE id = ?').run(displayMode, id);
    } else {
      this.db.prepare('UPDATE display_devices SET display_mode = ? WHERE id = ?').run(displayMode, id);
    }
    const updated = await this.getDisplayDevice(id);
    if (updated) this.logSyncEvent('display_devices', id, 'update', updated);
    return updated;
  }

  async updateDisplayDeviceType(id: string, displayType: string, deviceName?: string): Promise<DisplayDevice | undefined> {
    if (deviceName) {
      this.db.prepare(`UPDATE display_devices SET display_type = ?, device_name = ?, last_seen_at = datetime('now') WHERE id = ?`).run(displayType, deviceName, id);
    } else {
      this.db.prepare(`UPDATE display_devices SET display_type = ?, last_seen_at = datetime('now') WHERE id = ?`).run(displayType, id);
    }
    const updated = await this.getDisplayDevice(id);
    if (updated) this.logSyncEvent('display_devices', id, 'update', updated);
    return updated;
  }

  async assignEventToDisplay(displayId: string, eventId: string | null): Promise<DisplayDevice | undefined> {
    this.db.prepare('UPDATE display_devices SET assigned_event_id = ? WHERE id = ?').run(eventId, displayId);
    const updated = await this.getDisplayDevice(displayId);
    if (updated) this.logSyncEvent('display_devices', displayId, 'update', updated);
    return updated;
  }

  async updateDisplayTemplate(displayId: string, template: string | null): Promise<DisplayDevice | undefined> {
    this.db.prepare('UPDATE display_devices SET current_template = ? WHERE id = ?').run(template, displayId);
    const updated = await this.getDisplayDevice(displayId);
    if (updated) this.logSyncEvent('display_devices', displayId, 'update', updated);
    return updated;
  }

  async deleteDisplayDevice(id: string): Promise<boolean> {
    this.logSyncEvent('display_devices', id, 'delete', { id });
    const result = this.db.prepare('DELETE FROM display_devices WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // ============= DISPLAY THEMES =============
  private mapDisplayThemeRow(row: any): DisplayTheme {
    return {
      id: row.id,
      meetId: row.meet_id,
      name: row.name,
      isDefault: this.toBoolean(row.is_default),
      accentColor: row.accent_color ?? "165 95% 50%",
      bgColor: row.bg_color ?? row.background_color ?? "220 15% 8%",
      bgElevatedColor: row.bg_elevated_color ?? "220 15% 12%",
      bgBorderColor: row.bg_border_color ?? "220 15% 18%",
      fgColor: row.fg_color ?? row.text_color ?? "0 0% 95%",
      mutedColor: row.muted_color ?? "0 0% 60%",
      headingFont: row.heading_font ?? row.font_family ?? "Barlow Semi Condensed",
      bodyFont: row.body_font ?? "Roboto",
      numbersFont: row.numbers_font ?? "Barlow Semi Condensed",
      logoUrl: row.logo_url ?? null,
      sponsorLogos: row.sponsor_logos ? this.parseJson(row.sponsor_logos) : null,
      features: row.features ? this.parseJson(row.features) : { showTeamColors: true, showReactionTimes: true, showSplits: true },
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  async createDisplayTheme(theme: InsertDisplayTheme): Promise<DisplayTheme> {
    if (theme.isDefault) {
      this.db.prepare('UPDATE display_themes SET is_default = 0 WHERE meet_id = ? AND is_default = 1').run(theme.meetId);
    }
    
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO display_themes (id, meet_id, name, accent_color, bg_color, bg_elevated_color, bg_border_color, fg_color, muted_color, heading_font, body_font, numbers_font, logo_url, sponsor_logos, features, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      theme.meetId, 
      theme.name, 
      theme.accentColor ?? "165 95% 50%",
      theme.bgColor ?? "220 15% 8%",
      theme.bgElevatedColor ?? "220 15% 12%",
      theme.bgBorderColor ?? "220 15% 18%",
      theme.fgColor ?? "0 0% 95%",
      theme.mutedColor ?? "0 0% 60%",
      theme.headingFont ?? "Barlow Semi Condensed",
      theme.bodyFont ?? "Roboto",
      theme.numbersFont ?? "Barlow Semi Condensed",
      theme.logoUrl ?? null,
      theme.sponsorLogos ? this.toJson(theme.sponsorLogos) : null,
      theme.features ? this.toJson(theme.features) : this.toJson({ showTeamColors: true, showReactionTimes: true, showSplits: true }),
      this.fromBoolean(theme.isDefault ?? false)
    );
    
    const row = this.db.prepare('SELECT * FROM display_themes WHERE id = ?').get(id);
    return this.mapDisplayThemeRow(row);
  }

  async getDisplayThemes(meetId: string): Promise<DisplayTheme[]> {
    const rows = this.db.prepare('SELECT * FROM display_themes WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => this.mapDisplayThemeRow(row));
  }

  async getDisplayTheme(id: string): Promise<DisplayTheme | null> {
    const row = this.db.prepare('SELECT * FROM display_themes WHERE id = ?').get(id);
    return row ? this.mapDisplayThemeRow(row) : null;
  }

  async getDefaultDisplayTheme(meetId: string): Promise<DisplayTheme | null> {
    const row = this.db.prepare('SELECT * FROM display_themes WHERE meet_id = ? AND is_default = 1').get(meetId);
    return row ? this.mapDisplayThemeRow(row) : null;
  }

  async updateDisplayTheme(id: string, theme: Partial<InsertDisplayTheme>): Promise<DisplayTheme | null> {
    const existing = await this.getDisplayTheme(id);
    if (!existing) return null;

    if (theme.isDefault) {
      this.db.prepare('UPDATE display_themes SET is_default = 0 WHERE meet_id = ? AND is_default = 1 AND id != ?').run(existing.meetId, id);
    }

    const setClause: string[] = [];
    const values: any[] = [];

    if (theme.name !== undefined) { setClause.push('name = ?'); values.push(theme.name); }
    if (theme.accentColor !== undefined) { setClause.push('accent_color = ?'); values.push(theme.accentColor); }
    if (theme.bgColor !== undefined) { setClause.push('bg_color = ?'); values.push(theme.bgColor); }
    if (theme.bgElevatedColor !== undefined) { setClause.push('bg_elevated_color = ?'); values.push(theme.bgElevatedColor); }
    if (theme.bgBorderColor !== undefined) { setClause.push('bg_border_color = ?'); values.push(theme.bgBorderColor); }
    if (theme.fgColor !== undefined) { setClause.push('fg_color = ?'); values.push(theme.fgColor); }
    if (theme.mutedColor !== undefined) { setClause.push('muted_color = ?'); values.push(theme.mutedColor); }
    if (theme.headingFont !== undefined) { setClause.push('heading_font = ?'); values.push(theme.headingFont); }
    if (theme.bodyFont !== undefined) { setClause.push('body_font = ?'); values.push(theme.bodyFont); }
    if (theme.numbersFont !== undefined) { setClause.push('numbers_font = ?'); values.push(theme.numbersFont); }
    if (theme.logoUrl !== undefined) { setClause.push('logo_url = ?'); values.push(theme.logoUrl); }
    if (theme.sponsorLogos !== undefined) { setClause.push('sponsor_logos = ?'); values.push(theme.sponsorLogos ? this.toJson(theme.sponsorLogos) : null); }
    if (theme.features !== undefined) { setClause.push('features = ?'); values.push(theme.features ? this.toJson(theme.features) : null); }
    if (theme.isDefault !== undefined) { setClause.push('is_default = ?'); values.push(this.fromBoolean(theme.isDefault)); }
    
    setClause.push("updated_at = datetime('now')");

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE display_themes SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getDisplayTheme(id);
  }

  async deleteDisplayTheme(id: string): Promise<void> {
    this.db.prepare('DELETE FROM display_themes WHERE id = ?').run(id);
  }

  // ============= BOARD CONFIGS =============
  private mapBoardConfigRow(row: any): { meetId: string; boardId: string; themeId: string | null; overrides: any } {
    return {
      meetId: row.meet_id,
      boardId: row.board_id,
      themeId: row.theme_id ?? null,
      overrides: row.overrides ? this.parseJson(row.overrides) : null,
    };
  }

  async createBoardConfig(config: InsertBoardConfig): Promise<BoardConfig> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO board_configs (id, board_id, meet_id, theme_id, overrides)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, config.boardId, config.meetId, config.themeId ?? null, config.overrides ? this.toJson(config.overrides) : null);
    
    const row = this.db.prepare('SELECT * FROM board_configs WHERE id = ?').get(id);
    return this.mapBoardConfigRow(row) as unknown as BoardConfig;
  }

  async getBoardConfig(boardId: string, meetId: string): Promise<BoardConfig | null> {
    const row = this.db.prepare('SELECT * FROM board_configs WHERE board_id = ? AND meet_id = ?').get(boardId, meetId);
    if (!row) return null;
    return this.mapBoardConfigRow(row) as unknown as BoardConfig;
  }

  async updateBoardConfig(id: string, config: Partial<InsertBoardConfig>): Promise<BoardConfig | null> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (config.themeId !== undefined) { setClause.push('theme_id = ?'); values.push(config.themeId); }
    if (config.overrides !== undefined) { setClause.push('overrides = ?'); values.push(config.overrides ? this.toJson(config.overrides) : null); }
    
    setClause.push("updated_at = datetime('now')");

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE board_configs SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = this.db.prepare('SELECT * FROM board_configs WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapBoardConfigRow(row) as unknown as BoardConfig;
  }

  async deleteBoardConfig(id: string): Promise<void> {
    this.db.prepare('DELETE FROM board_configs WHERE id = ?').run(id);
  }

  // ============= DISPLAY LAYOUTS =============
  private mapDisplayLayoutRow(row: any): DisplayLayout {
    return {
      id: row.id,
      meetId: row.meet_id,
      name: row.name,
      description: row.description ?? null,
      rows: row.rows ?? 2,
      cols: row.cols ?? row.columns ?? 2,
      isTemplate: this.toBoolean(row.is_template ?? false),
      templateId: row.template_id ?? null,
      version: row.version ?? 1,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  async createDisplayLayout(layout: InsertDisplayLayout): Promise<DisplayLayout> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO display_layouts (id, meet_id, name, description, rows, cols, is_template, template_id, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      layout.meetId, 
      layout.name, 
      layout.description ?? null, 
      layout.rows ?? 2, 
      layout.cols ?? 2, 
      this.fromBoolean(layout.isTemplate ?? false), 
      layout.templateId ?? null, 
      layout.version ?? 1
    );
    
    const row = this.db.prepare('SELECT * FROM display_layouts WHERE id = ?').get(id);
    return this.mapDisplayLayoutRow(row);
  }

  async getDisplayLayoutsByMeet(meetId: string): Promise<DisplayLayout[]> {
    const rows = this.db.prepare('SELECT * FROM display_layouts WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => this.mapDisplayLayoutRow(row));
  }

  async getDisplayLayoutById(id: string): Promise<DisplayLayout | null> {
    const row = this.db.prepare('SELECT * FROM display_layouts WHERE id = ?').get(id);
    return row ? this.mapDisplayLayoutRow(row) : null;
  }

  async updateDisplayLayout(id: string, layout: Partial<InsertDisplayLayout>): Promise<DisplayLayout> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (layout.name !== undefined) { setClause.push('name = ?'); values.push(layout.name); }
    if (layout.description !== undefined) { setClause.push('description = ?'); values.push(layout.description); }
    if (layout.rows !== undefined) { setClause.push('rows = ?'); values.push(layout.rows); }
    if (layout.cols !== undefined) { setClause.push('cols = ?'); values.push(layout.cols); }
    if (layout.isTemplate !== undefined) { setClause.push('is_template = ?'); values.push(this.fromBoolean(layout.isTemplate)); }
    if (layout.templateId !== undefined) { setClause.push('template_id = ?'); values.push(layout.templateId); }
    if (layout.version !== undefined) { setClause.push('version = ?'); values.push(layout.version); }
    
    setClause.push("updated_at = datetime('now')");

    values.push(id);
    this.db.prepare(`UPDATE display_layouts SET ${setClause.join(', ')} WHERE id = ?`).run(...values);

    return (await this.getDisplayLayoutById(id))!;
  }

  async deleteDisplayLayout(id: string): Promise<void> {
    this.db.prepare('DELETE FROM display_layouts WHERE id = ?').run(id);
  }

  // ============= LAYOUT CELLS =============
  private mapLayoutCellRow(row: any): LayoutCell {
    return {
      id: row.id,
      layoutId: row.layout_id,
      row: row.row,
      col: row.col,
      rowSpan: row.row_span ?? 1,
      colSpan: row.col_span ?? 1,
      eventId: row.event_id ?? null,
      eventType: row.event_type ?? null,
      boardType: row.board_type ?? "live_time",
      settings: row.settings ? this.parseJson(row.settings) : null,
    };
  }

  async createLayoutCell(cell: InsertLayoutCell): Promise<LayoutCell> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO layout_cells (id, layout_id, row, col, row_span, col_span, event_id, event_type, board_type, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      cell.layoutId, 
      cell.row, 
      cell.col, 
      cell.rowSpan ?? 1, 
      cell.colSpan ?? 1, 
      cell.eventId ?? null,
      cell.eventType ?? null,
      cell.boardType ?? "live_time",
      cell.settings ? this.toJson(cell.settings) : null
    );
    
    const row = this.db.prepare('SELECT * FROM layout_cells WHERE id = ?').get(id);
    return this.mapLayoutCellRow(row);
  }

  async getLayoutCellsByLayout(layoutId: string): Promise<LayoutCell[]> {
    const rows = this.db.prepare('SELECT * FROM layout_cells WHERE layout_id = ?').all(layoutId);
    return rows.map((row: any) => this.mapLayoutCellRow(row));
  }

  async updateLayoutCell(id: string, cell: Partial<InsertLayoutCell>): Promise<LayoutCell> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (cell.row !== undefined) { setClause.push('row = ?'); values.push(cell.row); }
    if (cell.col !== undefined) { setClause.push('col = ?'); values.push(cell.col); }
    if (cell.rowSpan !== undefined) { setClause.push('row_span = ?'); values.push(cell.rowSpan); }
    if (cell.colSpan !== undefined) { setClause.push('col_span = ?'); values.push(cell.colSpan); }
    if (cell.eventId !== undefined) { setClause.push('event_id = ?'); values.push(cell.eventId); }
    if (cell.eventType !== undefined) { setClause.push('event_type = ?'); values.push(cell.eventType); }
    if (cell.boardType !== undefined) { setClause.push('board_type = ?'); values.push(cell.boardType); }
    if (cell.settings !== undefined) { setClause.push('settings = ?'); values.push(cell.settings ? this.toJson(cell.settings) : null); }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE layout_cells SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = this.db.prepare('SELECT * FROM layout_cells WHERE id = ?').get(id);
    return this.mapLayoutCellRow(row);
  }

  async deleteLayoutCell(id: string): Promise<void> {
    this.db.prepare('DELETE FROM layout_cells WHERE id = ?').run(id);
  }

  // ============= ATHLETE PHOTOS =============
  private mapAthletePhotoRow(row: any): AthletePhoto {
    return {
      id: row.id ?? row.athlete_id,
      athleteId: row.athlete_id,
      meetId: row.meet_id,
      storageKey: row.storage_key,
      originalFilename: row.original_filename,
      contentType: row.content_type,
      width: row.width,
      height: row.height,
      byteSize: row.byte_size,
      uploadedAt: row.uploaded_at ? new Date(row.uploaded_at) : new Date(),
    };
  }

  async getAthletePhoto(athleteId: string): Promise<AthletePhoto | null> {
    const row = this.db.prepare('SELECT * FROM athlete_photos WHERE athlete_id = ?').get(athleteId);
    return row ? this.mapAthletePhotoRow(row) : null;
  }

  async createAthletePhoto(photo: InsertAthletePhoto): Promise<{ newPhoto: AthletePhoto; oldPhoto: AthletePhoto | null }> {
    const oldPhoto = await this.getAthletePhoto(photo.athleteId);
    
    this.db.prepare(`
      INSERT OR REPLACE INTO athlete_photos (athlete_id, meet_id, storage_key, original_filename, content_type, width, height, byte_size, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(photo.athleteId, photo.meetId, photo.storageKey, photo.originalFilename ?? null, photo.contentType ?? null, photo.width ?? null, photo.height ?? null, photo.byteSize ?? null);
    
    const newPhoto = (await this.getAthletePhoto(photo.athleteId))!;
    return { newPhoto, oldPhoto };
  }

  async deleteAthletePhoto(athleteId: string): Promise<{ photo: AthletePhoto; deleted: boolean }> {
    const photo = await this.getAthletePhoto(athleteId);
    if (!photo) {
      throw new Error(`Athlete photo not found for athleteId: ${athleteId}`);
    }
    this.db.prepare('DELETE FROM athlete_photos WHERE athlete_id = ?').run(athleteId);
    return { photo, deleted: true };
  }

  async getAthletePhotosByMeet(meetId: string): Promise<AthletePhoto[]> {
    const rows = this.db.prepare('SELECT * FROM athlete_photos WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => this.mapAthletePhotoRow(row));
  }

  // ============= TEAM LOGOS =============
  private mapTeamLogoRow(row: any): TeamLogo {
    return {
      id: row.id ?? row.team_id,
      teamId: row.team_id,
      meetId: row.meet_id,
      storageKey: row.storage_key,
      originalFilename: row.original_filename,
      contentType: row.content_type,
      width: row.width,
      height: row.height,
      byteSize: row.byte_size,
      uploadedAt: row.uploaded_at ? new Date(row.uploaded_at) : new Date(),
    };
  }

  async getTeamLogo(teamId: string): Promise<TeamLogo | null> {
    const row = this.db.prepare('SELECT * FROM team_logos WHERE team_id = ?').get(teamId);
    return row ? this.mapTeamLogoRow(row) : null;
  }

  async createTeamLogo(logo: InsertTeamLogo): Promise<{ newLogo: TeamLogo; oldLogo: TeamLogo | null }> {
    const oldLogo = await this.getTeamLogo(logo.teamId);
    
    this.db.prepare(`
      INSERT OR REPLACE INTO team_logos (team_id, meet_id, storage_key, original_filename, content_type, width, height, byte_size, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(logo.teamId, logo.meetId, logo.storageKey, logo.originalFilename ?? null, logo.contentType ?? null, logo.width ?? null, logo.height ?? null, logo.byteSize ?? null);
    
    const newLogo = (await this.getTeamLogo(logo.teamId))!;
    return { newLogo, oldLogo };
  }

  async deleteTeamLogo(teamId: string): Promise<{ logo: TeamLogo; deleted: boolean }> {
    const logo = await this.getTeamLogo(teamId);
    if (!logo) {
      throw new Error(`Team logo not found for teamId: ${teamId}`);
    }
    this.db.prepare('DELETE FROM team_logos WHERE team_id = ?').run(teamId);
    return { logo, deleted: true };
  }

  async getTeamLogosByMeet(meetId: string): Promise<TeamLogo[]> {
    const rows = this.db.prepare('SELECT * FROM team_logos WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => this.mapTeamLogoRow(row));
  }

  // ============= COMPOSITE LAYOUTS =============
  private mapCompositeLayoutRow(row: any): SelectCompositeLayout {
    return {
      id: row.id,
      meetId: row.meet_id,
      name: row.name,
      description: row.description,
      aspectRatio: row.aspect_ratio ?? '16:9',
      previewUrl: row.preview_url,
      backgroundStyle: row.background_style ?? 'default',
      baseTheme: row.base_theme ?? 'stadium',
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  async listLayouts(meetId?: string): Promise<SelectCompositeLayout[]> {
    const rows = meetId 
      ? this.db.prepare('SELECT * FROM composite_layouts WHERE meet_id = ?').all(meetId)
      : this.db.prepare('SELECT * FROM composite_layouts').all();
    return rows.map((row: any) => this.mapCompositeLayoutRow(row));
  }

  async getLayout(id: number): Promise<SelectCompositeLayout | null> {
    const row = this.db.prepare('SELECT * FROM composite_layouts WHERE id = ?').get(id);
    return row ? this.mapCompositeLayoutRow(row) : null;
  }

  async getLayoutWithZones(id: number): Promise<{ layout: SelectCompositeLayout; zones: SelectLayoutZone[] } | null> {
    const layout = await this.getLayout(id);
    if (!layout) return null;
    const zones = await this.getZonesByLayout(id);
    return { layout, zones };
  }

  async createLayout(data: InsertCompositeLayout): Promise<SelectCompositeLayout> {
    const result = this.db.prepare(`
      INSERT INTO composite_layouts (meet_id, name, description, aspect_ratio, preview_url, background_style, base_theme)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.meetId ?? null, data.name, data.description ?? null, data.aspectRatio ?? '16:9', data.previewUrl ?? null, data.backgroundStyle ?? 'default', data.baseTheme ?? 'stadium');
    
    return (await this.getLayout(result.lastInsertRowid as number))!;
  }

  async updateLayout(id: number, data: Partial<InsertCompositeLayout>): Promise<SelectCompositeLayout | null> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { setClause.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { setClause.push('description = ?'); values.push(data.description); }
    if (data.aspectRatio !== undefined) { setClause.push('aspect_ratio = ?'); values.push(data.aspectRatio); }
    if (data.previewUrl !== undefined) { setClause.push('preview_url = ?'); values.push(data.previewUrl); }
    if (data.backgroundStyle !== undefined) { setClause.push('background_style = ?'); values.push(data.backgroundStyle); }
    if (data.baseTheme !== undefined) { setClause.push('base_theme = ?'); values.push(data.baseTheme); }
    
    setClause.push("updated_at = datetime('now')");

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE composite_layouts SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getLayout(id);
  }

  async deleteLayout(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM composite_layouts WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // ============= LAYOUT ZONES =============
  private mapLayoutZoneRow(row: any): SelectLayoutZone {
    return {
      id: row.id,
      layoutId: row.layout_id,
      order: row.display_order,
      xPercent: row.x_percent,
      yPercent: row.y_percent,
      widthPercent: row.width_percent,
      heightPercent: row.height_percent,
      minWidth: row.min_width ?? null,
      maxWidth: row.max_width ?? null,
      minHeight: row.min_height ?? null,
      maxHeight: row.max_height ?? null,
      boardType: row.board_type,
      dataBinding: this.parseJson(row.data_binding),
      boardConfig: this.parseJson(row.board_config),
      stylePreset: row.style_preset ?? 'none',
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  async createZone(data: InsertLayoutZone): Promise<SelectLayoutZone> {
    const result = this.db.prepare(`
      INSERT INTO layout_zones (layout_id, display_order, x_percent, y_percent, width_percent, height_percent, min_width, max_width, min_height, max_height, board_type, data_binding, board_config, style_preset)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.layoutId, 
      data.order, 
      data.xPercent, 
      data.yPercent, 
      data.widthPercent, 
      data.heightPercent, 
      data.minWidth ?? null, 
      data.maxWidth ?? null, 
      data.minHeight ?? null, 
      data.maxHeight ?? null, 
      data.boardType, 
      this.toJson(data.dataBinding), 
      this.toJson(data.boardConfig), 
      data.stylePreset ?? 'none'
    );
    
    const row = this.db.prepare('SELECT * FROM layout_zones WHERE id = ?').get(result.lastInsertRowid);
    return this.mapLayoutZoneRow(row);
  }

  async updateZone(id: number, data: Partial<InsertLayoutZone>): Promise<SelectLayoutZone | null> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (data.order !== undefined) { setClause.push('display_order = ?'); values.push(data.order); }
    if (data.xPercent !== undefined) { setClause.push('x_percent = ?'); values.push(data.xPercent); }
    if (data.yPercent !== undefined) { setClause.push('y_percent = ?'); values.push(data.yPercent); }
    if (data.widthPercent !== undefined) { setClause.push('width_percent = ?'); values.push(data.widthPercent); }
    if (data.heightPercent !== undefined) { setClause.push('height_percent = ?'); values.push(data.heightPercent); }
    if (data.minWidth !== undefined) { setClause.push('min_width = ?'); values.push(data.minWidth); }
    if (data.maxWidth !== undefined) { setClause.push('max_width = ?'); values.push(data.maxWidth); }
    if (data.minHeight !== undefined) { setClause.push('min_height = ?'); values.push(data.minHeight); }
    if (data.maxHeight !== undefined) { setClause.push('max_height = ?'); values.push(data.maxHeight); }
    if (data.boardType !== undefined) { setClause.push('board_type = ?'); values.push(data.boardType); }
    if (data.dataBinding !== undefined) { setClause.push('data_binding = ?'); values.push(this.toJson(data.dataBinding)); }
    if (data.boardConfig !== undefined) { setClause.push('board_config = ?'); values.push(this.toJson(data.boardConfig)); }
    if (data.stylePreset !== undefined) { setClause.push('style_preset = ?'); values.push(data.stylePreset); }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE layout_zones SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = this.db.prepare('SELECT * FROM layout_zones WHERE id = ?').get(id);
    return row ? this.mapLayoutZoneRow(row) : null;
  }

  async deleteZone(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM layout_zones WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getZonesByLayout(layoutId: number): Promise<SelectLayoutZone[]> {
    const rows = this.db.prepare('SELECT * FROM layout_zones WHERE layout_id = ? ORDER BY display_order').all(layoutId);
    return rows.map((row: any) => this.mapLayoutZoneRow(row));
  }

  // ============= RECORD BOOKS =============
  private mapRecordBookRow(row: any): SelectRecordBook {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      scope: row.scope,
      isActive: this.toBoolean(row.is_active),
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    };
  }

  async getRecordBooks(): Promise<SelectRecordBook[]> {
    const rows = this.db.prepare('SELECT * FROM record_books WHERE is_active = 1').all();
    return rows.map((row: any) => this.mapRecordBookRow(row));
  }

  async getRecordBook(id: number): Promise<RecordBookWithRecords | null> {
    const row = this.db.prepare('SELECT * FROM record_books WHERE id = ?').get(id);
    if (!row) return null;
    
    const book = this.mapRecordBookRow(row);
    const records = await this.getRecords(id);
    return { ...book, records };
  }

  async createRecordBook(book: InsertRecordBook): Promise<SelectRecordBook> {
    const result = this.db.prepare(`
      INSERT INTO record_books (name, description, scope, is_active)
      VALUES (?, ?, ?, ?)
    `).run(book.name, book.description ?? null, book.scope, this.fromBoolean(book.isActive ?? true));
    
    const row = this.db.prepare('SELECT * FROM record_books WHERE id = ?').get(result.lastInsertRowid);
    return this.mapRecordBookRow(row);
  }

  async updateRecordBook(id: number, updates: Partial<InsertRecordBook>): Promise<SelectRecordBook | undefined> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { setClause.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { setClause.push('description = ?'); values.push(updates.description); }
    if (updates.scope !== undefined) { setClause.push('scope = ?'); values.push(updates.scope); }
    if (updates.isActive !== undefined) { setClause.push('is_active = ?'); values.push(this.fromBoolean(updates.isActive)); }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE record_books SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = this.db.prepare('SELECT * FROM record_books WHERE id = ?').get(id);
    return row ? this.mapRecordBookRow(row) : undefined;
  }

  async deleteRecordBook(id: number): Promise<void> {
    this.db.prepare('DELETE FROM record_books WHERE id = ?').run(id);
  }

  // ============= RECORDS =============
  private mapRecordRow(row: any): SelectRecord {
    return {
      id: row.id,
      recordBookId: row.record_book_id,
      eventType: row.event_type,
      gender: row.gender,
      performance: row.performance,
      athleteName: row.athlete_name,
      team: row.team,
      date: new Date(row.date),
      location: row.location,
      wind: row.wind,
      notes: row.notes,
      verifiedBy: row.verified_by,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    };
  }

  async getRecords(recordBookId: number): Promise<SelectRecord[]> {
    const rows = this.db.prepare('SELECT * FROM records WHERE record_book_id = ?').all(recordBookId);
    return rows.map((row: any) => this.mapRecordRow(row));
  }

  async getRecordsByEvent(eventType: string, gender: string): Promise<SelectRecord[]> {
    const rows = this.db.prepare(`
      SELECT r.* FROM records r
      JOIN record_books rb ON r.record_book_id = rb.id
      WHERE r.event_type = ? AND r.gender = ? AND rb.is_active = 1
    `).all(eventType, gender);
    return rows.map((row: any) => this.mapRecordRow(row));
  }

  async getRecord(id: number): Promise<SelectRecord | undefined> {
    const row = this.db.prepare('SELECT * FROM records WHERE id = ?').get(id);
    return row ? this.mapRecordRow(row) : undefined;
  }

  async getRecordForEvent(bookId: number, eventType: string, gender: string): Promise<SelectRecord | undefined> {
    const row = this.db.prepare('SELECT * FROM records WHERE record_book_id = ? AND event_type = ? AND gender = ?').get(bookId, eventType, gender);
    return row ? this.mapRecordRow(row) : undefined;
  }

  async createRecord(record: InsertRecord): Promise<SelectRecord> {
    const result = this.db.prepare(`
      INSERT INTO records (record_book_id, event_type, gender, performance, athlete_name, team, date, location, wind, notes, verified_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(record.recordBookId, record.eventType, record.gender, record.performance, record.athleteName, record.team ?? null, record.date.toISOString(), record.location ?? null, record.wind ?? null, record.notes ?? null, record.verifiedBy ?? null);
    
    return (await this.getRecord(result.lastInsertRowid as number))!;
  }

  async updateRecord(id: number, updates: Partial<InsertRecord>): Promise<SelectRecord> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.eventType !== undefined) { setClause.push('event_type = ?'); values.push(updates.eventType); }
    if (updates.gender !== undefined) { setClause.push('gender = ?'); values.push(updates.gender); }
    if (updates.performance !== undefined) { setClause.push('performance = ?'); values.push(updates.performance); }
    if (updates.athleteName !== undefined) { setClause.push('athlete_name = ?'); values.push(updates.athleteName); }
    if (updates.team !== undefined) { setClause.push('team = ?'); values.push(updates.team); }
    if (updates.date !== undefined) { setClause.push('date = ?'); values.push(updates.date.toISOString()); }
    if (updates.location !== undefined) { setClause.push('location = ?'); values.push(updates.location); }
    if (updates.wind !== undefined) { setClause.push('wind = ?'); values.push(updates.wind); }
    if (updates.notes !== undefined) { setClause.push('notes = ?'); values.push(updates.notes); }
    if (updates.verifiedBy !== undefined) { setClause.push('verified_by = ?'); values.push(updates.verifiedBy); }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE records SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    return (await this.getRecord(id))!;
  }

  async deleteRecord(id: number): Promise<void> {
    this.db.prepare('DELETE FROM records WHERE id = ?').run(id);
  }

  // ============= RECORD CHECKING =============
  async checkForRecords(eventType: string, gender: string, performance: string, windSpeed?: number): Promise<RecordCheck[]> {
    const newPerf = parsePerformanceToSeconds(performance);
    if (newPerf === null) return [];
    
    const isWindLegal = windSpeed === undefined || windSpeed <= 2.0;
    if (!isWindLegal) return [];
    
    const matchingRecords = await this.getRecordsByEvent(eventType, gender);
    const checks: RecordCheck[] = [];
    
    for (const record of matchingRecords) {
      const existingPerf = parsePerformanceToSeconds(record.performance);
      if (existingPerf === null) continue;
      
      const book = this.db.prepare('SELECT * FROM record_books WHERE id = ?').get(record.recordBookId);
      if (!book) continue;
      
      const isTimeBasedEvent = isTimeEvent(eventType);
      const isBetter = isTimeBasedEvent ? newPerf < existingPerf : newPerf > existingPerf;
      const isTied = Math.abs(newPerf - existingPerf) < 0.01;
      
      const diff = Math.abs(newPerf - existingPerf);
      const margin = isTimeBasedEvent ? `-${diff.toFixed(2)}s` : `+${diff.toFixed(2)}m`;
      
      checks.push({
        recordId: record.id,
        recordBookId: record.recordBookId,
        recordBookName: (book as any).name,
        isRecord: isBetter && !isTied,
        isTied,
        margin,
        existingPerformance: record.performance,
        newPerformance: performance
      });
    }
    
    return checks;
  }

  // Continue in Part 2...
  // ============= TEAM SCORING - PRESETS =============
  async getScoringPresets(): Promise<ScoringPreset[]> {
    const rows = this.db.prepare('SELECT * FROM scoring_presets').all();
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      defaultRelayMultiplier: row.default_relay_multiplier,
      allowRelayScoring: this.toBoolean(row.allow_relay_scoring),
      description: row.description,
    }));
  }

  async getScoringPreset(id: number): Promise<ScoringPreset | undefined> {
    const row = this.db.prepare('SELECT * FROM scoring_presets WHERE id = ?').get(id);
    if (!row) return undefined;
    return {
      id: (row as any).id,
      name: (row as any).name,
      category: (row as any).category,
      defaultRelayMultiplier: (row as any).default_relay_multiplier,
      allowRelayScoring: this.toBoolean((row as any).allow_relay_scoring),
      description: (row as any).description,
    };
  }

  async getPresetRules(presetId: number): Promise<PresetRule[]> {
    const rows = this.db.prepare('SELECT * FROM preset_rules WHERE preset_id = ?').all(presetId);
    return rows.map((row: any) => ({
      id: row.id,
      presetId: row.preset_id,
      place: row.place,
      points: row.points,
      isRelayOverride: this.toBoolean(row.is_relay_override),
    }));
  }

  async createScoringPreset(preset: InsertScoringPreset): Promise<ScoringPreset> {
    const result = this.db.prepare(`
      INSERT INTO scoring_presets (name, category, default_relay_multiplier, allow_relay_scoring, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(preset.name, preset.category, preset.defaultRelayMultiplier ?? 1.0, this.fromBoolean(preset.allowRelayScoring ?? true), preset.description ?? null);
    
    return (await this.getScoringPreset(result.lastInsertRowid as number))!;
  }

  async createPresetRule(rule: InsertPresetRule): Promise<PresetRule> {
    const result = this.db.prepare(`
      INSERT INTO preset_rules (preset_id, place, points, is_relay_override)
      VALUES (?, ?, ?, ?)
    `).run(rule.presetId, rule.place, rule.points, this.fromBoolean(rule.isRelayOverride ?? false));
    
    const row = this.db.prepare('SELECT * FROM preset_rules WHERE id = ?').get(result.lastInsertRowid);
    return {
      id: (row as any).id,
      presetId: (row as any).preset_id,
      place: (row as any).place,
      points: (row as any).points,
      isRelayOverride: this.toBoolean((row as any).is_relay_override),
    };
  }

  async seedScoringPresets(): Promise<void> {
    const existing = await this.getScoringPresets();
    if (existing.length > 0) return;
    
    const ncaaPreset = await this.createScoringPreset({
      name: 'NCAA',
      category: 'college',
      defaultRelayMultiplier: 1.0,
      allowRelayScoring: true,
      description: 'Standard NCAA scoring'
    });
    
    const ncaaPoints = [10, 8, 6, 5, 4, 3, 2, 1];
    for (let i = 0; i < ncaaPoints.length; i++) {
      await this.createPresetRule({
        presetId: ncaaPreset.id,
        place: i + 1,
        points: ncaaPoints[i],
        isRelayOverride: false
      });
    }
  }

  // ============= MEET SCORING PROFILE =============
  async getMeetScoringProfile(meetId: string): Promise<MeetScoringProfile | undefined> {
    const row = this.db.prepare('SELECT * FROM meet_scoring_profiles WHERE meet_id = ?').get(meetId);
    if (!row) return undefined;
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      presetId: (row as any).preset_id,
      genderMode: (row as any).gender_mode,
      divisionMode: (row as any).division_mode,
      allowRelayScoring: this.toBoolean((row as any).allow_relay_scoring),
      customTieBreak: this.parseJson((row as any).custom_tie_break),
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
      updatedAt: (row as any).updated_at ? new Date((row as any).updated_at) : new Date(),
    };
  }

  async upsertMeetScoringProfile(profile: InsertMeetScoringProfile): Promise<MeetScoringProfile> {
    const existing = await this.getMeetScoringProfile(profile.meetId);
    
    if (existing) {
      this.db.prepare(`
        UPDATE meet_scoring_profiles SET preset_id = ?, gender_mode = ?, division_mode = ?, allow_relay_scoring = ?, custom_tie_break = ?, updated_at = datetime('now')
        WHERE meet_id = ?
      `).run(profile.presetId, profile.genderMode ?? 'combined', profile.divisionMode ?? 'overall', this.fromBoolean(profile.allowRelayScoring ?? true), profile.customTieBreak ? this.toJson(profile.customTieBreak) : null, profile.meetId);
    } else {
      const id = this.generateId();
      this.db.prepare(`
        INSERT INTO meet_scoring_profiles (id, meet_id, preset_id, gender_mode, division_mode, allow_relay_scoring, custom_tie_break)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, profile.meetId, profile.presetId, profile.genderMode ?? 'combined', profile.divisionMode ?? 'overall', this.fromBoolean(profile.allowRelayScoring ?? true), profile.customTieBreak ? this.toJson(profile.customTieBreak) : null);
    }
    
    return (await this.getMeetScoringProfile(profile.meetId))!;
  }

  async getMeetScoringOverrides(profileId: string): Promise<MeetScoringOverride[]> {
    const rows = this.db.prepare('SELECT * FROM meet_scoring_overrides WHERE profile_id = ?').all(profileId);
    return rows.map((row: any) => ({
      id: row.id,
      profileId: row.profile_id,
      eventId: row.event_id,
      pointsMap: this.parseJson(row.points_map),
      relayMultiplier: row.relay_multiplier,
    }));
  }

  async upsertScoringOverride(override: InsertMeetScoringOverride): Promise<MeetScoringOverride> {
    const existing = this.db.prepare('SELECT id FROM meet_scoring_overrides WHERE profile_id = ? AND event_id = ?').get(override.profileId, override.eventId);
    
    if (existing) {
      this.db.prepare(`
        UPDATE meet_scoring_overrides SET points_map = ?, relay_multiplier = ?
        WHERE profile_id = ? AND event_id = ?
      `).run(override.pointsMap ? this.toJson(override.pointsMap) : null, override.relayMultiplier ?? null, override.profileId, override.eventId);
    } else {
      const id = this.generateId();
      this.db.prepare(`
        INSERT INTO meet_scoring_overrides (id, profile_id, event_id, points_map, relay_multiplier)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, override.profileId, override.eventId, override.pointsMap ? this.toJson(override.pointsMap) : null, override.relayMultiplier ?? null);
    }
    
    const row = this.db.prepare('SELECT * FROM meet_scoring_overrides WHERE profile_id = ? AND event_id = ?').get(override.profileId, override.eventId);
    return {
      id: (row as any).id,
      profileId: (row as any).profile_id,
      eventId: (row as any).event_id,
      pointsMap: this.parseJson((row as any).points_map),
      relayMultiplier: (row as any).relay_multiplier,
    };
  }

  async deleteScoringOverrides(profileId: string): Promise<void> {
    this.db.prepare('DELETE FROM meet_scoring_overrides WHERE profile_id = ?').run(profileId);
  }

  // ============= MEET SCORING STATE AND RESULTS =============
  async getMeetScoringState(profileId: string): Promise<MeetScoringState | undefined> {
    const row = this.db.prepare('SELECT * FROM meet_scoring_state WHERE profile_id = ?').get(profileId);
    if (!row) return undefined;
    return {
      id: (row as any).id,
      profileId: (row as any).profile_id,
      lastComputedAt: (row as any).last_computed_at ? new Date((row as any).last_computed_at) : null,
      checksum: (row as any).checksum,
    };
  }

  async updateMeetScoringState(profileId: string, updates: Partial<InsertMeetScoringState>): Promise<void> {
    const existing = await this.getMeetScoringState(profileId);
    
    if (existing) {
      const setClause: string[] = [];
      const values: any[] = [];
      
      if (updates.lastComputedAt !== undefined) { setClause.push('last_computed_at = ?'); values.push(updates.lastComputedAt?.toISOString() ?? null); }
      if (updates.checksum !== undefined) { setClause.push('checksum = ?'); values.push(updates.checksum); }
      
      if (setClause.length > 0) {
        values.push(profileId);
        this.db.prepare(`UPDATE meet_scoring_state SET ${setClause.join(', ')} WHERE profile_id = ?`).run(...values);
      }
    } else {
      const id = this.generateId();
      this.db.prepare(`
        INSERT INTO meet_scoring_state (id, profile_id, last_computed_at, checksum)
        VALUES (?, ?, ?, ?)
      `).run(id, profileId, updates.lastComputedAt?.toISOString() ?? null, updates.checksum ?? null);
    }
  }

  async clearTeamScoringResults(profileId: string): Promise<void> {
    this.db.prepare('DELETE FROM team_scoring_results WHERE profile_id = ?').run(profileId);
  }

  async createTeamScoringResult(result: InsertTeamScoringResult): Promise<TeamScoringResult> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO team_scoring_results (id, profile_id, team_id, event_id, gender, division, points_awarded, event_breakdown, tie_break_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, result.profileId, result.teamId, result.eventId ?? null, result.gender ?? null, result.division ?? null, result.pointsAwarded ?? 0, result.eventBreakdown ? this.toJson(result.eventBreakdown) : null, result.tieBreakData ? this.toJson(result.tieBreakData) : null);
    
    const row = this.db.prepare('SELECT * FROM team_scoring_results WHERE id = ?').get(id);
    return {
      id: (row as any).id,
      profileId: (row as any).profile_id,
      teamId: (row as any).team_id,
      eventId: (row as any).event_id,
      gender: (row as any).gender,
      division: (row as any).division,
      pointsAwarded: (row as any).points_awarded,
      eventBreakdown: this.parseJson((row as any).event_breakdown),
      tieBreakData: this.parseJson((row as any).tie_break_data),
      computedAt: (row as any).computed_at ? new Date((row as any).computed_at) : new Date(),
    };
  }

  // ============= TEAM STANDINGS QUERIES =============
  async getTeamStandings(meetId: string, scope?: { gender?: string; division?: string }): Promise<TeamStandingsEntry[]> {
    const rules = this.db.prepare(
      'SELECT gender, place, ind_score, rel_score FROM meet_scoring_rules WHERE meet_id = ? ORDER BY place'
    ).all(meetId) as any[];

    if (rules.length === 0) return [];

    const indPointsMap = new Map<string, Map<number, number>>();
    const relPointsMap = new Map<string, Map<number, number>>();
    for (const rule of rules) {
      const g = rule.gender;
      if (!indPointsMap.has(g)) indPointsMap.set(g, new Map());
      if (!relPointsMap.has(g)) relPointsMap.set(g, new Map());
      if (rule.ind_score > 0) indPointsMap.get(g)!.set(rule.place, rule.ind_score);
      if (rule.rel_score > 0) relPointsMap.get(g)!.set(rule.place, rule.rel_score);
    }

    const meetRow = this.db.prepare('SELECT ind_max_scorers_per_team, rel_max_scorers_per_team FROM meets WHERE id = ?').get(meetId) as any;
    const indMaxScorers = meetRow?.ind_max_scorers_per_team || 0;
    const relMaxScorers = meetRow?.rel_max_scorers_per_team || 0;

    let eventsQuery = 'SELECT id, name, gender, event_type FROM events WHERE meet_id = ? AND is_scored = 1';
    const eventsParams: any[] = [meetId];
    if (scope?.gender) {
      eventsQuery += ' AND gender = ?';
      eventsParams.push(scope.gender);
    }
    const scoredEventsList = this.db.prepare(eventsQuery).all(...eventsParams) as any[];
    if (scoredEventsList.length === 0) return [];

    const scoredEventIds = scoredEventsList.map((e: any) => e.id);
    const placeholders = scoredEventIds.map(() => '?').join(',');

    const allEntries = this.db.prepare(`
      SELECT en.event_id, en.final_place, a.team_id, t.name as team_name
      FROM entries en
      INNER JOIN athletes a ON en.athlete_id = a.id
      LEFT JOIN teams t ON a.team_id = t.id
      WHERE en.event_id IN (${placeholders})
        AND en.final_place IS NOT NULL
        AND a.team_id IS NOT NULL
      ORDER BY en.event_id, en.final_place
    `).all(...scoredEventIds) as any[];

    const entriesByEvent = new Map<string, any[]>();
    for (const entry of allEntries) {
      const eventEntries = entriesByEvent.get(entry.event_id) || [];
      eventEntries.push(entry);
      entriesByEvent.set(entry.event_id, eventEntries);
    }

    const teamScores = new Map<string, { teamName: string; totalPoints: number; events: Map<string, { eventName: string; points: number }> }>();

    for (const evt of scoredEventsList) {
      const nameLower = (evt.name || '').toLowerCase();
      const typeLower = (evt.event_type || '').toLowerCase();
      const isRelay = nameLower.includes('relay') || typeLower.startsWith('4x') || typeLower.includes('relay') ||
        /^\d+x\d+/.test(typeLower);
      const genderRaw = (evt.gender || '').toUpperCase().charAt(0);
      const evtGender = genderRaw === 'W' || genderRaw === 'F' ? 'F' : 'M';

      let ptsMap: Map<number, number> | undefined;
      if (isRelay) {
        ptsMap = relPointsMap.get(evtGender) || relPointsMap.get('ALL');
      } else {
        ptsMap = indPointsMap.get(evtGender) || indPointsMap.get('ALL');
      }
      if (!ptsMap || ptsMap.size === 0) continue;

      const maxScorers = isRelay ? relMaxScorers : indMaxScorers;
      const eventEntries = entriesByEvent.get(evt.id) || [];
      const teamScorerCount = new Map<string, number>();

      for (const entry of eventEntries) {
        if (!entry.team_id || !entry.team_name || !entry.final_place) continue;

        if (maxScorers > 0) {
          const count = teamScorerCount.get(entry.team_id) || 0;
          if (count >= maxScorers) continue;
          teamScorerCount.set(entry.team_id, count + 1);
        }

        const pts = ptsMap.get(entry.final_place) || 0;
        if (pts === 0) continue;

        if (!teamScores.has(entry.team_id)) {
          teamScores.set(entry.team_id, { teamName: entry.team_name, totalPoints: 0, events: new Map() });
        }
        const team = teamScores.get(entry.team_id)!;
        team.totalPoints += pts;

        const existing = team.events.get(evt.id);
        if (existing) {
          existing.points += pts;
        } else {
          team.events.set(evt.id, { eventName: evt.name, points: pts });
        }
      }
    }

    const standings: TeamStandingsEntry[] = Array.from(teamScores.entries())
      .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
      .map(([teamId, data], index) => ({
        rank: index + 1,
        teamId,
        teamName: data.teamName,
        totalPoints: data.totalPoints,
        eventCount: data.events.size,
        eventBreakdown: Array.from(data.events.entries()).map(([eventId, e]) => ({
          eventId,
          eventName: e.eventName,
          points: e.points,
        })),
      }));

    return standings;
  }

  async recalculateTeamScoring(meetId: string): Promise<void> {
    console.log(`Recalculating team scoring for meet ${meetId}`);
  }

  async getEventPoints(eventId: string): Promise<EventPointsBreakdown> {
    return {
      eventId,
      eventName: '',
      entries: [],
    };
  }

  // ============= CHECK-IN OPERATIONS =============
  async markCheckedIn(entryId: string, operator: string, method: string): Promise<EntryWithDetails> {
    this.db.prepare(`
      UPDATE entries SET check_in_status = 'checked_in', check_in_time = datetime('now'), check_in_operator = ?, check_in_method = ?
      WHERE id = ?
    `).run(operator, method, entryId);
    
    const entry = await this.getEntry(entryId);
    if (!entry) throw new Error(`Entry not found: ${entryId}`);
    this.logSyncEvent('entries', entryId, 'update', entry);
    return entry;
  }

  async bulkCheckIn(entryIds: string[], operator: string, method: string): Promise<EntryWithDetails[]> {
    const results: EntryWithDetails[] = [];
    for (const id of entryIds) {
      const result = await this.markCheckedIn(id, operator, method);
      results.push(result);
    }
    return results;
  }

  async getCheckInStats(eventId: string): Promise<{ total: number; checkedIn: number; pending: number; noShow: number }> {
    const rows = this.db.prepare(`
      SELECT check_in_status, COUNT(*) as count FROM entries WHERE event_id = ? GROUP BY check_in_status
    `).all(eventId);
    
    let total = 0, checkedIn = 0, pending = 0, noShow = 0;
    for (const row of rows as any[]) {
      total += row.count;
      if (row.check_in_status === 'checked_in') checkedIn = row.count;
      else if (row.check_in_status === 'pending') pending = row.count;
      else if (row.check_in_status === 'no_show') noShow = row.count;
    }
    
    return { total, checkedIn, pending, noShow };
  }

  // ============= SPLIT TIMES =============
  async seedSplitDefaults(): Promise<void> {
    const existing = this.db.prepare('SELECT COUNT(*) as count FROM event_split_configs WHERE is_default = 1').get();
    if ((existing as any).count > 0) return;
    
    const defaultConfigs = [
      { eventType: '800m', splits: [200, 400, 600, 800] },
      { eventType: '1500m', splits: [400, 800, 1200, 1500] },
      { eventType: '3000m', splits: [1000, 2000, 3000] },
      { eventType: '5000m', splits: [1000, 2000, 3000, 4000, 5000] },
    ];
    
    for (const config of defaultConfigs) {
      for (let i = 0; i < config.splits.length; i++) {
        this.db.prepare(`
          INSERT INTO event_split_configs (id, event_type, split_order, distance_meters, label, is_default)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(this.generateId(), config.eventType, i + 1, config.splits[i], `${config.splits[i]}m`);
      }
    }
  }

  async getSplitConfigs(eventId: string): Promise<EventSplitConfig[]> {
    const event = await this.getEvent(eventId);
    if (!event) return [];
    
    const rows = this.db.prepare(`
      SELECT * FROM event_split_configs 
      WHERE (event_type = ? AND meet_id = ?) OR (event_type = ? AND is_default = 1)
      ORDER BY split_order
    `).all(event.eventType, event.meetId, event.eventType);
    
    return rows.map((row: any) => ({
      id: row.id,
      eventType: row.event_type,
      meetId: row.meet_id,
      splitOrder: row.split_order,
      distanceMeters: row.distance_meters,
      label: row.label,
      expectedLapCount: row.expected_lap_count,
      isDefault: this.toBoolean(row.is_default),
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));
  }

  async createSplitConfig(config: InsertEventSplitConfig): Promise<EventSplitConfig> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO event_split_configs (id, event_type, meet_id, split_order, distance_meters, label, expected_lap_count, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, config.eventType, config.meetId ?? null, config.splitOrder, config.distanceMeters, config.label ?? null, config.expectedLapCount ?? null, this.fromBoolean(config.isDefault ?? false));
    
    const row = this.db.prepare('SELECT * FROM event_split_configs WHERE id = ?').get(id);
    return {
      id: (row as any).id,
      eventType: (row as any).event_type,
      meetId: (row as any).meet_id,
      splitOrder: (row as any).split_order,
      distanceMeters: (row as any).distance_meters,
      label: (row as any).label,
      expectedLapCount: (row as any).expected_lap_count,
      isDefault: this.toBoolean((row as any).is_default),
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
    };
  }

  async updateSplitConfigs(eventType: string, meetId: string | null, configs: InsertEventSplitConfig[]): Promise<EventSplitConfig[]> {
    if (meetId) {
      this.db.prepare('DELETE FROM event_split_configs WHERE event_type = ? AND meet_id = ?').run(eventType, meetId);
    }
    
    const results: EventSplitConfig[] = [];
    for (const config of configs) {
      const result = await this.createSplitConfig(config);
      results.push(result);
    }
    return results;
  }

  async getEntrySplits(eventId: string): Promise<Map<string, EntrySplit[]>> {
    const entries = await this.getEntriesByEvent(eventId);
    const result = new Map<string, EntrySplit[]>();
    
    for (const entry of entries) {
      const rows = this.db.prepare('SELECT * FROM entry_splits WHERE entry_id = ? ORDER BY split_index').all(entry.id);
      result.set(entry.id, rows.map((row: any) => ({
        id: row.id,
        entryId: row.entry_id,
        splitConfigId: row.split_config_id,
        splitIndex: row.split_index,
        distanceMeters: row.distance_meters,
        elapsedSeconds: row.elapsed_seconds,
        source: row.source,
        recordedAt: row.recorded_at ? new Date(row.recorded_at) : new Date(),
        recorderId: row.recorder_id,
      })));
    }
    
    return result;
  }

  async createEntrySplit(split: InsertEntrySplit): Promise<EntrySplit> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO entry_splits (id, entry_id, split_config_id, split_index, distance_meters, elapsed_seconds, source, recorder_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, split.entryId, split.splitConfigId ?? null, split.splitIndex, split.distanceMeters, split.elapsedSeconds, split.source ?? 'manual', split.recorderId ?? null);
    
    const row = this.db.prepare('SELECT * FROM entry_splits WHERE id = ?').get(id);
    return {
      id: (row as any).id,
      entryId: (row as any).entry_id,
      splitConfigId: (row as any).split_config_id,
      splitIndex: (row as any).split_index,
      distanceMeters: (row as any).distance_meters,
      elapsedSeconds: (row as any).elapsed_seconds,
      source: (row as any).source,
      recordedAt: (row as any).recorded_at ? new Date((row as any).recorded_at) : new Date(),
      recorderId: (row as any).recorder_id,
    };
  }

  async createEntrySplitsBatch(splits: InsertEntrySplit[]): Promise<EntrySplit[]> {
    const results: EntrySplit[] = [];
    for (const split of splits) {
      const result = await this.createEntrySplit(split);
      results.push(result);
    }
    return results;
  }

  async deleteEntrySplit(entryId: string, splitIndex: number): Promise<void> {
    this.db.prepare('DELETE FROM entry_splits WHERE entry_id = ? AND split_index = ?').run(entryId, splitIndex);
  }

  // ============= WIND READINGS =============
  async createWindReading(reading: InsertWindReading): Promise<WindReading> {
    const id = this.generateId();
    const isLegal = reading.windSpeed <= 2.0;
    this.db.prepare(`
      INSERT INTO wind_readings (id, event_id, heat_number, attempt_id, wind_speed, is_legal, source, recorder_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, reading.eventId, reading.heatNumber ?? null, reading.attemptId ?? null, reading.windSpeed, this.fromBoolean(isLegal), reading.source ?? 'manual', reading.recorderId ?? null);
    
    const row = this.db.prepare('SELECT * FROM wind_readings WHERE id = ?').get(id);
    const result: WindReading = {
      id: (row as any).id,
      eventId: (row as any).event_id,
      heatNumber: (row as any).heat_number,
      attemptId: (row as any).attempt_id,
      windSpeed: (row as any).wind_speed,
      isLegal: this.toBoolean((row as any).is_legal),
      source: (row as any).source,
      recordedAt: (row as any).recorded_at ? new Date((row as any).recorded_at) : new Date(),
      recorderId: (row as any).recorder_id,
    };
    this.logSyncEvent('wind_readings', id, 'insert', result);
    return result;
  }

  async getWindReadings(eventId: string): Promise<WindReading[]> {
    const rows = this.db.prepare('SELECT * FROM wind_readings WHERE event_id = ? ORDER BY recorded_at').all(eventId);
    return rows.map((row: any) => ({
      id: row.id,
      eventId: row.event_id,
      heatNumber: row.heat_number,
      attemptId: row.attempt_id,
      windSpeed: row.wind_speed,
      isLegal: this.toBoolean(row.is_legal),
      source: row.source,
      recordedAt: row.recorded_at ? new Date(row.recorded_at) : new Date(),
      recorderId: row.recorder_id,
    }));
  }

  async updateWindReading(id: string, windSpeed: number): Promise<WindReading> {
    const isLegal = windSpeed <= 2.0;
    this.db.prepare('UPDATE wind_readings SET wind_speed = ?, is_legal = ? WHERE id = ?').run(windSpeed, this.fromBoolean(isLegal), id);
    
    const row = this.db.prepare('SELECT * FROM wind_readings WHERE id = ?').get(id);
    const result: WindReading = {
      id: (row as any).id,
      eventId: (row as any).event_id,
      heatNumber: (row as any).heat_number,
      attemptId: (row as any).attempt_id,
      windSpeed: (row as any).wind_speed,
      isLegal: this.toBoolean((row as any).is_legal),
      source: (row as any).source,
      recordedAt: (row as any).recorded_at ? new Date((row as any).recorded_at) : new Date(),
      recorderId: (row as any).recorder_id,
    };
    this.logSyncEvent('wind_readings', id, 'update', result);
    return result;
  }

  async deleteWindReading(id: string): Promise<void> {
    this.logSyncEvent('wind_readings', id, 'delete', { id });
    this.db.prepare('DELETE FROM wind_readings WHERE id = ?').run(id);
  }

  // ============= FIELD ATTEMPTS =============
  async createFieldAttempt(attempt: InsertFieldAttempt): Promise<FieldAttempt> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO field_attempts (id, entry_id, attempt_index, status, measurement, measured_by, source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, attempt.entryId, attempt.attemptIndex, attempt.status, attempt.measurement ?? null, attempt.measuredBy ?? null, attempt.source ?? 'judge', attempt.notes ?? null);
    
    const row = this.db.prepare('SELECT * FROM field_attempts WHERE id = ?').get(id);
    const result: FieldAttempt = {
      id: (row as any).id,
      entryId: (row as any).entry_id,
      attemptIndex: (row as any).attempt_index,
      status: (row as any).status,
      measurement: (row as any).measurement,
      measuredBy: (row as any).measured_by,
      recordedAt: (row as any).recorded_at ? new Date((row as any).recorded_at) : new Date(),
      source: (row as any).source,
      notes: (row as any).notes,
    };
    this.logSyncEvent('field_attempts', id, 'insert', result);
    return result;
  }

  async getFieldAttempts(entryId: string): Promise<FieldAttempt[]> {
    const rows = this.db.prepare('SELECT * FROM field_attempts WHERE entry_id = ? ORDER BY attempt_index').all(entryId);
    return rows.map((row: any) => ({
      id: row.id,
      entryId: row.entry_id,
      attemptIndex: row.attempt_index,
      status: row.status,
      measurement: row.measurement,
      measuredBy: row.measured_by,
      recordedAt: row.recorded_at ? new Date(row.recorded_at) : new Date(),
      source: row.source,
      notes: row.notes,
    }));
  }

  async getEventFieldAttempts(eventId: string): Promise<Map<string, FieldAttempt[]>> {
    const entries = await this.getEntriesByEvent(eventId);
    const result = new Map<string, FieldAttempt[]>();
    
    for (const entry of entries) {
      const attempts = await this.getFieldAttempts(entry.id);
      result.set(entry.id, attempts);
    }
    
    return result;
  }

  async updateFieldAttempt(id: string, data: Partial<InsertFieldAttempt>): Promise<FieldAttempt> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) { setClause.push('status = ?'); values.push(data.status); }
    if (data.measurement !== undefined) { setClause.push('measurement = ?'); values.push(data.measurement); }
    if (data.measuredBy !== undefined) { setClause.push('measured_by = ?'); values.push(data.measuredBy); }
    if (data.source !== undefined) { setClause.push('source = ?'); values.push(data.source); }
    if (data.notes !== undefined) { setClause.push('notes = ?'); values.push(data.notes); }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE field_attempts SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = this.db.prepare('SELECT * FROM field_attempts WHERE id = ?').get(id);
    const result: FieldAttempt = {
      id: (row as any).id,
      entryId: (row as any).entry_id,
      attemptIndex: (row as any).attempt_index,
      status: (row as any).status,
      measurement: (row as any).measurement,
      measuredBy: (row as any).measured_by,
      recordedAt: (row as any).recorded_at ? new Date((row as any).recorded_at) : new Date(),
      source: (row as any).source,
      notes: (row as any).notes,
    };
    this.logSyncEvent('field_attempts', id, 'update', result);
    return result;
  }

  async deleteFieldAttempt(id: string): Promise<void> {
    this.logSyncEvent('field_attempts', id, 'delete', { id });
    this.db.prepare('DELETE FROM field_attempts WHERE id = ?').run(id);
  }

  // ============= JUDGE TOKENS =============
  async createJudgeToken(token: InsertJudgeToken): Promise<JudgeToken> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO judge_tokens (id, meet_id, event_id, code, pin, judge_name, is_active, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, token.meetId, token.eventId ?? null, token.code, token.pin ?? null, token.judgeName ?? null, this.fromBoolean(token.isActive ?? true), token.expiresAt?.toISOString() ?? null);
    
    const row = this.db.prepare('SELECT * FROM judge_tokens WHERE id = ?').get(id);
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      eventId: (row as any).event_id,
      code: (row as any).code,
      pin: (row as any).pin,
      judgeName: (row as any).judge_name,
      isActive: this.toBoolean((row as any).is_active),
      expiresAt: (row as any).expires_at ? new Date((row as any).expires_at) : null,
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
    };
  }

  async getJudgeToken(code: string): Promise<JudgeToken | null> {
    const row = this.db.prepare('SELECT * FROM judge_tokens WHERE code = ?').get(code);
    if (!row) return null;
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      eventId: (row as any).event_id,
      code: (row as any).code,
      pin: (row as any).pin,
      judgeName: (row as any).judge_name,
      isActive: this.toBoolean((row as any).is_active),
      expiresAt: (row as any).expires_at ? new Date((row as any).expires_at) : null,
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
    };
  }

  async getJudgeTokens(meetId: string): Promise<JudgeToken[]> {
    const rows = this.db.prepare('SELECT * FROM judge_tokens WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => ({
      id: row.id,
      meetId: row.meet_id,
      eventId: row.event_id,
      code: row.code,
      pin: row.pin,
      judgeName: row.judge_name,
      isActive: this.toBoolean(row.is_active),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));
  }

  async deactivateJudgeToken(id: string): Promise<void> {
    this.db.prepare('UPDATE judge_tokens SET is_active = 0 WHERE id = ?').run(id);
  }

  // ============= SPONSORS =============
  async getSponsors(): Promise<SelectSponsor[]> {
    const rows = this.db.prepare('SELECT * FROM sponsors').all();
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      tier: row.tier,
      logoStorageKey: row.logo_storage_key,
      logoUrl: row.logo_url,
      clickthroughUrl: row.clickthrough_url,
      isActive: this.toBoolean(row.is_active),
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));
  }

  async getSponsor(id: number): Promise<SelectSponsor | null> {
    const row = this.db.prepare('SELECT * FROM sponsors WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: (row as any).id,
      name: (row as any).name,
      tier: (row as any).tier,
      logoStorageKey: (row as any).logo_storage_key,
      logoUrl: (row as any).logo_url,
      clickthroughUrl: (row as any).clickthrough_url,
      isActive: this.toBoolean((row as any).is_active),
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
    };
  }

  async createSponsor(sponsor: InsertSponsor): Promise<SelectSponsor> {
    const result = this.db.prepare(`
      INSERT INTO sponsors (name, tier, logo_storage_key, logo_url, clickthrough_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sponsor.name, sponsor.tier, sponsor.logoStorageKey ?? null, sponsor.logoUrl ?? null, sponsor.clickthroughUrl ?? null, this.fromBoolean(sponsor.isActive ?? true));
    
    return (await this.getSponsor(result.lastInsertRowid as number))!;
  }

  async updateSponsor(id: number, sponsor: Partial<InsertSponsor>): Promise<SelectSponsor> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (sponsor.name !== undefined) { setClause.push('name = ?'); values.push(sponsor.name); }
    if (sponsor.tier !== undefined) { setClause.push('tier = ?'); values.push(sponsor.tier); }
    if (sponsor.logoStorageKey !== undefined) { setClause.push('logo_storage_key = ?'); values.push(sponsor.logoStorageKey); }
    if (sponsor.logoUrl !== undefined) { setClause.push('logo_url = ?'); values.push(sponsor.logoUrl); }
    if (sponsor.clickthroughUrl !== undefined) { setClause.push('clickthrough_url = ?'); values.push(sponsor.clickthroughUrl); }
    if (sponsor.isActive !== undefined) { setClause.push('is_active = ?'); values.push(this.fromBoolean(sponsor.isActive)); }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE sponsors SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    return (await this.getSponsor(id))!;
  }

  async deleteSponsor(id: number): Promise<void> {
    this.db.prepare('DELETE FROM sponsors WHERE id = ?').run(id);
  }

  // ============= SPONSOR ASSIGNMENTS =============
  async getSponsorAssignments(meetId: string): Promise<SelectSponsorAssignment[]> {
    const rows = this.db.prepare('SELECT * FROM sponsor_assignments WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => ({
      id: row.id,
      sponsorId: row.sponsor_id,
      meetId: row.meet_id,
      eventType: row.event_type,
      weight: row.weight,
      startAt: row.start_at ? new Date(row.start_at) : null,
      endAt: row.end_at ? new Date(row.end_at) : null,
      priority: row.priority,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));
  }

  async createSponsorAssignment(assignment: InsertSponsorAssignment): Promise<SelectSponsorAssignment> {
    const result = this.db.prepare(`
      INSERT INTO sponsor_assignments (sponsor_id, meet_id, event_type, weight, start_at, end_at, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(assignment.sponsorId, assignment.meetId ?? null, assignment.eventType ?? null, assignment.weight ?? 1, assignment.startAt?.toISOString() ?? null, assignment.endAt?.toISOString() ?? null, assignment.priority ?? 0);
    
    const row = this.db.prepare('SELECT * FROM sponsor_assignments WHERE id = ?').get(result.lastInsertRowid);
    return {
      id: (row as any).id,
      sponsorId: (row as any).sponsor_id,
      meetId: (row as any).meet_id,
      eventType: (row as any).event_type,
      weight: (row as any).weight,
      startAt: (row as any).start_at ? new Date((row as any).start_at) : null,
      endAt: (row as any).end_at ? new Date((row as any).end_at) : null,
      priority: (row as any).priority,
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
    };
  }

  async deleteSponsorAssignment(id: number): Promise<void> {
    this.db.prepare('DELETE FROM sponsor_assignments WHERE id = ?').run(id);
  }

  // ============= ROTATION PROFILES =============
  async getRotationProfile(meetId: string, zoneName: string): Promise<SelectSponsorRotationProfile | null> {
    const row = this.db.prepare('SELECT * FROM sponsor_rotation_profiles WHERE meet_id = ? AND zone_name = ?').get(meetId, zoneName);
    if (!row) return null;
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      zoneName: (row as any).zone_name,
      displayMode: (row as any).display_mode,
      dwellMs: (row as any).dwell_ms,
      transitionMs: (row as any).transition_ms,
      maxQueueLength: (row as any).max_queue_length,
      fallbackAssetKey: (row as any).fallback_asset_key,
      isActive: this.toBoolean((row as any).is_active),
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
    };
  }

  async createRotationProfile(profile: InsertSponsorRotationProfile): Promise<SelectSponsorRotationProfile> {
    const result = this.db.prepare(`
      INSERT INTO sponsor_rotation_profiles (meet_id, zone_name, display_mode, dwell_ms, transition_ms, max_queue_length, fallback_asset_key, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(profile.meetId, profile.zoneName, profile.displayMode, profile.dwellMs ?? 5000, profile.transitionMs ?? 500, profile.maxQueueLength ?? 10, profile.fallbackAssetKey ?? null, this.fromBoolean(profile.isActive ?? true));
    
    return (await this.getRotationProfile(profile.meetId, profile.zoneName))!;
  }

  async updateRotationProfile(id: number, profile: Partial<InsertSponsorRotationProfile>): Promise<SelectSponsorRotationProfile> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (profile.displayMode !== undefined) { setClause.push('display_mode = ?'); values.push(profile.displayMode); }
    if (profile.dwellMs !== undefined) { setClause.push('dwell_ms = ?'); values.push(profile.dwellMs); }
    if (profile.transitionMs !== undefined) { setClause.push('transition_ms = ?'); values.push(profile.transitionMs); }
    if (profile.maxQueueLength !== undefined) { setClause.push('max_queue_length = ?'); values.push(profile.maxQueueLength); }
    if (profile.fallbackAssetKey !== undefined) { setClause.push('fallback_asset_key = ?'); values.push(profile.fallbackAssetKey); }
    if (profile.isActive !== undefined) { setClause.push('is_active = ?'); values.push(this.fromBoolean(profile.isActive)); }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE sponsor_rotation_profiles SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = this.db.prepare('SELECT * FROM sponsor_rotation_profiles WHERE id = ?').get(id);
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      zoneName: (row as any).zone_name,
      displayMode: (row as any).display_mode,
      dwellMs: (row as any).dwell_ms,
      transitionMs: (row as any).transition_ms,
      maxQueueLength: (row as any).max_queue_length,
      fallbackAssetKey: (row as any).fallback_asset_key,
      isActive: this.toBoolean((row as any).is_active),
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
    };
  }

  async getActiveSponsorsForRotation(meetId: string, eventType?: string): Promise<SelectSponsor[]> {
    let query = `
      SELECT s.* FROM sponsors s
      JOIN sponsor_assignments sa ON s.id = sa.sponsor_id
      WHERE sa.meet_id = ? AND s.is_active = 1
    `;
    const params: any[] = [meetId];

    if (eventType) {
      query += ' AND (sa.event_type IS NULL OR sa.event_type = ?)';
      params.push(eventType);
    }

    query += ' ORDER BY sa.priority DESC, sa.weight DESC';

    const rows = this.db.prepare(query).all(...params);
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      tier: row.tier,
      logoStorageKey: row.logo_storage_key,
      logoUrl: row.logo_url,
      clickthroughUrl: row.clickthrough_url,
      isActive: this.toBoolean(row.is_active),
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));
  }

  // ============= MEDAL AWARDS =============
  async getMedalAwards(meetId: string): Promise<SelectMedalAward[]> {
    const rows = this.db.prepare('SELECT * FROM medal_awards WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => ({
      id: row.id,
      meetId: row.meet_id,
      eventId: row.event_id,
      teamId: row.team_id,
      entryId: row.entry_id,
      medalType: row.medal_type as MedalType,
      tieRank: row.tie_rank,
      awardedAt: row.awarded_at ? new Date(row.awarded_at) : new Date(),
    }));
  }

  async getEventMedalAwards(eventId: string): Promise<SelectMedalAward[]> {
    const rows = this.db.prepare('SELECT * FROM medal_awards WHERE event_id = ?').all(eventId);
    return rows.map((row: any) => ({
      id: row.id,
      meetId: row.meet_id,
      eventId: row.event_id,
      teamId: row.team_id,
      entryId: row.entry_id,
      medalType: row.medal_type as MedalType,
      tieRank: row.tie_rank,
      awardedAt: row.awarded_at ? new Date(row.awarded_at) : new Date(),
    }));
  }

  async createMedalAward(award: InsertMedalAward): Promise<SelectMedalAward> {
    const result = this.db.prepare(`
      INSERT INTO medal_awards (meet_id, event_id, team_id, entry_id, medal_type, tie_rank)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(award.meetId, award.eventId, award.teamId, award.entryId ?? null, award.medalType, award.tieRank ?? null);
    
    const row = this.db.prepare('SELECT * FROM medal_awards WHERE id = ?').get(result.lastInsertRowid);
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      eventId: (row as any).event_id,
      teamId: (row as any).team_id,
      entryId: (row as any).entry_id,
      medalType: (row as any).medal_type as MedalType,
      tieRank: (row as any).tie_rank,
      awardedAt: (row as any).awarded_at ? new Date((row as any).awarded_at) : new Date(),
    };
  }

  async deleteMedalAwards(eventId: string): Promise<void> {
    this.db.prepare('DELETE FROM medal_awards WHERE event_id = ?').run(eventId);
  }

  async getMedalStandings(meetId: string): Promise<MedalStanding[]> {
    const awards = await this.getMedalAwards(meetId);
    const teamMap = new Map<string, MedalStanding>();
    
    for (const award of awards) {
      const team = await this.getTeam(award.teamId);
      if (!team) continue;
      
      const existing = teamMap.get(award.teamId) || {
        teamId: award.teamId,
        teamName: team.name,
        gold: 0,
        silver: 0,
        bronze: 0,
        total: 0
      };
      
      if (award.medalType === 'gold') existing.gold++;
      else if (award.medalType === 'silver') existing.silver++;
      else if (award.medalType === 'bronze') existing.bronze++;
      existing.total++;
      
      teamMap.set(award.teamId, existing);
    }
    
    const standings = Array.from(teamMap.values()).sort((a, b) => {
      if (a.gold !== b.gold) return b.gold - a.gold;
      if (a.silver !== b.silver) return b.silver - a.silver;
      if (a.bronze !== b.bronze) return b.bronze - a.bronze;
      return b.total - a.total;
    });
    
    return standings;
  }

  async recomputeMedalsForEvent(eventId: string): Promise<void> {
    const event = await this.getEvent(eventId);
    if (!event || event.status !== 'completed') return;
    
    await this.deleteMedalAwards(eventId);
    
    const eventWithEntries = await this.getEventWithEntries(eventId);
    if (!eventWithEntries || !eventWithEntries.entries.length) return;
    
    const medalists = eventWithEntries.entries.filter(e => 
      e.finalPlace && e.finalPlace >= 1 && e.finalPlace <= 3
    );
    
    for (const entry of medalists) {
      if (!entry.athlete?.teamId) continue;
      
      let medalType: MedalType;
      if (entry.finalPlace === 1) medalType = 'gold';
      else if (entry.finalPlace === 2) medalType = 'silver';
      else medalType = 'bronze';
      
      await this.createMedalAward({
        meetId: event.meetId,
        eventId: event.id,
        teamId: entry.athlete.teamId,
        entryId: entry.id,
        medalType
      });
    }
  }

  // ============= COMBINED EVENTS =============
  async getCombinedEvents(meetId: string): Promise<SelectCombinedEvent[]> {
    const rows = this.db.prepare('SELECT * FROM combined_events WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => ({
      id: row.id,
      meetId: row.meet_id,
      name: row.name,
      eventType: row.event_type,
      gender: row.gender,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));
  }

  async getCombinedEvent(id: number): Promise<SelectCombinedEvent | null> {
    const row = this.db.prepare('SELECT * FROM combined_events WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      name: (row as any).name,
      eventType: (row as any).event_type,
      gender: (row as any).gender,
      status: (row as any).status,
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
    };
  }

  async createCombinedEvent(event: InsertCombinedEvent): Promise<SelectCombinedEvent> {
    const result = this.db.prepare(`
      INSERT INTO combined_events (meet_id, name, event_type, gender, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(event.meetId, event.name, event.eventType, event.gender, event.status ?? 'scheduled');
    
    return (await this.getCombinedEvent(result.lastInsertRowid as number))!;
  }

  async getCombinedEventComponents(combinedEventId: number): Promise<SelectCombinedEventComponent[]> {
    const rows = this.db.prepare('SELECT * FROM combined_event_components WHERE combined_event_id = ? ORDER BY sequence_order').all(combinedEventId);
    return rows.map((row: any) => ({
      id: row.id,
      combinedEventId: row.combined_event_id,
      eventId: row.event_id,
      sequenceOrder: row.sequence_order,
      day: row.day,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));
  }

  async createCombinedEventComponent(component: InsertCombinedEventComponent): Promise<SelectCombinedEventComponent> {
    const result = this.db.prepare(`
      INSERT INTO combined_event_components (combined_event_id, event_id, sequence_order, day)
      VALUES (?, ?, ?, ?)
    `).run(component.combinedEventId, component.eventId, component.sequenceOrder, component.day ?? null);
    
    const row = this.db.prepare('SELECT * FROM combined_event_components WHERE id = ?').get(result.lastInsertRowid);
    return {
      id: (row as any).id,
      combinedEventId: (row as any).combined_event_id,
      eventId: (row as any).event_id,
      sequenceOrder: (row as any).sequence_order,
      day: (row as any).day,
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
    };
  }

  async getCombinedEventStandings(combinedEventId: number): Promise<CombinedEventStanding[]> {
    const rows = this.db.prepare(`
      SELECT cet.*, a.first_name, a.last_name, t.name as team_name
      FROM combined_event_totals cet
      LEFT JOIN athletes a ON cet.athlete_id = a.id
      LEFT JOIN teams t ON a.team_id = t.id
      WHERE cet.combined_event_id = ?
      ORDER BY cet.total_points DESC
    `).all(combinedEventId);
    
    return rows.map((row: any, index: number) => ({
      rank: index + 1,
      athleteId: row.athlete_id,
      athleteName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : 'Unknown',
      teamName: row.team_name,
      totalPoints: row.total_points || 0,
      eventsCompleted: row.events_completed || 0,
      breakdown: this.parseJson(row.event_breakdown) || [],
    }));
  }

  async updateCombinedEventTotals(combinedEventId: number): Promise<void> {
    console.log(`Updating combined event totals for ${combinedEventId}`);
  }

  async addAthleteToCombinedEvent(combinedEventId: number, athleteId: string): Promise<void> {
    this.db.prepare(`
      INSERT OR IGNORE INTO combined_event_totals (combined_event_id, athlete_id, total_points, events_completed, event_breakdown)
      VALUES (?, ?, 0, 0, '[]')
    `).run(combinedEventId, athleteId);
  }

  async removeAthleteFromCombinedEvent(combinedEventId: number, athleteId: string): Promise<void> {
    this.db.prepare('DELETE FROM combined_event_totals WHERE combined_event_id = ? AND athlete_id = ?').run(combinedEventId, athleteId);
  }

  async deleteCombinedEvent(id: number): Promise<void> {
    this.db.prepare('DELETE FROM combined_events WHERE id = ?').run(id);
  }

  async updateCombinedEventStatus(id: number, status: string): Promise<SelectCombinedEvent | null> {
    this.db.prepare('UPDATE combined_events SET status = ? WHERE id = ?').run(status, id);
    return this.getCombinedEvent(id);
  }

  async getCombinedEventsByComponentEvent(eventId: string): Promise<SelectCombinedEvent[]> {
    const components = this.db.prepare('SELECT DISTINCT combined_event_id FROM combined_event_components WHERE event_id = ?').all(eventId);
    const results: SelectCombinedEvent[] = [];
    for (const comp of components as any[]) {
      const ce = await this.getCombinedEvent(comp.combined_event_id);
      if (ce) results.push(ce);
    }
    return results;
  }

  async getCombinedEventsByLynxEventNumber(lynxEventNumber: number): Promise<SelectCombinedEvent[]> {
    const events = await this.getEventsByLynxEventNumber(lynxEventNumber);
    const allCE: SelectCombinedEvent[] = [];
    for (const event of events) {
      const ce = await this.getCombinedEventsByComponentEvent(event.id);
      allCE.push(...ce);
    }
    const uniqueIds = new Set<number>();
    return allCE.filter(ce => {
      if (uniqueIds.has(ce.id)) return false;
      uniqueIds.add(ce.id);
      return true;
    });
  }

  // ============= QR CODES (IN-MEMORY) =============
  async getQRCode(slug: string): Promise<QRCodeMeta | null> {
    return this.qrCodes.get(slug) || null;
  }

  async createQRCode(meta: Omit<QRCodeMeta, 'slug' | 'createdAt'>): Promise<QRCodeMeta> {
    const slug = Math.random().toString(36).substring(2, 10);
    const qrCode: QRCodeMeta = { ...meta, slug, createdAt: new Date() };
    this.qrCodes.set(slug, qrCode);
    return qrCode;
  }

  async getAllQRCodes(): Promise<QRCodeMeta[]> {
    return Array.from(this.qrCodes.values());
  }

  // ============= SOCIAL MEDIA POSTS (IN-MEMORY) =============
  async getSocialMediaPosts(): Promise<SocialMediaPost[]> {
    return Array.from(this.socialMediaPosts.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createSocialMediaPost(post: Omit<SocialMediaPost, 'id' | 'createdAt'>): Promise<SocialMediaPost> {
    const id = Math.random().toString(36).substring(2, 15);
    const socialPost: SocialMediaPost = { ...post, id, createdAt: new Date() };
    this.socialMediaPosts.set(id, socialPost);
    return socialPost;
  }

  async deleteSocialMediaPost(id: string): Promise<void> {
    this.socialMediaPosts.delete(id);
  }

  // ============= RESULT SIGNATURES =============
  async hasResultSignature(signature: string): Promise<boolean> {
    return this.resultSignatures.has(signature);
  }

  async addResultSignature(signature: string): Promise<void> {
    this.resultSignatures.set(signature, new Date());
  }

  async clearOldSignatures(olderThan: Date): Promise<void> {
    for (const [sig, timestamp] of Array.from(this.resultSignatures.entries())) {
      if (timestamp < olderThan) {
        this.resultSignatures.delete(sig);
      }
    }
  }

  // ============= WEATHER =============
  async getWeatherConfig(meetId: string): Promise<WeatherStationConfig | null> {
    const row = this.db.prepare('SELECT * FROM weather_station_configs WHERE meet_id = ?').get(meetId);
    if (!row) return null;
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      provider: (row as any).provider,
      latitude: (row as any).latitude,
      longitude: (row as any).longitude,
      apiKey: (row as any).api_key,
      pollingIntervalSec: (row as any).polling_interval_sec,
      units: (row as any).units,
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
      updatedAt: (row as any).updated_at ? new Date((row as any).updated_at) : new Date(),
    };
  }

  async setWeatherConfig(config: InsertWeatherConfig): Promise<WeatherStationConfig> {
    this.db.prepare(`
      INSERT OR REPLACE INTO weather_station_configs (meet_id, provider, latitude, longitude, api_key, polling_interval_sec, units, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(config.meetId, config.provider ?? 'openweathermap', config.latitude, config.longitude, config.apiKey, config.pollingIntervalSec ?? 300, config.units ?? 'metric');
    
    return (await this.getWeatherConfig(config.meetId))!;
  }

  async deleteWeatherConfig(meetId: string): Promise<void> {
    this.db.prepare('DELETE FROM weather_station_configs WHERE meet_id = ?').run(meetId);
    this.db.prepare('DELETE FROM weather_readings WHERE meet_id = ?').run(meetId);
  }

  async addWeatherReading(reading: InsertWeatherReading): Promise<WeatherReading> {
    const result = this.db.prepare(`
      INSERT INTO weather_readings (meet_id, provider, observed_at, temperature_c, wind_speed_ms, wind_direction_deg, humidity_pct, pressure_hpa, precipitation_mm, raw_data)
      VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(reading.meetId, reading.provider, reading.temperatureC, reading.windSpeedMs, reading.windDirectionDeg, reading.humidityPct, reading.pressureHPa, reading.precipitationMm ?? null, reading.rawData ? JSON.stringify(reading.rawData) : null);
    
    const row = this.db.prepare('SELECT * FROM weather_readings WHERE id = ?').get(result.lastInsertRowid);
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      provider: (row as any).provider,
      observedAt: (row as any).observed_at ? new Date((row as any).observed_at) : new Date(),
      temperatureC: (row as any).temperature_c,
      windSpeedMs: (row as any).wind_speed_ms,
      windDirectionDeg: (row as any).wind_direction_deg,
      humidityPct: (row as any).humidity_pct,
      pressureHPa: (row as any).pressure_hpa,
      precipitationMm: (row as any).precipitation_mm,
      rawData: (row as any).raw_data ? this.parseJson((row as any).raw_data) : null,
    };
  }

  async getLatestWeatherReading(meetId: string): Promise<WeatherReading | null> {
    const row = this.db.prepare('SELECT * FROM weather_readings WHERE meet_id = ? ORDER BY observed_at DESC LIMIT 1').get(meetId);
    if (!row) return null;
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      provider: (row as any).provider,
      observedAt: (row as any).observed_at ? new Date((row as any).observed_at) : new Date(),
      temperatureC: (row as any).temperature_c,
      windSpeedMs: (row as any).wind_speed_ms,
      windDirectionDeg: (row as any).wind_direction_deg,
      humidityPct: (row as any).humidity_pct,
      pressureHPa: (row as any).pressure_hpa,
      precipitationMm: (row as any).precipitation_mm,
      rawData: (row as any).raw_data ? this.parseJson((row as any).raw_data) : null,
    };
  }

  async getWeatherHistory(meetId: string, hoursBack: number): Promise<WeatherReading[]> {
    const rows = this.db.prepare(`
      SELECT * FROM weather_readings 
      WHERE meet_id = ? AND observed_at >= datetime('now', '-' || ? || ' hours')
      ORDER BY observed_at ASC
    `).all(meetId, hoursBack);
    
    return rows.map((row: any) => ({
      id: row.id,
      meetId: row.meet_id,
      provider: row.provider,
      observedAt: row.observed_at ? new Date(row.observed_at) : new Date(),
      temperatureC: row.temperature_c,
      windSpeedMs: row.wind_speed_ms,
      windDirectionDeg: row.wind_direction_deg,
      humidityPct: row.humidity_pct,
      pressureHPa: row.pressure_hpa,
      precipitationMm: row.precipitation_mm,
      rawData: row.raw_data ? this.parseJson(row.raw_data) : null,
    }));
  }

  // ============= LYNX CONFIGURATION =============
  async getLynxConfigs(meetId?: string): Promise<LynxConfig[]> {
    const rows = meetId
      ? this.db.prepare('SELECT * FROM lynx_configs WHERE meet_id = ?').all(meetId)
      : this.db.prepare('SELECT * FROM lynx_configs').all();
    
    return rows.map((row: any) => ({
      id: row.id,
      meetId: row.meet_id,
      portType: row.port_type,
      port: row.port,
      name: row.name,
      enabled: this.toBoolean(row.enabled),
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));
  }

  async saveLynxConfig(config: InsertLynxConfig): Promise<LynxConfig> {
    const result = this.db.prepare(`
      INSERT INTO lynx_configs (meet_id, port_type, port, name, enabled)
      VALUES (?, ?, ?, ?, ?)
    `).run(config.meetId ?? null, config.portType, config.port, config.name, this.fromBoolean(config.enabled ?? true));
    
    const row = this.db.prepare('SELECT * FROM lynx_configs WHERE id = ?').get(result.lastInsertRowid);
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      portType: (row as any).port_type,
      port: (row as any).port,
      name: (row as any).name,
      enabled: this.toBoolean((row as any).enabled),
      createdAt: (row as any).created_at ? new Date((row as any).created_at) : new Date(),
    };
  }

  async deleteLynxConfigs(meetId?: string): Promise<void> {
    if (meetId) {
      this.db.prepare('DELETE FROM lynx_configs WHERE meet_id = ?').run(meetId);
    } else {
      this.db.prepare('DELETE FROM lynx_configs WHERE meet_id IS NULL').run();
    }
  }

  // ============= LIVE EVENT DATA =============
  private mapLiveEventDataRow(row: any): LiveEventData {
    return {
      id: row.id,
      eventNumber: row.event_number,
      meetId: row.meet_id,
      eventType: row.event_type,
      eventName: row.event_name ?? null,
      mode: row.mode,
      heat: row.heat,
      totalHeats: row.total_heats ?? null,
      round: row.round,
      flight: row.flight,
      wind: row.wind,
      status: row.status,
      distance: row.distance,
      entries: this.parseJson(row.entries) || [],
      runningTime: row.running_time,
      isArmed: this.toBoolean(row.is_armed),
      isRunning: this.toBoolean(row.is_running),
      lastUpdateAt: row.last_update_at ? new Date(row.last_update_at) : null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    };
  }

  async getLiveEventData(eventNumber: number, meetId?: string): Promise<LiveEventData | null> {
    let row;
    if (meetId) {
      row = this.db.prepare('SELECT * FROM live_event_data WHERE event_number = ? AND meet_id = ? ORDER BY last_update_at DESC LIMIT 1').get(eventNumber, meetId);
    } else {
      row = this.db.prepare('SELECT * FROM live_event_data WHERE event_number = ? ORDER BY last_update_at DESC LIMIT 1').get(eventNumber);
    }
    return row ? this.mapLiveEventDataRow(row) : null;
  }

  async getLiveEventsByMeet(meetId?: string): Promise<LiveEventData[]> {
    const rows = meetId
      ? this.db.prepare('SELECT * FROM live_event_data WHERE meet_id = ?').all(meetId)
      : this.db.prepare('SELECT * FROM live_event_data').all();
    return rows.map((row: any) => this.mapLiveEventDataRow(row));
  }

  async upsertLiveEventData(data: InsertLiveEventData): Promise<LiveEventData> {
    this.db.prepare(`
      INSERT INTO live_event_data (event_number, meet_id, event_type, mode, heat, round, flight, wind, status, distance, entries, running_time, is_armed, is_running, last_update_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(event_number, heat, round, flight, event_type, meet_id) DO UPDATE SET
        mode = excluded.mode,
        status = excluded.status,
        wind = excluded.wind,
        distance = excluded.distance,
        entries = excluded.entries,
        running_time = excluded.running_time,
        is_armed = excluded.is_armed,
        is_running = excluded.is_running,
        last_update_at = datetime('now')
    `).run(
      data.eventNumber,
      data.meetId ?? null,
      data.eventType,
      data.mode,
      data.heat ?? 1,
      data.round ?? 1,
      data.flight ?? 1,
      data.wind ?? null,
      data.status ?? null,
      data.distance ?? null,
      this.toJson(data.entries ?? []),
      data.runningTime ?? null,
      this.fromBoolean(data.isArmed ?? false),
      this.fromBoolean(data.isRunning ?? false)
    );
    
    return (await this.getLiveEventData(data.eventNumber, data.meetId ?? undefined))!;
  }

  async updateLiveEventEntries(eventNumber: number, entries: any[], meetId?: string): Promise<LiveEventData | null> {
    if (meetId) {
      this.db.prepare(`UPDATE live_event_data SET entries = ?, last_update_at = datetime('now') WHERE event_number = ? AND meet_id = ?`).run(this.toJson(entries), eventNumber, meetId);
    } else {
      this.db.prepare(`UPDATE live_event_data SET entries = ?, last_update_at = datetime('now') WHERE event_number = ?`).run(this.toJson(entries), eventNumber);
    }
    return this.getLiveEventData(eventNumber, meetId);
  }

  async clearLiveEventData(meetId?: string): Promise<void> {
    if (meetId) {
      this.db.prepare('DELETE FROM live_event_data WHERE meet_id = ?').run(meetId);
    } else {
      this.db.prepare('DELETE FROM live_event_data').run();
    }
  }

  // ============= ATHLETE BESTS =============
  private mapAthleteBestRow(row: any): AthleteBest {
    return {
      id: row.id,
      athleteId: row.athlete_id,
      eventType: row.event_type,
      bestType: row.best_type,
      mark: row.mark,
      seasonId: row.season_id,
      achievedAt: row.achieved_at ? new Date(row.achieved_at) : null,
      meetName: row.meet_name,
      source: row.source,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  async getAthleteBests(athleteId: string): Promise<AthleteBest[]> {
    const rows = this.db.prepare('SELECT * FROM athlete_bests WHERE athlete_id = ?').all(athleteId);
    return rows.map((row: any) => this.mapAthleteBestRow(row));
  }

  async getAthleteBest(athleteId: string, eventType: string, bestType: 'college' | 'season', seasonId?: number | null): Promise<AthleteBest | null> {
    let row;
    if (bestType === 'season' && seasonId !== undefined) {
      if (seasonId === null) {
        row = this.db.prepare('SELECT * FROM athlete_bests WHERE athlete_id = ? AND event_type = ? AND best_type = ? AND season_id IS NULL').get(athleteId, eventType, bestType);
      } else {
        row = this.db.prepare('SELECT * FROM athlete_bests WHERE athlete_id = ? AND event_type = ? AND best_type = ? AND season_id = ?').get(athleteId, eventType, bestType, seasonId);
      }
    } else {
      row = this.db.prepare('SELECT * FROM athlete_bests WHERE athlete_id = ? AND event_type = ? AND best_type = ?').get(athleteId, eventType, bestType);
    }
    return row ? this.mapAthleteBestRow(row) : null;
  }

  async getAthleteBestsByMeet(meetId: string): Promise<AthleteBest[]> {
    const athletes = await this.getAthletesByMeetId(meetId);
    const results: AthleteBest[] = [];
    for (const athlete of athletes) {
      const bests = await this.getAthleteBests(athlete.id);
      results.push(...bests);
    }
    return results;
  }

  async createAthleteBest(best: InsertAthleteBest): Promise<AthleteBest> {
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO athlete_bests (id, athlete_id, event_type, best_type, mark, season_id, achieved_at, meet_name, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, best.athleteId, best.eventType, best.bestType, best.mark, best.seasonId ?? null, best.achievedAt?.toISOString() ?? null, best.meetName ?? null, best.source ?? 'manual');
    
    const row = this.db.prepare('SELECT * FROM athlete_bests WHERE id = ?').get(id);
    const created = this.mapAthleteBestRow(row);
    this.logSyncEvent('athlete_bests', id, 'insert', created);
    return created;
  }

  async updateAthleteBest(id: string, updates: Partial<InsertAthleteBest>): Promise<AthleteBest | null> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.mark !== undefined) { setClause.push('mark = ?'); values.push(updates.mark); }
    if (updates.achievedAt !== undefined) { setClause.push('achieved_at = ?'); values.push(updates.achievedAt?.toISOString() ?? null); }
    if (updates.meetName !== undefined) { setClause.push('meet_name = ?'); values.push(updates.meetName); }
    if (updates.source !== undefined) { setClause.push('source = ?'); values.push(updates.source); }
    
    setClause.push("updated_at = datetime('now')");

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE athlete_bests SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = this.db.prepare('SELECT * FROM athlete_bests WHERE id = ?').get(id);
    if (!row) return null;
    const updated = this.mapAthleteBestRow(row);
    this.logSyncEvent('athlete_bests', id, 'update', updated);
    return updated;
  }

  async upsertAthleteBest(best: InsertAthleteBest): Promise<AthleteBest> {
    const existing = await this.getAthleteBest(best.athleteId, best.eventType, best.bestType as 'college' | 'season', best.seasonId);
    if (existing) {
      return (await this.updateAthleteBest(existing.id, best))!;
    }
    return this.createAthleteBest(best);
  }

  async deleteAthleteBest(id: string): Promise<void> {
    this.logSyncEvent('athlete_bests', id, 'delete', { id });
    this.db.prepare('DELETE FROM athlete_bests WHERE id = ?').run(id);
  }

  async bulkImportAthleteBests(bests: InsertAthleteBest[]): Promise<AthleteBest[]> {
    const results: AthleteBest[] = [];
    for (const best of bests) {
      const result = await this.upsertAthleteBest(best);
      results.push(result);
    }
    return results;
  }

  // ============= LAYOUT SCENES =============
  private mapLayoutSceneRow(row: any): SelectLayoutScene {
    return {
      id: row.id,
      meetId: row.meet_id,
      name: row.name,
      description: row.description,
      canvasWidth: row.canvas_width,
      canvasHeight: row.canvas_height,
      aspectRatio: row.aspect_ratio,
      backgroundColor: row.background_color,
      backgroundImage: row.background_image,
      isTemplate: this.toBoolean(row.is_template),
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  async getLayoutScenes(meetId?: string): Promise<LayoutSceneWithObjects[]> {
    const rows = meetId
      ? this.db.prepare('SELECT * FROM layout_scenes WHERE meet_id = ?').all(meetId)
      : this.db.prepare('SELECT * FROM layout_scenes').all();
    
    const scenes: LayoutSceneWithObjects[] = [];
    for (const row of rows) {
      const scene = this.mapLayoutSceneRow(row as any);
      const objects = await this.getLayoutObjects(scene.id);
      scenes.push({ ...scene, objects });
    }
    return scenes;
  }

  async getLayoutScene(id: number): Promise<LayoutSceneWithObjects | null> {
    const row = this.db.prepare('SELECT * FROM layout_scenes WHERE id = ?').get(id);
    if (!row) return null;
    const scene = this.mapLayoutSceneRow(row);
    const objects = await this.getLayoutObjects(id);
    return { ...scene, objects };
  }

  async createLayoutScene(scene: InsertLayoutScene): Promise<SelectLayoutScene> {
    const result = this.db.prepare(`
      INSERT INTO layout_scenes (meet_id, name, description, canvas_width, canvas_height, aspect_ratio, background_color, background_image, is_template)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(scene.meetId ?? null, scene.name, scene.description ?? null, scene.canvasWidth ?? 1920, scene.canvasHeight ?? 1080, scene.aspectRatio ?? '16:9', scene.backgroundColor ?? '#000000', scene.backgroundImage ?? null, this.fromBoolean(scene.isTemplate ?? false));
    
    const row = this.db.prepare('SELECT * FROM layout_scenes WHERE id = ?').get(result.lastInsertRowid);
    return this.mapLayoutSceneRow(row);
  }

  async updateLayoutScene(id: number, scene: Partial<InsertLayoutScene>): Promise<SelectLayoutScene | null> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (scene.name !== undefined) { setClause.push('name = ?'); values.push(scene.name); }
    if (scene.description !== undefined) { setClause.push('description = ?'); values.push(scene.description); }
    if (scene.canvasWidth !== undefined) { setClause.push('canvas_width = ?'); values.push(scene.canvasWidth); }
    if (scene.canvasHeight !== undefined) { setClause.push('canvas_height = ?'); values.push(scene.canvasHeight); }
    if (scene.aspectRatio !== undefined) { setClause.push('aspect_ratio = ?'); values.push(scene.aspectRatio); }
    if (scene.backgroundColor !== undefined) { setClause.push('background_color = ?'); values.push(scene.backgroundColor); }
    if (scene.backgroundImage !== undefined) { setClause.push('background_image = ?'); values.push(scene.backgroundImage); }
    if (scene.isTemplate !== undefined) { setClause.push('is_template = ?'); values.push(this.fromBoolean(scene.isTemplate)); }
    
    setClause.push("updated_at = datetime('now')");

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE layout_scenes SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = this.db.prepare('SELECT * FROM layout_scenes WHERE id = ?').get(id);
    return row ? this.mapLayoutSceneRow(row) : null;
  }

  async deleteLayoutScene(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM layout_scenes WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // ============= LAYOUT OBJECTS =============
  private mapLayoutObjectRow(row: any): SelectLayoutObject {
    return {
      id: row.id,
      sceneId: row.scene_id,
      name: row.name,
      objectType: row.object_type,
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      zIndex: row.z_index,
      rotation: row.rotation,
      dataBinding: this.parseJson(row.data_binding),
      config: this.parseJson(row.config),
      style: this.parseJson(row.style),
      visible: this.toBoolean(row.visible),
      locked: this.toBoolean(row.locked),
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    };
  }

  async getLayoutObjects(sceneId: number): Promise<SelectLayoutObject[]> {
    const rows = this.db.prepare('SELECT * FROM layout_objects WHERE scene_id = ? ORDER BY z_index').all(sceneId);
    return rows.map((row: any) => this.mapLayoutObjectRow(row));
  }

  async getLayoutObject(id: number): Promise<SelectLayoutObject | null> {
    const row = this.db.prepare('SELECT * FROM layout_objects WHERE id = ?').get(id);
    return row ? this.mapLayoutObjectRow(row) : null;
  }

  async createLayoutObject(object: InsertLayoutObject): Promise<SelectLayoutObject> {
    const result = this.db.prepare(`
      INSERT INTO layout_objects (scene_id, name, object_type, x, y, width, height, z_index, rotation, data_binding, config, style, visible, locked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(object.sceneId, object.name ?? null, object.objectType, object.x, object.y, object.width, object.height, object.zIndex ?? 0, object.rotation ?? 0, object.dataBinding ? this.toJson(object.dataBinding) : null, object.config ? this.toJson(object.config) : null, object.style ? this.toJson(object.style) : null, this.fromBoolean(object.visible ?? true), this.fromBoolean(object.locked ?? false));
    
    return (await this.getLayoutObject(result.lastInsertRowid as number))!;
  }

  async updateLayoutObject(id: number, object: Partial<InsertLayoutObject>): Promise<SelectLayoutObject | null> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (object.name !== undefined) { setClause.push('name = ?'); values.push(object.name); }
    if (object.objectType !== undefined) { setClause.push('object_type = ?'); values.push(object.objectType); }
    if (object.x !== undefined) { setClause.push('x = ?'); values.push(object.x); }
    if (object.y !== undefined) { setClause.push('y = ?'); values.push(object.y); }
    if (object.width !== undefined) { setClause.push('width = ?'); values.push(object.width); }
    if (object.height !== undefined) { setClause.push('height = ?'); values.push(object.height); }
    if (object.zIndex !== undefined) { setClause.push('z_index = ?'); values.push(object.zIndex); }
    if (object.rotation !== undefined) { setClause.push('rotation = ?'); values.push(object.rotation); }
    if (object.dataBinding !== undefined) { setClause.push('data_binding = ?'); values.push(this.toJson(object.dataBinding)); }
    if (object.config !== undefined) { setClause.push('config = ?'); values.push(this.toJson(object.config)); }
    if (object.style !== undefined) { setClause.push('style = ?'); values.push(this.toJson(object.style)); }
    if (object.visible !== undefined) { setClause.push('visible = ?'); values.push(this.fromBoolean(object.visible)); }
    if (object.locked !== undefined) { setClause.push('locked = ?'); values.push(this.fromBoolean(object.locked)); }

    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE layout_objects SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getLayoutObject(id);
  }

  async deleteLayoutObject(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM layout_objects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async reorderObjects(sceneId: number, objectIds: number[]): Promise<SelectLayoutObject[]> {
    const stmt = this.db.prepare('UPDATE layout_objects SET z_index = ? WHERE id = ?');
    const transaction = this.db.transaction(() => {
      for (let i = 0; i < objectIds.length; i++) {
        stmt.run(i, objectIds[i]);
      }
    });
    transaction();
    return this.getLayoutObjects(sceneId);
  }

  // ============= MEET INGESTION SETTINGS =============
  private mapIngestionSettingsRow(row: any): MeetIngestionSettings {
    return {
      id: row.id,
      meetId: row.meet_id,
      lynxFilesDirectory: row.lynx_files_directory,
      lynxFilesEnabled: this.toBoolean(row.lynx_files_enabled),
      lynxFilesLastScanAt: row.lynx_files_last_scan_at ? new Date(row.lynx_files_last_scan_at) : null,
      lynxFilesProcessedCount: row.lynx_files_processed_count,
      hytekMdbPath: row.hytek_mdb_path,
      hytekMdbEnabled: this.toBoolean(row.hytek_mdb_enabled),
      hytekMdbLastImportAt: row.hytek_mdb_last_import_at ? new Date(row.hytek_mdb_last_import_at) : null,
      hytekMdbLastHash: row.hytek_mdb_last_hash,
      hytekMdbPollIntervalSec: row.hytek_mdb_poll_interval_sec,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  async getIngestionSettings(meetId: string): Promise<MeetIngestionSettings | null> {
    const row = this.db.prepare('SELECT * FROM meet_ingestion_settings WHERE meet_id = ?').get(meetId);
    return row ? this.mapIngestionSettingsRow(row) : null;
  }

  async upsertIngestionSettings(settings: InsertMeetIngestionSettings): Promise<MeetIngestionSettings> {
    this.db.prepare(`
      INSERT INTO meet_ingestion_settings (meet_id, lynx_files_directory, lynx_files_enabled, hytek_mdb_path, hytek_mdb_enabled, hytek_mdb_poll_interval_sec, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(meet_id) DO UPDATE SET
        lynx_files_directory = excluded.lynx_files_directory,
        lynx_files_enabled = excluded.lynx_files_enabled,
        hytek_mdb_path = excluded.hytek_mdb_path,
        hytek_mdb_enabled = excluded.hytek_mdb_enabled,
        hytek_mdb_poll_interval_sec = excluded.hytek_mdb_poll_interval_sec,
        updated_at = datetime('now')
    `).run(settings.meetId, settings.lynxFilesDirectory ?? null, this.fromBoolean(settings.lynxFilesEnabled ?? false), settings.hytekMdbPath ?? null, this.fromBoolean(settings.hytekMdbEnabled ?? false), settings.hytekMdbPollIntervalSec ?? 60);
    
    return (await this.getIngestionSettings(settings.meetId))!;
  }

  async updateIngestionSettings(meetId: string, updates: Partial<InsertMeetIngestionSettings>): Promise<MeetIngestionSettings | null> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.lynxFilesDirectory !== undefined) { setClause.push('lynx_files_directory = ?'); values.push(updates.lynxFilesDirectory); }
    if (updates.lynxFilesEnabled !== undefined) { setClause.push('lynx_files_enabled = ?'); values.push(this.fromBoolean(updates.lynxFilesEnabled)); }
    if (updates.hytekMdbPath !== undefined) { setClause.push('hytek_mdb_path = ?'); values.push(updates.hytekMdbPath); }
    if (updates.hytekMdbEnabled !== undefined) { setClause.push('hytek_mdb_enabled = ?'); values.push(this.fromBoolean(updates.hytekMdbEnabled)); }
    if (updates.hytekMdbPollIntervalSec !== undefined) { setClause.push('hytek_mdb_poll_interval_sec = ?'); values.push(updates.hytekMdbPollIntervalSec); }
    
    setClause.push("updated_at = datetime('now')");

    if (setClause.length > 0) {
      values.push(meetId);
      this.db.prepare(`UPDATE meet_ingestion_settings SET ${setClause.join(', ')} WHERE meet_id = ?`).run(...values);
    }

    return this.getIngestionSettings(meetId);
  }

  async deleteIngestionSettings(meetId: string): Promise<void> {
    this.db.prepare('DELETE FROM meet_ingestion_settings WHERE meet_id = ?').run(meetId);
  }

  // ============= PROCESSED INGESTION FILES =============
  async getProcessedFiles(meetId: string): Promise<ProcessedFile[]> {
    const rows = this.db.prepare('SELECT * FROM processed_ingestion_files WHERE meet_id = ?').all(meetId);
    return rows.map((row: any) => ({
      id: row.id,
      meetId: row.meet_id,
      filePath: row.file_path,
      fileType: row.file_type,
      fileHash: row.file_hash,
      processedAt: row.processed_at ? new Date(row.processed_at) : new Date(),
      recordsProcessed: row.records_processed,
    }));
  }

  async hasProcessedFile(meetId: string, filePath: string): Promise<boolean> {
    const row = this.db.prepare('SELECT 1 FROM processed_ingestion_files WHERE meet_id = ? AND file_path = ?').get(meetId, filePath);
    return !!row;
  }

  async isFileHashProcessed(meetId: string, filePath: string, fileHash: string): Promise<boolean> {
    const row = this.db.prepare('SELECT 1 FROM processed_ingestion_files WHERE meet_id = ? AND file_path = ? AND file_hash = ?').get(meetId, filePath, fileHash);
    return !!row;
  }

  async addProcessedFile(file: InsertProcessedFile): Promise<ProcessedFile> {
    const result = this.db.prepare(`
      INSERT INTO processed_ingestion_files (meet_id, file_path, file_type, file_hash, records_processed)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(meet_id, file_path) DO UPDATE SET
        file_hash = excluded.file_hash,
        processed_at = datetime('now'),
        records_processed = excluded.records_processed
    `).run(file.meetId, file.filePath, file.fileType, file.fileHash, file.recordsProcessed ?? 0);
    
    const row = this.db.prepare('SELECT * FROM processed_ingestion_files WHERE meet_id = ? AND file_path = ?').get(file.meetId, file.filePath);
    return {
      id: (row as any).id,
      meetId: (row as any).meet_id,
      filePath: (row as any).file_path,
      fileType: (row as any).file_type,
      fileHash: (row as any).file_hash,
      processedAt: (row as any).processed_at ? new Date((row as any).processed_at) : new Date(),
      recordsProcessed: (row as any).records_processed,
    };
  }

  async clearProcessedFiles(meetId: string): Promise<void> {
    this.db.prepare('DELETE FROM processed_ingestion_files WHERE meet_id = ?').run(meetId);
  }

  // ============= EXTERNAL SCOREBOARDS (in-memory) =============
  async getExternalScoreboards(): Promise<ExternalScoreboard[]> {
    return Array.from(this.externalScoreboards.values());
  }

  async getExternalScoreboard(id: number): Promise<ExternalScoreboard | undefined> {
    return this.externalScoreboards.get(id);
  }

  async createExternalScoreboard(data: InsertExternalScoreboard): Promise<ExternalScoreboard> {
    const id = this.externalScoreboardIdCounter++;
    const now = new Date();
    const scoreboard: ExternalScoreboard = {
      id,
      name: data.name,
      lssDirectory: data.lssDirectory ?? null,
      targetIp: data.targetIp,
      targetPort: data.targetPort,
      sessionId: data.sessionId ?? null,
      followDeviceName: data.followDeviceName ?? null,
      isActive: false,
      lastStatus: null,
      lastSentAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.externalScoreboards.set(id, scoreboard);
    return scoreboard;
  }

  async updateExternalScoreboard(id: number, data: Partial<ExternalScoreboard>): Promise<ExternalScoreboard | undefined> {
    const existing = this.externalScoreboards.get(id);
    if (!existing) return undefined;
    const updated: ExternalScoreboard = {
      ...existing,
      ...data,
      id: existing.id,
      updatedAt: new Date(),
    };
    this.externalScoreboards.set(id, updated);
    return updated;
  }

  async deleteExternalScoreboard(id: number): Promise<boolean> {
    return this.externalScoreboards.delete(id);
  }

  // ============= MISSING STUB IMPLEMENTATIONS =============

  async getTotalHeatsForEvent(eventId: string, round?: string): Promise<number> {
    const eventEntries = await this.getEntriesByEvent(eventId);
    if (eventEntries.length === 0) return 1;
    
    const heatValues = new Set<number>();
    const normalizedRound = round?.toLowerCase().trim();
    
    for (const entry of eventEntries) {
      let heatNum: number | null = null;
      
      if (normalizedRound === 'prelim' || normalizedRound === 'preliminary' || normalizedRound === '1') {
        heatNum = entry.preliminaryHeat;
      } else if (normalizedRound === 'quarter' || normalizedRound === 'quarterfinal' || normalizedRound === '2') {
        heatNum = entry.quarterfinalHeat;
      } else if (normalizedRound === 'semi' || normalizedRound === 'semifinal' || normalizedRound === '3') {
        heatNum = entry.semifinalHeat;
      } else if (normalizedRound === 'final' || normalizedRound === '4' || normalizedRound === 'f') {
        heatNum = entry.finalHeat;
      } else {
        heatNum = entry.preliminaryHeat || entry.quarterfinalHeat || entry.semifinalHeat || entry.finalHeat;
      }
      
      if (heatNum) heatValues.add(heatNum);
    }
    
    const distinctHeats = heatValues.size;
    return distinctHeats > 0 ? distinctHeats : 1;
  }

  async updateDisplayAutoMode(id: string, autoMode: boolean): Promise<DisplayDevice | undefined> {
    this.db.prepare('UPDATE display_devices SET auto_mode = ? WHERE id = ?').run(this.fromBoolean(autoMode), id);
    return this.getDisplayDevice(id);
  }

  async updateDisplayDevice(id: string, updates: Partial<{ pagingSize: number; pagingInterval: number; fieldPort: number | null; isBigBoard: boolean }>): Promise<DisplayDevice | undefined> {
    const setClause: string[] = [];
    const values: any[] = [];
    
    if (updates.pagingSize !== undefined) { setClause.push('paging_size = ?'); values.push(updates.pagingSize); }
    if (updates.pagingInterval !== undefined) { setClause.push('paging_interval = ?'); values.push(updates.pagingInterval); }
    if (updates.fieldPort !== undefined) { setClause.push('field_port = ?'); values.push(updates.fieldPort); }
    if (updates.isBigBoard !== undefined) { setClause.push('is_big_board = ?'); values.push(this.fromBoolean(updates.isBigBoard)); }
    
    if (setClause.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE display_devices SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    }
    
    return this.getDisplayDevice(id);
  }

  // ============= FIELD EVENT SESSIONS =============
  async getAllFieldEventSessions(): Promise<FieldEventSession[]> {
    return [];
  }

  async getFieldEventSessionsByMeetId(meetId: string): Promise<FieldEventSession[]> {
    return [];
  }

  async getFieldEventSession(id: number): Promise<FieldEventSession | null> {
    return null;
  }

  async getFieldEventSessionByEvent(eventId: string): Promise<FieldEventSession | null> {
    return null;
  }

  async getFieldEventSessionByAccessCode(code: string): Promise<FieldEventSession | null> {
    return null;
  }

  async createFieldEventSession(session: InsertFieldEventSession): Promise<FieldEventSession> {
    const now = new Date();
    return {
      id: 0,
      eventId: session.eventId ?? null,
      status: session.status ?? 'setup',
      measurementUnit: session.measurementUnit ?? 'metric',
      recordWind: session.recordWind ?? false,
      showBibNumbers: session.showBibNumbers ?? true,
      hasFinals: session.hasFinals ?? false,
      prelimAttempts: session.prelimAttempts ?? 3,
      finalsAttempts: session.finalsAttempts ?? 3,
      athletesToFinals: session.athletesToFinals ?? 8,
      totalAttempts: session.totalAttempts ?? 6,
      aliveGroupSize: session.aliveGroupSize ?? null,
      stopAliveAtCount: session.stopAliveAtCount ?? null,
      currentFlightNumber: session.currentFlightNumber ?? 1,
      currentAthleteIndex: session.currentAthleteIndex ?? 0,
      currentAttemptNumber: session.currentAttemptNumber ?? 1,
      currentHeightIndex: session.currentHeightIndex ?? 0,
      isInFinals: session.isInFinals ?? false,
      accessCode: session.accessCode ?? null,
      lffExportPath: session.lffExportPath ?? null,
      evtFilePath: session.evtFilePath ?? null,
      evtEventNumber: session.evtEventNumber ?? null,
      evtEventName: session.evtEventName ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateFieldEventSession(id: number, updates: Partial<InsertFieldEventSession>): Promise<FieldEventSession | null> {
    return null;
  }

  async deleteFieldEventSession(id: number): Promise<void> {
    // stub: no-op
  }

  async getFieldEventSessionWithDetails(id: number): Promise<FieldEventSessionWithDetails | null> {
    return null;
  }

  // ============= FIELD HEIGHTS =============
  async getFieldHeights(sessionId: number): Promise<FieldHeight[]> {
    return [];
  }

  async createFieldHeight(height: InsertFieldHeight): Promise<FieldHeight> {
    return {
      id: 0,
      sessionId: height.sessionId,
      heightIndex: height.heightIndex,
      heightMeters: height.heightMeters,
      isActive: height.isActive ?? true,
      isJumpOff: height.isJumpOff ?? false,
      createdAt: new Date(),
    };
  }

  async updateFieldHeight(id: number, updates: Partial<InsertFieldHeight>): Promise<FieldHeight | null> {
    return null;
  }

  async deleteFieldHeight(id: number): Promise<void> {
    // stub: no-op
  }

  async setFieldHeights(sessionId: number, heights: InsertFieldHeight[]): Promise<FieldHeight[]> {
    return [];
  }

  // ============= FIELD EVENT FLIGHTS =============
  async getFieldEventFlights(sessionId: number): Promise<FieldEventFlight[]> {
    return [];
  }

  async createFieldEventFlight(flight: InsertFieldEventFlight): Promise<FieldEventFlight> {
    return {
      id: 0,
      sessionId: flight.sessionId,
      flightNumber: flight.flightNumber,
      status: flight.status ?? 'pending',
      createdAt: new Date(),
    };
  }

  async updateFieldEventFlight(id: number, updates: Partial<InsertFieldEventFlight>): Promise<FieldEventFlight | null> {
    return null;
  }

  // ============= FIELD EVENT ATHLETES =============
  async getFieldEventAthletes(sessionId: number): Promise<FieldEventAthlete[]> {
    return [];
  }

  async getFieldEventAthlete(id: number): Promise<FieldEventAthlete | null> {
    return null;
  }

  async createFieldEventAthlete(athlete: InsertFieldEventAthlete): Promise<FieldEventAthlete> {
    const now = new Date();
    return {
      id: 0,
      sessionId: athlete.sessionId,
      entryId: athlete.entryId ?? null,
      flightNumber: athlete.flightNumber ?? 1,
      orderInFlight: athlete.orderInFlight,
      checkInStatus: athlete.checkInStatus ?? 'pending',
      checkedInAt: null,
      competitionStatus: athlete.competitionStatus ?? 'waiting',
      checkedOutAt: null,
      retiredAt: null,
      startingHeightIndex: athlete.startingHeightIndex ?? 0,
      bestMark: athlete.bestMark ?? null,
      currentPlace: athlete.currentPlace ?? null,
      evtBibNumber: athlete.evtBibNumber ?? null,
      evtFirstName: athlete.evtFirstName ?? null,
      evtLastName: athlete.evtLastName ?? null,
      evtTeam: athlete.evtTeam ?? null,
      isFinalist: athlete.isFinalist ?? false,
      finalsOrder: athlete.finalsOrder ?? null,
      notes: athlete.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateFieldEventAthlete(id: number, updates: Partial<InsertFieldEventAthlete>): Promise<FieldEventAthlete | null> {
    return null;
  }

  async deleteFieldEventAthlete(id: number): Promise<void> {
    // stub: no-op
  }

  async checkInFieldAthlete(id: number): Promise<FieldEventAthlete | null> {
    return null;
  }

  async scratchFieldAthlete(id: number): Promise<FieldEventAthlete | null> {
    return null;
  }

  // ============= FIELD EVENT MARKS =============
  async getFieldEventMark(id: number): Promise<FieldEventMark | null> {
    return null;
  }

  async getFieldEventMarks(sessionId: number): Promise<FieldEventMark[]> {
    return [];
  }

  async getFieldEventMarksByAthlete(athleteId: number): Promise<FieldEventMark[]> {
    return [];
  }

  async createFieldEventMark(mark: InsertFieldEventMark): Promise<FieldEventMark> {
    return {
      id: 0,
      sessionId: mark.sessionId,
      athleteId: mark.athleteId,
      attemptNumber: mark.attemptNumber,
      heightIndex: mark.heightIndex ?? null,
      attemptAtHeight: mark.attemptAtHeight ?? null,
      markType: mark.markType,
      measurement: mark.measurement ?? null,
      measurementDisplay: mark.measurementDisplay ?? null,
      wind: mark.wind ?? null,
      isBest: mark.isBest ?? false,
      isDarkMark: mark.isDarkMark ?? false,
      darkMeasurement: mark.darkMeasurement ?? null,
      isFinalsRound: mark.isFinalsRound ?? false,
      recordedAt: new Date(),
    };
  }

  async updateFieldEventMark(id: number, updates: Partial<InsertFieldEventMark>): Promise<FieldEventMark | null> {
    return null;
  }

  async deleteFieldEventMark(id: number): Promise<void> {
    // stub: no-op
  }

  // ============= SCENE TEMPLATE MAPPINGS =============
  async getSceneTemplateMappings(meetId: string): Promise<SelectSceneTemplateMapping[]> {
    const rows = this.db.prepare(`
      SELECT id, meet_id, display_type, display_mode, scene_id, created_at, updated_at
      FROM scene_template_mappings
      WHERE meet_id = ?
    `).all(meetId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      meetId: row.meet_id,
      displayType: row.display_type,
      displayMode: row.display_mode,
      sceneId: row.scene_id,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    }));
  }

  async getSceneTemplateMappingByTypeAndMode(meetId: string, displayType: string, displayMode: string): Promise<SelectSceneTemplateMapping | undefined> {
    const row = this.db.prepare(`
      SELECT id, meet_id, display_type, display_mode, scene_id, created_at, updated_at
      FROM scene_template_mappings
      WHERE meet_id = ? AND display_type = ? AND display_mode = ?
    `).get(meetId, displayType, displayMode) as any;
    
    if (!row) return undefined;
    
    return {
      id: row.id,
      meetId: row.meet_id,
      displayType: row.display_type,
      displayMode: row.display_mode,
      sceneId: row.scene_id,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  async setSceneTemplateMapping(mapping: InsertSceneTemplateMapping): Promise<SelectSceneTemplateMapping> {
    // Use INSERT OR REPLACE to handle upsert (unique constraint on meet_id, display_type, display_mode)
    const result = this.db.prepare(`
      INSERT INTO scene_template_mappings (meet_id, display_type, display_mode, scene_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(meet_id, display_type, display_mode) 
      DO UPDATE SET scene_id = excluded.scene_id, updated_at = datetime('now')
    `).run(mapping.meetId, mapping.displayType, mapping.displayMode, mapping.sceneId);
    
    const id = result.lastInsertRowid as number;
    
    // Fetch the record (might be updated, not inserted)
    const row = this.db.prepare(`
      SELECT id, meet_id, display_type, display_mode, scene_id, created_at, updated_at
      FROM scene_template_mappings
      WHERE meet_id = ? AND display_type = ? AND display_mode = ?
    `).get(mapping.meetId, mapping.displayType, mapping.displayMode) as any;
    
    return {
      id: row.id,
      meetId: row.meet_id,
      displayType: row.display_type,
      displayMode: row.display_mode,
      sceneId: row.scene_id,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }

  async deleteSceneTemplateMapping(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM scene_template_mappings WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public close(): void {
    this.db.close();
  }
}
