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
  type DisplayComputer,
  type InsertDisplayComputer,
  type DisplayAssignment,
  type InsertDisplayAssignment,
  type DisplayTheme,
  type InsertDisplayTheme,
  type BoardConfig,
  type InsertBoardConfig,
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
  events,
  athletes,
  entries,
  meets,
  seasons,
  teams,
  divisions,
  eventSplitConfigs,
  entrySplits,
  displayComputers,
  displayAssignments,
  displayThemes,
  boardConfigs,
  displayLayouts,
  layoutCells,
  athletePhotos,
  teamLogos,
  compositeLayouts,
  layoutZones,
  recordBooks,
  records,
  scoringPresets,
  presetRules,
  meetScoringProfiles,
  meetScoringOverrides,
  meetScoringState,
  teamScoringResults,
  windReadings,
  fieldAttempts,
  judgeTokens,
  isTimeEvent,
  isDistanceEvent,
  isHeightEvent,
  parsePerformanceToSeconds,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, not, inArray, count, isNull, desc } from "drizzle-orm";

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventsByMeetId(meetId: string): Promise<Event[]>;
  getCurrentEvent(): Promise<EventWithEntries | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEventStatus(id: string, status: string): Promise<Event | undefined>;

  // Athletes
  getAthletes(): Promise<Athlete[]>;
  getAthlete(id: string): Promise<Athlete | undefined>;
  getAthletesByMeetId(meetId: string): Promise<Athlete[]>;
  createAthlete(athlete: InsertAthlete): Promise<Athlete>;

  // Entries (unified results for track and field)
  getEntries(): Promise<Entry[]>;
  getEntry(id: string): Promise<EntryWithDetails | null>;
  getEntriesByEvent(eventId: string): Promise<Entry[]>;
  getEntriesWithDetails(eventId: string): Promise<EntryWithDetails[]>;
  createEntry(entry: InsertEntry): Promise<Entry>;
  updateEntry(id: string, updates: Partial<InsertEntry>): Promise<Entry | undefined>;

  // Seasons
  getSeasons(): Promise<Season[]>;
  getSeason(id: number): Promise<Season | undefined>;
  createSeason(season: InsertSeason): Promise<Season>;
  updateSeason(id: number, updates: Partial<InsertSeason>): Promise<Season | undefined>;
  deleteSeason(id: number): Promise<void>;

  // Meets
  getMeets(): Promise<Meet[]>;
  getMeet(id: string): Promise<Meet | undefined>;
  getMeetsBySeason(seasonId: number): Promise<Meet[]>;
  createMeet(meet: InsertMeet): Promise<Meet>;
  updateMeet(id: string, data: Partial<InsertMeet>): Promise<Meet | null>;
  updateMeetStatus(meetId: string, status: string): Promise<Meet | undefined>;

  // Teams
  getTeams(): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;

  // Divisions
  getDivisions(): Promise<Division[]>;
  getDivision(id: string): Promise<Division | undefined>;
  createDivision(division: InsertDivision): Promise<Division>;

  // Combined
  getEventWithEntries(eventId: string): Promise<EventWithEntries | undefined>;

  // Display Management
  registerDisplay(meetCode: string, computerName: string): Promise<{ display: DisplayComputer, meet: Meet } | null>;
  assignDisplay(displayId: string, assignment: { targetType: string, targetId?: string, layout?: string }): Promise<DisplayAssignment | null>;
  getDisplaysByMeet(meetId: string): Promise<DisplayComputer[]>;
  getDisplayAssignment(displayId: string): Promise<DisplayAssignment | null>;
  updateDisplayHeartbeat(displayId: string): Promise<void>;
  verifyDisplayToken(displayId: string, authToken: string): Promise<boolean>;

  // Display Themes
  createDisplayTheme(theme: InsertDisplayTheme): Promise<DisplayTheme>;
  getDisplayThemes(meetId: string): Promise<DisplayTheme[]>;
  getDisplayTheme(id: string): Promise<DisplayTheme | null>;
  getDefaultDisplayTheme(meetId: string): Promise<DisplayTheme | null>;
  updateDisplayTheme(id: string, theme: Partial<InsertDisplayTheme>): Promise<DisplayTheme | null>;
  deleteDisplayTheme(id: string): Promise<void>;

  // Board Configs
  createBoardConfig(config: InsertBoardConfig): Promise<BoardConfig>;
  getBoardConfig(boardId: string, meetId: string): Promise<BoardConfig | null>;
  updateBoardConfig(id: string, config: Partial<InsertBoardConfig>): Promise<BoardConfig | null>;
  deleteBoardConfig(id: string): Promise<void>;

  // Display Layouts
  createDisplayLayout(layout: InsertDisplayLayout): Promise<DisplayLayout>;
  getDisplayLayoutsByMeet(meetId: string): Promise<DisplayLayout[]>;
  getDisplayLayoutById(id: string): Promise<DisplayLayout | null>;
  updateDisplayLayout(id: string, layout: Partial<InsertDisplayLayout>): Promise<DisplayLayout>;
  deleteDisplayLayout(id: string): Promise<void>;

  // Layout Cells
  createLayoutCell(cell: InsertLayoutCell): Promise<LayoutCell>;
  getLayoutCellsByLayout(layoutId: string): Promise<LayoutCell[]>;
  updateLayoutCell(id: string, cell: Partial<InsertLayoutCell>): Promise<LayoutCell>;
  deleteLayoutCell(id: string): Promise<void>;

  // Athlete Photos
  getAthletePhoto(athleteId: string): Promise<AthletePhoto | null>;
  createAthletePhoto(photo: InsertAthletePhoto): Promise<{ newPhoto: AthletePhoto; oldPhoto: AthletePhoto | null }>;
  deleteAthletePhoto(athleteId: string): Promise<{ photo: AthletePhoto; deleted: boolean }>;
  getAthletePhotosByMeet(meetId: string): Promise<AthletePhoto[]>;

  // Team Logos
  getTeamLogo(teamId: string): Promise<TeamLogo | null>;
  createTeamLogo(logo: InsertTeamLogo): Promise<{ newLogo: TeamLogo; oldLogo: TeamLogo | null }>;
  deleteTeamLogo(teamId: string): Promise<{ logo: TeamLogo; deleted: boolean }>;
  getTeamLogosByMeet(meetId: string): Promise<TeamLogo[]>;

  // Composite Layouts
  listLayouts(meetId?: string): Promise<SelectCompositeLayout[]>;
  getLayout(id: number): Promise<SelectCompositeLayout | null>;
  getLayoutWithZones(id: number): Promise<{ layout: SelectCompositeLayout; zones: SelectLayoutZone[] } | null>;
  createLayout(data: InsertCompositeLayout): Promise<SelectCompositeLayout>;
  updateLayout(id: number, data: Partial<InsertCompositeLayout>): Promise<SelectCompositeLayout | null>;
  deleteLayout(id: number): Promise<boolean>;

  // Layout Zones
  createZone(data: InsertLayoutZone): Promise<SelectLayoutZone>;
  updateZone(id: number, data: Partial<InsertLayoutZone>): Promise<SelectLayoutZone | null>;
  deleteZone(id: number): Promise<boolean>;
  getZonesByLayout(layoutId: number): Promise<SelectLayoutZone[]>;

  // Record Books
  getRecordBooks(): Promise<SelectRecordBook[]>;
  getRecordBook(id: number): Promise<SelectRecordBook | undefined>;
  createRecordBook(book: InsertRecordBook): Promise<SelectRecordBook>;
  updateRecordBook(id: number, updates: Partial<InsertRecordBook>): Promise<SelectRecordBook | undefined>;
  deleteRecordBook(id: number): Promise<void>;

  // Records
  getRecords(bookId?: number, eventType?: string, gender?: string): Promise<SelectRecord[]>;
  getRecord(id: number): Promise<SelectRecord | undefined>;
  getRecordForEvent(bookId: number, eventType: string, gender: string): Promise<SelectRecord | undefined>;
  createRecord(record: InsertRecord): Promise<SelectRecord>;
  updateRecord(id: number, updates: Partial<InsertRecord>): Promise<SelectRecord | undefined>;
  deleteRecord(id: number): Promise<void>;

  // Record Checking
  checkForRecords(eventType: string, gender: string, performance: string): Promise<RecordCheck[]>;

  // Team Scoring - Presets
  getScoringPresets(): Promise<ScoringPreset[]>;
  getScoringPreset(id: number): Promise<ScoringPreset | undefined>;
  getPresetRules(presetId: number): Promise<PresetRule[]>;
  createScoringPreset(preset: InsertScoringPreset): Promise<ScoringPreset>;
  createPresetRule(rule: InsertPresetRule): Promise<PresetRule>;
  
  // Scoring seeding
  seedScoringPresets(): Promise<void>;

  // Team Scoring - Meet Profile
  getMeetScoringProfile(meetId: string): Promise<MeetScoringProfile | undefined>;
  upsertMeetScoringProfile(profile: InsertMeetScoringProfile): Promise<MeetScoringProfile>;
  getMeetScoringOverrides(profileId: string): Promise<MeetScoringOverride[]>;
  upsertScoringOverride(override: InsertMeetScoringOverride): Promise<MeetScoringOverride>;
  deleteScoringOverrides(profileId: string): Promise<void>;

  // Team Scoring - State and Results
  getMeetScoringState(profileId: string): Promise<MeetScoringState | undefined>;
  updateMeetScoringState(profileId: string, updates: Partial<InsertMeetScoringState>): Promise<void>;
  clearTeamScoringResults(profileId: string): Promise<void>;
  createTeamScoringResult(result: InsertTeamScoringResult): Promise<TeamScoringResult>;

  // Team Scoring - Queries
  getTeamStandings(meetId: string, scope?: { gender?: string; division?: string }): Promise<TeamStandingsEntry[]>;
  recalculateTeamScoring(meetId: string): Promise<void>;
  getEventPoints(eventId: string): Promise<EventPointsBreakdown>;
  
  // Check-in operations
  markCheckedIn(entryId: string, operator: string, method: string): Promise<EntryWithDetails>;
  bulkCheckIn(entryIds: string[], operator: string, method: string): Promise<EntryWithDetails[]>;
  getCheckInStats(eventId: string): Promise<{ total: number; checkedIn: number; pending: number; noShow: number }>;

  // Split times
  seedSplitDefaults(): Promise<void>;
  getSplitConfigs(eventId: string): Promise<EventSplitConfig[]>;
  createSplitConfig(config: InsertEventSplitConfig): Promise<EventSplitConfig>;
  updateSplitConfigs(eventType: string, meetId: string | null, configs: InsertEventSplitConfig[]): Promise<EventSplitConfig[]>;
  getEntrySplits(eventId: string): Promise<Map<string, EntrySplit[]>>;
  createEntrySplit(split: InsertEntrySplit): Promise<EntrySplit>;
  createEntrySplitsBatch(splits: InsertEntrySplit[]): Promise<EntrySplit[]>;
  deleteEntrySplit(entryId: string, splitIndex: number): Promise<void>;

  // Wind readings
  createWindReading(reading: InsertWindReading): Promise<WindReading>;
  getWindReadings(eventId: string): Promise<WindReading[]>;
  updateWindReading(id: string, windSpeed: number): Promise<WindReading>;
  deleteWindReading(id: string): Promise<void>;

  // Field attempts
  createFieldAttempt(attempt: InsertFieldAttempt): Promise<FieldAttempt>;
  getFieldAttempts(entryId: string): Promise<FieldAttempt[]>;
  getEventFieldAttempts(eventId: string): Promise<Map<string, FieldAttempt[]>>;
  updateFieldAttempt(id: string, data: Partial<InsertFieldAttempt>): Promise<FieldAttempt>;
  deleteFieldAttempt(id: string): Promise<void>;

  // Judge tokens
  createJudgeToken(token: InsertJudgeToken): Promise<JudgeToken>;
  getJudgeToken(code: string): Promise<JudgeToken | null>;
  getJudgeTokens(meetId: string): Promise<JudgeToken[]>;
  deactivateJudgeToken(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Events
  async getEvents(): Promise<Event[]> {
    return db.select().from(events);
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEventsByMeetId(meetId: string): Promise<Event[]> {
    return db.select().from(events).where(eq(events.meetId, meetId));
  }

  async getCurrentEvent(): Promise<EventWithEntries | undefined> {
    const allEvents = await db.select().from(events);
    
    // Priority: in_progress > scheduled > completed
    let currentEvent = allEvents.find((e) => e.status === "in_progress");
    if (!currentEvent) {
      currentEvent = allEvents.find((e) => e.status === "scheduled");
    }
    if (!currentEvent) {
      const completedEvents = allEvents.filter((e) => e.status === "completed");
      currentEvent = completedEvents[completedEvents.length - 1];
    }

    if (!currentEvent) {
      return undefined;
    }

    return this.getEventWithEntries(currentEvent.id);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(insertEvent)
      .returning();
    return event;
  }

  async updateEventStatus(id: string, status: string): Promise<Event | undefined> {
    const [updated] = await db
      .update(events)
      .set({ status })
      .where(eq(events.id, id))
      .returning();
    return updated || undefined;
  }

  // Athletes
  async getAthletes(): Promise<Athlete[]> {
    return db.select().from(athletes);
  }

  async getAthlete(id: string): Promise<Athlete | undefined> {
    const [athlete] = await db.select().from(athletes).where(eq(athletes.id, id));
    return athlete || undefined;
  }

  async getAthletesByMeetId(meetId: string): Promise<Athlete[]> {
    return db.select().from(athletes).where(eq(athletes.meetId, meetId));
  }

  async createAthlete(insertAthlete: InsertAthlete): Promise<Athlete> {
    const [athlete] = await db
      .insert(athletes)
      .values(insertAthlete)
      .returning();
    return athlete;
  }

  // Entries (unified results)
  async getEntries(): Promise<Entry[]> {
    return db.select().from(entries);
  }

  async getEntry(id: string): Promise<EntryWithDetails | null> {
    const result = await db.query.entries.findFirst({
      where: eq(entries.id, id),
      with: {
        athlete: true,
        team: true,
        event: true,
        splits: true,
      },
    });
    
    return result ? (result as EntryWithDetails) : null;
  }

  async getEntriesByEvent(eventId: string): Promise<Entry[]> {
    return db
      .select()
      .from(entries)
      .where(eq(entries.eventId, eventId));
  }

  async getEntriesWithDetails(eventId: string): Promise<EntryWithDetails[]> {
    // Fetch entries with joined athlete, team, event, and splits
    const eventEntries = await db.query.entries.findMany({
      where: eq(entries.eventId, eventId),
      with: {
        athlete: true,
        team: true,
        event: true,
        splits: true,
      },
    });
    
    return eventEntries as EntryWithDetails[];
  }

  async createEntry(insertEntry: InsertEntry): Promise<Entry> {
    const [entry] = await db
      .insert(entries)
      .values(insertEntry)
      .returning();
    return entry;
  }

  async updateEntry(id: string, updates: Partial<InsertEntry>): Promise<Entry | undefined> {
    const [updated] = await db
      .update(entries)
      .set(updates)
      .where(eq(entries.id, id))
      .returning();
    return updated || undefined;
  }

  // Seasons
  async getSeasons(): Promise<Season[]> {
    return db.select().from(seasons);
  }

  async getSeason(id: number): Promise<Season | undefined> {
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id));
    return season || undefined;
  }

  async createSeason(insertSeason: InsertSeason): Promise<Season> {
    const [season] = await db
      .insert(seasons)
      .values(insertSeason)
      .returning();
    return season;
  }

  async updateSeason(id: number, updates: Partial<InsertSeason>): Promise<Season | undefined> {
    const [updated] = await db
      .update(seasons)
      .set(updates)
      .where(eq(seasons.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSeason(id: number): Promise<void> {
    await db.delete(seasons).where(eq(seasons.id, id));
  }

  // Meets
  async getMeets(): Promise<Meet[]> {
    return db.select().from(meets);
  }

  async getMeet(id: string): Promise<Meet | undefined> {
    const [meet] = await db.select().from(meets).where(eq(meets.id, id));
    return meet || undefined;
  }

  async getMeetsBySeason(seasonId: number): Promise<Meet[]> {
    return db.select().from(meets).where(eq(meets.seasonId, seasonId));
  }

  async createMeet(insertMeet: InsertMeet): Promise<Meet> {
    const [meet] = await db
      .insert(meets)
      .values(insertMeet)
      .returning();
    return meet;
  }

  async updateMeet(id: string, data: Partial<InsertMeet>): Promise<Meet | null> {
    const [meet] = await db
      .update(meets)
      .set({ ...data })
      .where(eq(meets.id, id))
      .returning();
    return meet || null;
  }

  async updateMeetStatus(meetId: string, status: string): Promise<Meet | undefined> {
    const [updated] = await db
      .update(meets)
      .set({ status })
      .where(eq(meets.id, meetId))
      .returning();
    return updated || undefined;
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values(insertTeam)
      .returning();
    return team;
  }

  // Divisions
  async getDivisions(): Promise<Division[]> {
    return db.select().from(divisions);
  }

  async getDivision(id: string): Promise<Division | undefined> {
    const [division] = await db.select().from(divisions).where(eq(divisions.id, id));
    return division || undefined;
  }

  async createDivision(insertDivision: InsertDivision): Promise<Division> {
    const [division] = await db
      .insert(divisions)
      .values(insertDivision)
      .returning();
    return division;
  }

  // Combined
  async getEventWithEntries(eventId: string): Promise<EventWithEntries | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      return undefined;
    }

    const entriesWithDetails = await this.getEntriesWithDetails(eventId);

    return {
      ...event,
      entries: entriesWithDetails,
    };
  }

  // Display Management
  async registerDisplay(meetCode: string, computerName: string): Promise<{ display: DisplayComputer, meet: Meet } | null> {
    const [meet] = await db.select().from(meets).where(eq(meets.meetCode, meetCode));
    if (!meet) {
      return null;
    }

    const [display] = await db
      .insert(displayComputers)
      .values({
        meetId: meet.id,
        computerName,
        lastSeenAt: new Date(),
        isOnline: true,
      })
      .returning();

    return { display, meet };
  }

  async assignDisplay(displayId: string, assignment: { targetType: string, targetId?: string, layout?: string }): Promise<DisplayAssignment | null> {
    const [display] = await db.select().from(displayComputers).where(eq(displayComputers.id, displayId));
    if (!display) {
      return null;
    }

    const existingAssignments = await db
      .select()
      .from(displayAssignments)
      .where(eq(displayAssignments.displayId, displayId));

    if (existingAssignments.length > 0) {
      const [updated] = await db
        .update(displayAssignments)
        .set({
          targetType: assignment.targetType,
          targetId: assignment.targetId || null,
          layout: assignment.layout || null,
        })
        .where(eq(displayAssignments.displayId, displayId))
        .returning();
      return updated;
    } else {
      const [newAssignment] = await db
        .insert(displayAssignments)
        .values({
          meetId: display.meetId,
          displayId,
          targetType: assignment.targetType,
          targetId: assignment.targetId || null,
          layout: assignment.layout || null,
        })
        .returning();
      return newAssignment;
    }
  }

  async getDisplaysByMeet(meetId: string): Promise<DisplayComputer[]> {
    return db.select().from(displayComputers).where(eq(displayComputers.meetId, meetId));
  }

  async getDisplayAssignment(displayId: string): Promise<DisplayAssignment | null> {
    const [assignment] = await db
      .select()
      .from(displayAssignments)
      .where(eq(displayAssignments.displayId, displayId));
    return assignment || null;
  }

  async updateDisplayHeartbeat(displayId: string): Promise<void> {
    await db
      .update(displayComputers)
      .set({
        lastSeenAt: new Date(),
        isOnline: true,
      })
      .where(eq(displayComputers.id, displayId));
  }

  async verifyDisplayToken(displayId: string, authToken: string): Promise<boolean> {
    const [display] = await db
      .select()
      .from(displayComputers)
      .where(eq(displayComputers.id, displayId));
    
    if (!display) {
      return false;
    }

    return display.authToken === authToken;
  }

  // Display Themes
  async createDisplayTheme(theme: InsertDisplayTheme): Promise<DisplayTheme> {
    return await db.transaction(async (tx) => {
      // If this is being set as default, unset any existing defaults for this meet
      if (theme.isDefault) {
        await tx
          .update(displayThemes)
          .set({ isDefault: false })
          .where(and(
            eq(displayThemes.meetId, theme.meetId),
            eq(displayThemes.isDefault, true)
          ));
      }

      const [newTheme] = await tx
        .insert(displayThemes)
        .values({
          ...theme,
          updatedAt: new Date(),
        } as any)
        .returning();

      return newTheme;
    });
  }

  async getDisplayThemes(meetId: string): Promise<DisplayTheme[]> {
    return db
      .select()
      .from(displayThemes)
      .where(eq(displayThemes.meetId, meetId));
  }

  async getDisplayTheme(id: string): Promise<DisplayTheme | null> {
    const [theme] = await db
      .select()
      .from(displayThemes)
      .where(eq(displayThemes.id, id));
    return theme || null;
  }

  async getDefaultDisplayTheme(meetId: string): Promise<DisplayTheme | null> {
    const [theme] = await db
      .select()
      .from(displayThemes)
      .where(and(
        eq(displayThemes.meetId, meetId),
        eq(displayThemes.isDefault, true)
      ));
    return theme || null;
  }

  async updateDisplayTheme(id: string, theme: Partial<InsertDisplayTheme>): Promise<DisplayTheme | null> {
    return await db.transaction(async (tx) => {
      // Get existing theme to check meetId
      const [existing] = await tx.select().from(displayThemes).where(eq(displayThemes.id, id));
      if (!existing) return null;

      // If setting as default, unset other defaults for same meet
      if (theme.isDefault) {
        await tx
          .update(displayThemes)
          .set({ isDefault: false })
          .where(and(
            eq(displayThemes.meetId, existing.meetId),
            eq(displayThemes.isDefault, true),
            not(eq(displayThemes.id, id))
          ));
      }

      const [updated] = await tx
        .update(displayThemes)
        .set({
          ...theme,
          updatedAt: new Date(),
        } as any)
        .where(eq(displayThemes.id, id))
        .returning();

      return updated || null;
    });
  }

  async deleteDisplayTheme(id: string): Promise<void> {
    await db
      .delete(displayThemes)
      .where(eq(displayThemes.id, id));
  }

  // Board Configs
  async createBoardConfig(config: InsertBoardConfig): Promise<BoardConfig> {
    const [newConfig] = await db
      .insert(boardConfigs)
      .values(config as any)
      .returning();
    return newConfig;
  }

  async getBoardConfig(boardId: string, meetId: string): Promise<BoardConfig | null> {
    const [config] = await db
      .select()
      .from(boardConfigs)
      .where(and(
        eq(boardConfigs.boardId, boardId),
        eq(boardConfigs.meetId, meetId)
      ));
    return config || null;
  }

  async updateBoardConfig(id: string, config: Partial<InsertBoardConfig>): Promise<BoardConfig | null> {
    const [updated] = await db
      .update(boardConfigs)
      .set({ ...config, updatedAt: new Date() } as any)
      .where(eq(boardConfigs.id, id))
      .returning();
    return updated || null;
  }

  async deleteBoardConfig(id: string): Promise<void> {
    await db
      .delete(boardConfigs)
      .where(eq(boardConfigs.id, id));
  }

  // Display Layouts
  async createDisplayLayout(layout: InsertDisplayLayout): Promise<DisplayLayout> {
    const [newLayout] = await db
      .insert(displayLayouts)
      .values({
        ...layout,
        updatedAt: new Date(),
      } as any)
      .returning();
    return newLayout;
  }

  async getDisplayLayoutsByMeet(meetId: string): Promise<DisplayLayout[]> {
    return db
      .select()
      .from(displayLayouts)
      .where(eq(displayLayouts.meetId, meetId));
  }

  async getDisplayLayoutById(id: string): Promise<DisplayLayout | null> {
    const [layout] = await db
      .select()
      .from(displayLayouts)
      .where(eq(displayLayouts.id, id));
    return layout || null;
  }

  async updateDisplayLayout(id: string, layout: Partial<InsertDisplayLayout>): Promise<DisplayLayout> {
    const [updated] = await db
      .update(displayLayouts)
      .set({
        ...layout,
        updatedAt: new Date(),
      } as any)
      .where(eq(displayLayouts.id, id))
      .returning();
    return updated;
  }

  async deleteDisplayLayout(id: string): Promise<void> {
    await db
      .delete(displayLayouts)
      .where(eq(displayLayouts.id, id));
  }

  // Layout Cells
  async createLayoutCell(cell: InsertLayoutCell): Promise<LayoutCell> {
    const [newCell] = await db
      .insert(layoutCells)
      .values(cell as any)
      .returning();
    return newCell;
  }

  async getLayoutCellsByLayout(layoutId: string): Promise<LayoutCell[]> {
    return db
      .select()
      .from(layoutCells)
      .where(eq(layoutCells.layoutId, layoutId));
  }

  async updateLayoutCell(id: string, cell: Partial<InsertLayoutCell>): Promise<LayoutCell> {
    const [updated] = await db
      .update(layoutCells)
      .set(cell as any)
      .where(eq(layoutCells.id, id))
      .returning();
    return updated;
  }

  async deleteLayoutCell(id: string): Promise<void> {
    await db
      .delete(layoutCells)
      .where(eq(layoutCells.id, id));
  }

  // Athlete Photos
  async getAthletePhoto(athleteId: string): Promise<AthletePhoto | null> {
    const [photo] = await db
      .select()
      .from(athletePhotos)
      .where(eq(athletePhotos.athleteId, athleteId));
    return photo || null;
  }

  async createAthletePhoto(photo: InsertAthletePhoto): Promise<{ newPhoto: AthletePhoto; oldPhoto: AthletePhoto | null }> {
    const [oldPhoto] = await db.select().from(athletePhotos).where(eq(athletePhotos.athleteId, photo.athleteId));
    
    const [newPhoto] = await db
      .insert(athletePhotos)
      .values(photo as any)
      .onConflictDoUpdate({
        target: athletePhotos.athleteId,
        set: {
          storageKey: photo.storageKey,
          originalFilename: photo.originalFilename,
          contentType: photo.contentType,
          width: photo.width,
          height: photo.height,
          byteSize: photo.byteSize,
          uploadedAt: sql`now()`,
        },
      })
      .returning();
    
    return { newPhoto, oldPhoto: oldPhoto || null };
  }

  async deleteAthletePhoto(athleteId: string): Promise<{ photo: AthletePhoto; deleted: boolean }> {
    const [photo] = await db
      .select()
      .from(athletePhotos)
      .where(eq(athletePhotos.athleteId, athleteId));

    if (!photo) {
      throw new Error(`Athlete photo not found for athleteId: ${athleteId}`);
    }

    await db
      .delete(athletePhotos)
      .where(eq(athletePhotos.athleteId, athleteId));

    return { photo, deleted: true };
  }

  async getAthletePhotosByMeet(meetId: string): Promise<AthletePhoto[]> {
    return db
      .select()
      .from(athletePhotos)
      .where(eq(athletePhotos.meetId, meetId));
  }

  // Team Logos
  async getTeamLogo(teamId: string): Promise<TeamLogo | null> {
    const [logo] = await db
      .select()
      .from(teamLogos)
      .where(eq(teamLogos.teamId, teamId));
    return logo || null;
  }

  async createTeamLogo(logo: InsertTeamLogo): Promise<{ newLogo: TeamLogo; oldLogo: TeamLogo | null }> {
    const [oldLogo] = await db.select().from(teamLogos).where(eq(teamLogos.teamId, logo.teamId));
    
    const [newLogo] = await db
      .insert(teamLogos)
      .values(logo as any)
      .onConflictDoUpdate({
        target: teamLogos.teamId,
        set: {
          storageKey: logo.storageKey,
          originalFilename: logo.originalFilename,
          contentType: logo.contentType,
          width: logo.width,
          height: logo.height,
          byteSize: logo.byteSize,
          uploadedAt: sql`now()`,
        },
      })
      .returning();
    
    return { newLogo, oldLogo: oldLogo || null };
  }

  async deleteTeamLogo(teamId: string): Promise<{ logo: TeamLogo; deleted: boolean }> {
    const [logo] = await db
      .select()
      .from(teamLogos)
      .where(eq(teamLogos.teamId, teamId));

    if (!logo) {
      throw new Error(`Team logo not found for teamId: ${teamId}`);
    }

    await db
      .delete(teamLogos)
      .where(eq(teamLogos.teamId, teamId));

    return { logo, deleted: true };
  }

  async getTeamLogosByMeet(meetId: string): Promise<TeamLogo[]> {
    return db
      .select()
      .from(teamLogos)
      .where(eq(teamLogos.meetId, meetId));
  }

  // Composite Layouts
  async listLayouts(meetId?: string): Promise<SelectCompositeLayout[]> {
    if (meetId) {
      return db
        .select()
        .from(compositeLayouts)
        .where(eq(compositeLayouts.meetId, meetId));
    }
    return db.select().from(compositeLayouts);
  }

  async getLayout(id: number): Promise<SelectCompositeLayout | null> {
    const [layout] = await db
      .select()
      .from(compositeLayouts)
      .where(eq(compositeLayouts.id, id));
    return layout || null;
  }

  async getLayoutWithZones(id: number): Promise<{ layout: SelectCompositeLayout; zones: SelectLayoutZone[] } | null> {
    const layout = await this.getLayout(id);
    if (!layout) {
      return null;
    }

    const zones = await this.getZonesByLayout(id);
    return { layout, zones };
  }

  async createLayout(data: InsertCompositeLayout): Promise<SelectCompositeLayout> {
    const [layout] = await db
      .insert(compositeLayouts)
      .values({
        ...data,
        updatedAt: new Date(),
      } as any)
      .returning();
    return layout;
  }

  async updateLayout(id: number, data: Partial<InsertCompositeLayout>): Promise<SelectCompositeLayout | null> {
    const [layout] = await db
      .update(compositeLayouts)
      .set({
        ...data,
        updatedAt: new Date(),
      } as any)
      .where(eq(compositeLayouts.id, id))
      .returning();
    return layout || null;
  }

  async deleteLayout(id: number): Promise<boolean> {
    const result = await db
      .delete(compositeLayouts)
      .where(eq(compositeLayouts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Layout Zones
  async createZone(data: InsertLayoutZone): Promise<SelectLayoutZone> {
    const [zone] = await db
      .insert(layoutZones)
      .values(data as any)
      .returning();
    return zone;
  }

  async updateZone(id: number, data: Partial<InsertLayoutZone>): Promise<SelectLayoutZone | null> {
    const [zone] = await db
      .update(layoutZones)
      .set(data as any)
      .where(eq(layoutZones.id, id))
      .returning();
    return zone || null;
  }

  async deleteZone(id: number): Promise<boolean> {
    const result = await db
      .delete(layoutZones)
      .where(eq(layoutZones.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getZonesByLayout(layoutId: number): Promise<SelectLayoutZone[]> {
    return db
      .select()
      .from(layoutZones)
      .where(eq(layoutZones.layoutId, layoutId))
      .orderBy(layoutZones.order);
  }

  // Record Books
  async getRecordBooks(): Promise<SelectRecordBook[]> {
    return db.select().from(recordBooks);
  }

  async getRecordBook(id: number): Promise<SelectRecordBook | undefined> {
    const [book] = await db
      .select()
      .from(recordBooks)
      .where(eq(recordBooks.id, id));
    return book || undefined;
  }

  async createRecordBook(book: InsertRecordBook): Promise<SelectRecordBook> {
    const [newBook] = await db
      .insert(recordBooks)
      .values(book)
      .returning();
    return newBook;
  }

  async updateRecordBook(id: number, updates: Partial<InsertRecordBook>): Promise<SelectRecordBook | undefined> {
    const [book] = await db
      .update(recordBooks)
      .set(updates)
      .where(eq(recordBooks.id, id))
      .returning();
    return book || undefined;
  }

  async deleteRecordBook(id: number): Promise<void> {
    await db.delete(recordBooks).where(eq(recordBooks.id, id));
  }

  // Records
  async getRecords(bookId?: number, eventType?: string, gender?: string): Promise<SelectRecord[]> {
    let query = db.select().from(records);
    
    const conditions = [];
    if (bookId) {
      conditions.push(eq(records.recordBookId, bookId));
    }
    if (eventType) {
      conditions.push(eq(records.eventType, eventType));
    }
    if (gender) {
      conditions.push(eq(records.gender, gender));
    }

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    
    return query;
  }

  async getRecord(id: number): Promise<SelectRecord | undefined> {
    const [record] = await db
      .select()
      .from(records)
      .where(eq(records.id, id));
    return record || undefined;
  }

  async getRecordForEvent(bookId: number, eventType: string, gender: string): Promise<SelectRecord | undefined> {
    const [record] = await db
      .select()
      .from(records)
      .where(
        and(
          eq(records.recordBookId, bookId),
          eq(records.eventType, eventType),
          eq(records.gender, gender)
        )
      );
    return record || undefined;
  }

  async createRecord(record: InsertRecord): Promise<SelectRecord> {
    const [newRecord] = await db
      .insert(records)
      .values(record)
      .returning();
    return newRecord;
  }

  async updateRecord(id: number, updates: Partial<InsertRecord>): Promise<SelectRecord | undefined> {
    const [record] = await db
      .update(records)
      .set(updates)
      .where(eq(records.id, id))
      .returning();
    return record || undefined;
  }

  async deleteRecord(id: number): Promise<void> {
    await db.delete(records).where(eq(records.id, id));
  }

  // Record Checking
  async checkForRecords(eventType: string, gender: string, performance: string): Promise<RecordCheck[]> {
    const activeBooks = await db
      .select()
      .from(recordBooks)
      .where(eq(recordBooks.isActive, true));

    const results: RecordCheck[] = [];

    for (const book of activeBooks) {
      const existingRecord = await this.getRecordForEvent(book.id, eventType, gender);
      
      if (!existingRecord) {
        continue;
      }

      const comparison = this.comparePerformances(eventType, performance, existingRecord.performance);
      
      results.push({
        recordId: existingRecord.id,
        recordBookId: book.id,
        recordBookName: book.name,
        isRecord: comparison.isRecord,
        isTied: comparison.isTied,
        margin: comparison.margin,
        existingPerformance: existingRecord.performance,
        newPerformance: performance,
      });
    }

    return results;
  }

  private comparePerformances(eventType: string, newPerf: string, existingPerf: string): {
    isRecord: boolean;
    isTied: boolean;
    margin: string;
  } {
    const newValue = parsePerformanceToSeconds(newPerf);
    const existingValue = parsePerformanceToSeconds(existingPerf);

    if (newValue === null || existingValue === null) {
      return { isRecord: false, isTied: false, margin: 'Invalid performance' };
    }

    let isRecord: boolean;
    let isTied: boolean;
    let margin: string;

    const isTimeBasedEvent = isTimeEvent(eventType);

    if (isTimeBasedEvent) {
      isRecord = newValue < existingValue;
      isTied = Math.abs(newValue - existingValue) < 0.01;
      margin = isTied ? 'Tied' : `${Math.abs(newValue - existingValue).toFixed(2)}s ${isRecord ? 'faster' : 'slower'}`;
    } else {
      isRecord = newValue > existingValue;
      isTied = Math.abs(newValue - existingValue) < 0.01;
      margin = isTied ? 'Tied' : `${Math.abs(newValue - existingValue).toFixed(2)}m ${isRecord ? 'farther' : 'shorter'}`;
    }

    return { isRecord, isTied, margin };
  }

  // ===============================
  // TEAM SCORING METHODS
  // ===============================

  // Scoring Presets
  async getScoringPresets(): Promise<ScoringPreset[]> {
    return db.select().from(scoringPresets);
  }

  async getScoringPreset(id: number): Promise<ScoringPreset | undefined> {
    const [preset] = await db.select().from(scoringPresets).where(eq(scoringPresets.id, id));
    return preset || undefined;
  }

  async getPresetRules(presetId: number): Promise<PresetRule[]> {
    return db.select().from(presetRules).where(eq(presetRules.presetId, presetId));
  }

  async createScoringPreset(preset: InsertScoringPreset): Promise<ScoringPreset> {
    const [newPreset] = await db
      .insert(scoringPresets)
      .values(preset)
      .returning();
    return newPreset;
  }

  async createPresetRule(rule: InsertPresetRule): Promise<PresetRule> {
    const [newRule] = await db
      .insert(presetRules)
      .values(rule)
      .returning();
    return newRule;
  }

  async seedScoringPresets(): Promise<void> {
    // Check if already seeded
    const existing = await this.getScoringPresets();
    if (existing.length > 0) {
      return; // Already seeded
    }
    
    // Use transaction for atomic seeding
    await db.transaction(async (tx) => {
      // Dual Meet 5-3-1
      const [dualMeetPreset] = await tx.insert(scoringPresets).values({
        name: "Dual Meet 5-3-1",
        category: "dual_meet",
        description: "Standard dual meet scoring: 5 points for 1st, 3 for 2nd, 1 for 3rd",
        defaultRelayMultiplier: 1.0,
        allowRelayScoring: true
      }).returning();
      
      await tx.insert(presetRules).values([
        { presetId: dualMeetPreset.id, place: 1, points: 5, isRelayOverride: false },
        { presetId: dualMeetPreset.id, place: 2, points: 3, isRelayOverride: false },
        { presetId: dualMeetPreset.id, place: 3, points: 1, isRelayOverride: false }
      ]);
      
      // Invitational 10-8-6-5-4-3-2-1
      const [invitePreset] = await tx.insert(scoringPresets).values({
        name: "Invitational 10-8-6-5-4-3-2-1",
        category: "invitational",
        description: "Standard invitational scoring for top 8 places",
        defaultRelayMultiplier: 1.0,
        allowRelayScoring: true
      }).returning();
      
      const invitePoints = [10, 8, 6, 5, 4, 3, 2, 1];
      await tx.insert(presetRules).values(
        invitePoints.map((points, i) => ({
          presetId: invitePreset.id,
          place: i + 1,
          points,
          isRelayOverride: false
        }))
      );
      
      // Championship
      const [champPreset] = await tx.insert(scoringPresets).values({
        name: "Championship",
        category: "championship",
        description: "Championship meet scoring for top 8 places",
        defaultRelayMultiplier: 2.0,
        allowRelayScoring: true
      }).returning();
      
      await tx.insert(presetRules).values(
        invitePoints.map((points, i) => ({
          presetId: champPreset.id,
          place: i + 1,
          points,
          isRelayOverride: false
        }))
      );
    });
  }

  // Meet Scoring Profile
  async getMeetScoringProfile(meetId: string): Promise<MeetScoringProfile | undefined> {
    const [profile] = await db
      .select()
      .from(meetScoringProfiles)
      .where(eq(meetScoringProfiles.meetId, meetId));
    return profile || undefined;
  }

  async upsertMeetScoringProfile(profile: InsertMeetScoringProfile): Promise<MeetScoringProfile> {
    // Check if profile exists for this meet
    const existing = await this.getMeetScoringProfile(profile.meetId);

    if (existing) {
      // Update existing profile
      const [updated] = await db
        .update(meetScoringProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(meetScoringProfiles.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new profile
      const [newProfile] = await db
        .insert(meetScoringProfiles)
        .values(profile)
        .returning();
      return newProfile;
    }
  }

  async getMeetScoringOverrides(profileId: string): Promise<MeetScoringOverride[]> {
    return db
      .select()
      .from(meetScoringOverrides)
      .where(eq(meetScoringOverrides.profileId, profileId));
  }

  async upsertScoringOverride(override: InsertMeetScoringOverride): Promise<MeetScoringOverride> {
    // Check if override exists for this profile + event
    const [existing] = await db
      .select()
      .from(meetScoringOverrides)
      .where(
        and(
          eq(meetScoringOverrides.profileId, override.profileId),
          eq(meetScoringOverrides.eventId, override.eventId)
        )
      );

    if (existing) {
      // Update existing override
      const [updated] = await db
        .update(meetScoringOverrides)
        .set(override)
        .where(eq(meetScoringOverrides.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new override
      const [newOverride] = await db
        .insert(meetScoringOverrides)
        .values(override)
        .returning();
      return newOverride;
    }
  }

  async deleteScoringOverrides(profileId: string): Promise<void> {
    await db.delete(meetScoringOverrides)
      .where(eq(meetScoringOverrides.profileId, profileId));
  }

  // Scoring State
  async getMeetScoringState(profileId: string): Promise<MeetScoringState | undefined> {
    const [state] = await db
      .select()
      .from(meetScoringState)
      .where(eq(meetScoringState.profileId, profileId));
    return state || undefined;
  }

  async updateMeetScoringState(profileId: string, updates: Partial<InsertMeetScoringState>): Promise<void> {
    const existing = await this.getMeetScoringState(profileId);

    if (existing) {
      await db
        .update(meetScoringState)
        .set(updates)
        .where(eq(meetScoringState.profileId, profileId));
    } else {
      await db
        .insert(meetScoringState)
        .values({ profileId, ...updates });
    }
  }

  async clearTeamScoringResults(profileId: string): Promise<void> {
    await db
      .delete(teamScoringResults)
      .where(eq(teamScoringResults.profileId, profileId));
  }

  async createTeamScoringResult(result: InsertTeamScoringResult): Promise<TeamScoringResult> {
    const [newResult] = await db
      .insert(teamScoringResults)
      .values(result)
      .returning();
    return newResult;
  }

  // Team Standings Query
  async getTeamStandings(
    meetId: string,
    scope?: { gender?: string; division?: string }
  ): Promise<TeamStandingsEntry[]> {
    const profile = await this.getMeetScoringProfile(meetId);
    if (!profile) {
      return [];
    }

    // Build WHERE conditions based on scope
    const conditions = [eq(teamScoringResults.profileId, profile.id)];
    
    if (scope?.gender) {
      conditions.push(eq(teamScoringResults.gender, scope.gender));
    }
    
    if (scope?.division) {
      conditions.push(eq(teamScoringResults.division, scope.division));
    }

    // Query with proper SQL aggregation
    const results = await db
      .select({
        teamId: teamScoringResults.teamId,
        teamName: teams.name,
        totalPoints: sql<number>`COALESCE(SUM(${teamScoringResults.pointsAwarded}), 0)`,
        eventCount: sql<number>`COUNT(DISTINCT ${teamScoringResults.eventId})`,
      })
      .from(teamScoringResults)
      .innerJoin(teams, eq(teamScoringResults.teamId, teams.id))
      .where(and(...conditions))
      .groupBy(teamScoringResults.teamId, teams.name)
      .orderBy(sql`COALESCE(SUM(${teamScoringResults.pointsAwarded}), 0) DESC`);

    // Get event breakdown for each team separately (can't aggregate in GROUP BY)
    const standingsWithBreakdown = await Promise.all(
      results.map(async (result, index) => {
        const breakdownConditions = [
          eq(teamScoringResults.profileId, profile.id),
          eq(teamScoringResults.teamId, result.teamId)
        ];
        
        if (scope?.gender) {
          breakdownConditions.push(eq(teamScoringResults.gender, scope.gender));
        }
        
        if (scope?.division) {
          breakdownConditions.push(eq(teamScoringResults.division, scope.division));
        }

        const breakdownRows = await db
          .select({ eventBreakdown: teamScoringResults.eventBreakdown })
          .from(teamScoringResults)
          .where(and(...breakdownConditions));

        const allBreakdowns: any[] = [];
        for (const row of breakdownRows) {
          if (row.eventBreakdown) {
            const breakdown = typeof row.eventBreakdown === 'string' 
              ? JSON.parse(row.eventBreakdown) 
              : row.eventBreakdown;
            allBreakdowns.push(...(breakdown as any[]));
          }
        }

        return {
          rank: index + 1,
          teamId: result.teamId,
          teamName: result.teamName,
          totalPoints: result.totalPoints,
          eventCount: result.eventCount,
          eventBreakdown: allBreakdowns,
        };
      })
    );

    return standingsWithBreakdown;
  }

  // Recalculate Team Scoring
  async recalculateTeamScoring(meetId: string): Promise<void> {
    const { ScoringCalculator } = await import('./scoring-calculator');
    const calculator = new ScoringCalculator();
    await calculator.calculateMeetScoring(meetId, this);
  }

  // Get Event Points Breakdown
  async getEventPoints(eventId: string): Promise<EventPointsBreakdown> {
    const event = await this.getEvent(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    const eventEntries = await this.getEntriesWithDetails(eventId);

    // Filter to entries with places and teams
    const scoredEntries = eventEntries.filter(
      e => e.finalPlace !== null && e.finalPlace !== undefined && !e.isDisqualified && !e.isScratched
    );

    // Sort by place
    scoredEntries.sort((a, b) => (a.finalPlace || 0) - (b.finalPlace || 0));

    const breakdown: EventPointsBreakdown = {
      eventId: event.id,
      eventName: event.name,
      entries: scoredEntries.map(entry => ({
        place: entry.finalPlace!,
        athleteId: entry.athleteId,
        athleteName: `${entry.athlete.firstName} ${entry.athlete.lastName}`,
        teamId: entry.teamId,
        teamName: entry.team?.name || null,
        points: entry.scoredPoints || 0,
      })),
    };

    return breakdown;
  }
  
  // Check-in operations
  async markCheckedIn(entryId: string, operator: string, method: string): Promise<EntryWithDetails> {
    await db.update(entries)
      .set({ 
        checkInStatus: "checked_in",
        checkInTime: new Date(),
        checkInOperator: operator,
        checkInMethod: method
      })
      .where(eq(entries.id, entryId));
    
    // Return full entry with athlete and event data
    const fullEntry = await this.getEntry(entryId);
    if (!fullEntry) {
      throw new Error(`Entry ${entryId} not found after check-in`);
    }
    return fullEntry;
  }

  async bulkCheckIn(entryIds: string[], operator: string, method: string): Promise<EntryWithDetails[]> {
    await db.update(entries)
      .set({
        checkInStatus: "checked_in",
        checkInTime: new Date(),
        checkInOperator: operator,
        checkInMethod: method
      })
      .where(inArray(entries.id, entryIds));
    
    // Return full entries with athlete and event data
    const fullEntries = await Promise.all(
      entryIds.map(id => this.getEntry(id))
    );
    
    return fullEntries.filter((e): e is EntryWithDetails => e !== null);
  }

  async getCheckInStats(eventId: string): Promise<{ total: number; checkedIn: number; pending: number; noShow: number }> {
    const result = await db.select({
      total: count(),
      checkedIn: count(sql`CASE WHEN ${entries.checkInStatus} = 'checked_in' THEN 1 END`),
      pending: count(sql`CASE WHEN ${entries.checkInStatus} = 'pending' THEN 1 END`),
      noShow: count(sql`CASE WHEN ${entries.checkInStatus} = 'no_show' THEN 1 END`)
    })
    .from(entries)
    .where(eq(entries.eventId, eventId));
    
    return result[0] || { total: 0, checkedIn: 0, pending: 0, noShow: 0 };
  }

  // Split times implementation
  async seedSplitDefaults(): Promise<void> {
    const defaults: InsertEventSplitConfig[] = [
      { eventType: "800m", meetId: null, splitOrder: 1, distanceMeters: 400, label: "400m", isDefault: true },
      
      { eventType: "1500m", meetId: null, splitOrder: 1, distanceMeters: 400, label: "400m", isDefault: true },
      { eventType: "1500m", meetId: null, splitOrder: 2, distanceMeters: 800, label: "800m", isDefault: true },
      { eventType: "1500m", meetId: null, splitOrder: 3, distanceMeters: 1200, label: "1200m", isDefault: true },
      
      { eventType: "3000m", meetId: null, splitOrder: 1, distanceMeters: 1000, label: "1000m", isDefault: true },
      { eventType: "3000m", meetId: null, splitOrder: 2, distanceMeters: 2000, label: "2000m", isDefault: true },
      
      { eventType: "5000m", meetId: null, splitOrder: 1, distanceMeters: 1000, label: "1000m", isDefault: true },
      { eventType: "5000m", meetId: null, splitOrder: 2, distanceMeters: 2000, label: "2000m", isDefault: true },
      { eventType: "5000m", meetId: null, splitOrder: 3, distanceMeters: 3000, label: "3000m", isDefault: true },
      { eventType: "5000m", meetId: null, splitOrder: 4, distanceMeters: 4000, label: "4000m", isDefault: true },
      
      { eventType: "10000m", meetId: null, splitOrder: 1, distanceMeters: 2000, label: "2000m", isDefault: true },
      { eventType: "10000m", meetId: null, splitOrder: 2, distanceMeters: 4000, label: "4000m", isDefault: true },
      { eventType: "10000m", meetId: null, splitOrder: 3, distanceMeters: 6000, label: "6000m", isDefault: true },
      { eventType: "10000m", meetId: null, splitOrder: 4, distanceMeters: 8000, label: "8000m", isDefault: true },
    ];
    
    const existing = await db.select().from(eventSplitConfigs).where(eq(eventSplitConfigs.isDefault, true));
    if (existing.length === 0) {
      await db.insert(eventSplitConfigs).values(defaults);
      console.log("✅ Split defaults seeded");
    }
  }

  async getSplitConfigs(eventId: string): Promise<EventSplitConfig[]> {
    const event = await this.getEvent(eventId);
    if (!event) return [];
    
    const meetSpecific = await db.select()
      .from(eventSplitConfigs)
      .where(and(
        eq(eventSplitConfigs.eventType, event.type),
        eq(eventSplitConfigs.meetId, event.meetId)
      ))
      .orderBy(eventSplitConfigs.splitOrder);
    
    if (meetSpecific.length > 0) return meetSpecific;
    
    return db.select()
      .from(eventSplitConfigs)
      .where(and(
        eq(eventSplitConfigs.eventType, event.type),
        isNull(eventSplitConfigs.meetId)
      ))
      .orderBy(eventSplitConfigs.splitOrder);
  }

  async createSplitConfig(config: InsertEventSplitConfig): Promise<EventSplitConfig> {
    const [created] = await db.insert(eventSplitConfigs).values(config).returning();
    return created;
  }

  async updateSplitConfigs(eventType: string, meetId: string | null, configs: InsertEventSplitConfig[]): Promise<EventSplitConfig[]> {
    await db.delete(eventSplitConfigs)
      .where(and(
        eq(eventSplitConfigs.eventType, eventType),
        meetId ? eq(eventSplitConfigs.meetId, meetId) : isNull(eventSplitConfigs.meetId)
      ));
    
    const created = await db.insert(eventSplitConfigs).values(configs).returning();
    return created;
  }

  async getEntrySplits(eventId: string): Promise<Map<string, EntrySplit[]>> {
    const eventEntries = await db.select()
      .from(entries)
      .where(eq(entries.eventId, eventId));
    
    const entryIds = eventEntries.map(e => e.id);
    if (entryIds.length === 0) return new Map();
    
    const splits = await db.select()
      .from(entrySplits)
      .where(inArray(entrySplits.entryId, entryIds))
      .orderBy(entrySplits.splitIndex);
    
    const map = new Map<string, EntrySplit[]>();
    for (const split of splits) {
      const existing = map.get(split.entryId) || [];
      existing.push(split);
      map.set(split.entryId, existing);
    }
    
    return map;
  }

  async createEntrySplit(split: InsertEntrySplit): Promise<EntrySplit> {
    const [created] = await db.insert(entrySplits).values(split).returning();
    return created;
  }

  async createEntrySplitsBatch(splits: InsertEntrySplit[]): Promise<EntrySplit[]> {
    const created = await db.insert(entrySplits).values(splits).returning();
    return created;
  }

  async deleteEntrySplit(entryId: string, splitIndex: number): Promise<void> {
    await db.delete(entrySplits)
      .where(and(
        eq(entrySplits.entryId, entryId),
        eq(entrySplits.splitIndex, splitIndex)
      ));
  }

  // Wind readings
  async createWindReading(reading: InsertWindReading): Promise<WindReading> {
    const isLegal = reading.windSpeed <= 2.0;
    const [created] = await db.insert(windReadings).values({
      ...reading,
      isLegal
    }).returning();
    return created;
  }

  async getWindReadings(eventId: string): Promise<WindReading[]> {
    return db.select()
      .from(windReadings)
      .where(eq(windReadings.eventId, eventId))
      .orderBy(desc(windReadings.recordedAt));
  }

  async updateWindReading(id: string, windSpeed: number): Promise<WindReading> {
    const isLegal = windSpeed <= 2.0;
    const [updated] = await db.update(windReadings)
      .set({ windSpeed, isLegal })
      .where(eq(windReadings.id, id))
      .returning();
    return updated;
  }

  async deleteWindReading(id: string): Promise<void> {
    await db.delete(windReadings).where(eq(windReadings.id, id));
  }

  // Field attempts
  async createFieldAttempt(attempt: InsertFieldAttempt): Promise<FieldAttempt> {
    const [created] = await db.insert(fieldAttempts).values(attempt).returning();
    return created;
  }

  async getFieldAttempts(entryId: string): Promise<FieldAttempt[]> {
    return db.select()
      .from(fieldAttempts)
      .where(eq(fieldAttempts.entryId, entryId))
      .orderBy(fieldAttempts.attemptIndex);
  }

  async getEventFieldAttempts(eventId: string): Promise<Map<string, FieldAttempt[]>> {
    const eventEntries = await db.select().from(entries).where(eq(entries.eventId, eventId));
    const entryIds = eventEntries.map(e => e.id);
    
    if (entryIds.length === 0) return new Map();
    
    const attempts = await db.select()
      .from(fieldAttempts)
      .where(inArray(fieldAttempts.entryId, entryIds))
      .orderBy(fieldAttempts.attemptIndex);
    
    const map = new Map<string, FieldAttempt[]>();
    for (const attempt of attempts) {
      const existing = map.get(attempt.entryId) || [];
      existing.push(attempt);
      map.set(attempt.entryId, existing);
    }
    return map;
  }

  async updateFieldAttempt(id: string, data: Partial<InsertFieldAttempt>): Promise<FieldAttempt> {
    const [updated] = await db.update(fieldAttempts)
      .set(data)
      .where(eq(fieldAttempts.id, id))
      .returning();
    return updated;
  }

  async deleteFieldAttempt(id: string): Promise<void> {
    await db.delete(fieldAttempts).where(eq(fieldAttempts.id, id));
  }

  // Judge tokens
  async createJudgeToken(token: InsertJudgeToken): Promise<JudgeToken> {
    const [created] = await db.insert(judgeTokens).values(token).returning();
    return created;
  }

  async getJudgeToken(code: string): Promise<JudgeToken | null> {
    const [token] = await db.select()
      .from(judgeTokens)
      .where(and(
        eq(judgeTokens.code, code),
        eq(judgeTokens.isActive, true)
      ));
    return token || null;
  }

  async getJudgeTokens(meetId: string): Promise<JudgeToken[]> {
    return db.select()
      .from(judgeTokens)
      .where(eq(judgeTokens.meetId, meetId))
      .orderBy(desc(judgeTokens.createdAt));
  }

  async deactivateJudgeToken(id: string): Promise<void> {
    await db.update(judgeTokens)
      .set({ isActive: false })
      .where(eq(judgeTokens.id, id));
  }
}

export const storage = new DatabaseStorage();
