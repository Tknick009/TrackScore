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
  weatherStationConfigs,
  weatherReadings,
  displayDevices,
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
  meetScoringRules,
  windReadings,
  fieldAttempts,
  judgeTokens,
  sponsors,
  sponsorAssignments,
  sponsorRotationProfiles,
  medalAwards,
  combinedEvents,
  combinedEventComponents,
  combinedEventTotals,
  lynxConfigs,
  liveEventData,
  isTimeEvent,
  isDistanceEvent,
  isHeightEvent,
  parsePerformanceToSeconds,
  athleteBests,
  type AthleteBest,
  type InsertAthleteBest,
  layoutScenes,
  layoutObjects,
  type InsertLayoutScene,
  type InsertLayoutObject,
  type SelectLayoutScene,
  type SelectLayoutObject,
  type LayoutSceneWithObjects,
  meetIngestionSettings,
  processedIngestionFiles,
  type MeetIngestionSettings,
  type InsertMeetIngestionSettings,
  type ProcessedFile,
  type InsertProcessedFile,
  sceneTemplateMappings,
  type SelectSceneTemplateMapping,
  type InsertSceneTemplateMapping,
  fieldEventSessions,
  fieldHeights,
  fieldEventFlights,
  fieldEventAthletes,
  fieldEventMarks,
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
  type ExternalScoreboard,
  type InsertExternalScoreboard,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, or, not, inArray, count, isNull, isNotNull, desc, gt } from "drizzle-orm";

// Helper type for record books with records
export type RecordBookWithRecords = SelectRecordBook & { records: SelectRecord[] };

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventsByMeetId(meetId: string): Promise<Event[]>;
  getEventsByLynxEventNumber(lynxEventNumber: number): Promise<Event[]>;
  getCurrentEvent(meetId?: string): Promise<EventWithEntries | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEventStatus(id: string, status: string): Promise<Event | undefined>;
  updateEvent(id: string, updates: Record<string, any>): Promise<Event | undefined>;
  getTotalHeatsForEvent(eventId: string, round?: string): Promise<number>;

  // Athletes
  getAthletes(): Promise<Athlete[]>;
  getAthlete(id: string): Promise<Athlete | undefined>;
  getAthletesByMeetId(meetId: string): Promise<Athlete[]>;
  createAthlete(athlete: InsertAthlete): Promise<Athlete>;

  // Entries (unified results for track and field)
  getEntries(): Promise<Entry[]>;
  getEntry(id: string): Promise<EntryWithDetails | null>;
  getEntriesByEvent(eventId: string): Promise<Entry[]>;
  getEntriesByAthlete(athleteId: string): Promise<EntryWithDetails[]>;
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
  getMeetByCode(meetCode: string): Promise<Meet | undefined>;
  getMeetsBySeason(seasonId: number): Promise<Meet[]>;
  createMeet(meet: InsertMeet): Promise<Meet>;
  updateMeet(id: string, data: Partial<InsertMeet>): Promise<Meet | null>;
  updateMeetStatus(meetId: string, status: string): Promise<Meet | undefined>;
  deleteMeet(id: string): Promise<boolean>;
  resetMeet(id: string): Promise<{ teamsDeleted: number; athletesDeleted: number; eventsDeleted: number; divisionsDeleted: number }>;
  clearMeetImportData(meetId: string): Promise<{ teamsDeleted: number; athletesDeleted: number; eventsDeleted: number; divisionsDeleted: number; entriesDeleted: number }>;

  // Teams
  getTeams(): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  getTeamsByMeetId(meetId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, data: Partial<Team>): Promise<Team>;

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

  // Display Devices (Remote Display Control)
  getDisplayDevices(meetId: string): Promise<DisplayDeviceWithEvent[]>;
  getDisplayDevice(id: string): Promise<DisplayDevice | undefined>;
  getDisplayDeviceByName(meetId: string, deviceName: string): Promise<DisplayDevice | undefined>;
  createOrUpdateDisplayDevice(device: InsertDisplayDevice & { lastIp?: string }): Promise<DisplayDevice>;
  updateDisplayDeviceStatus(id: string, status: string, lastIp?: string): Promise<DisplayDevice | undefined>;
  updateDisplayDeviceMode(id: string, displayMode: 'track' | 'field'): Promise<DisplayDevice | undefined>;
  updateDisplayDeviceType(id: string, displayType: string, deviceName?: string, displayWidth?: number, displayHeight?: number): Promise<DisplayDevice | undefined>;
  updateDisplayAutoMode(id: string, autoMode: boolean): Promise<DisplayDevice | undefined>;
  updateDisplayDevice(id: string, updates: Partial<{ pagingSize: number; pagingInterval: number; fieldPort: number | null; isBigBoard: boolean; displayScale: number }>): Promise<DisplayDevice | undefined>;
  assignEventToDisplay(displayId: string, eventId: string | null): Promise<DisplayDevice | undefined>;
  updateDisplayTemplate(displayId: string, template: string | null): Promise<DisplayDevice | undefined>;
  deleteDisplayDevice(id: string): Promise<boolean>;

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
  getRecordBook(id: number): Promise<RecordBookWithRecords | null>;
  createRecordBook(book: InsertRecordBook): Promise<SelectRecordBook>;
  updateRecordBook(id: number, updates: Partial<InsertRecordBook>): Promise<SelectRecordBook | undefined>;
  deleteRecordBook(id: number): Promise<void>;

  // Records
  getRecords(recordBookId: number): Promise<SelectRecord[]>;
  getRecordsByEvent(eventType: string, gender: string): Promise<SelectRecord[]>;
  getRecord(id: number): Promise<SelectRecord | undefined>;
  getRecordForEvent(bookId: number, eventType: string, gender: string): Promise<SelectRecord | undefined>;
  createRecord(record: InsertRecord): Promise<SelectRecord>;
  updateRecord(id: number, updates: Partial<InsertRecord>): Promise<SelectRecord>;
  deleteRecord(id: number): Promise<void>;

  // Record Checking
  checkForRecords(eventType: string, gender: string, performance: string, windSpeed?: number): Promise<RecordCheck[]>;

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

  // Sponsors
  getSponsors(): Promise<SelectSponsor[]>;
  getSponsor(id: number): Promise<SelectSponsor | null>;
  createSponsor(sponsor: InsertSponsor): Promise<SelectSponsor>;
  updateSponsor(id: number, sponsor: Partial<InsertSponsor>): Promise<SelectSponsor>;
  deleteSponsor(id: number): Promise<void>;

  // Sponsor assignments
  getSponsorAssignments(meetId: string): Promise<SelectSponsorAssignment[]>;
  createSponsorAssignment(assignment: InsertSponsorAssignment): Promise<SelectSponsorAssignment>;
  deleteSponsorAssignment(id: number): Promise<void>;

  // Rotation profiles
  getRotationProfile(meetId: string, zoneName: string): Promise<SelectSponsorRotationProfile | null>;
  createRotationProfile(profile: InsertSponsorRotationProfile): Promise<SelectSponsorRotationProfile>;
  updateRotationProfile(id: number, profile: Partial<InsertSponsorRotationProfile>): Promise<SelectSponsorRotationProfile>;

  // Get active sponsors for rotation
  getActiveSponsorsForRotation(meetId: string, eventType?: string): Promise<SelectSponsor[]>;

  // Medal awards
  getMedalAwards(meetId: string): Promise<SelectMedalAward[]>;
  getEventMedalAwards(eventId: string): Promise<SelectMedalAward[]>;
  createMedalAward(award: InsertMedalAward): Promise<SelectMedalAward>;
  deleteMedalAwards(eventId: string): Promise<void>;

  // Medal standings (aggregated)
  getMedalStandings(meetId: string): Promise<MedalStanding[]>;
  recomputeMedalsForEvent(eventId: string): Promise<void>;

  // Combined events
  getCombinedEvents(meetId: string): Promise<SelectCombinedEvent[]>;
  getCombinedEvent(id: number): Promise<SelectCombinedEvent | null>;
  createCombinedEvent(event: InsertCombinedEvent): Promise<SelectCombinedEvent>;

  // Combined event components
  getCombinedEventComponents(combinedEventId: number): Promise<SelectCombinedEventComponent[]>;
  createCombinedEventComponent(component: InsertCombinedEventComponent): Promise<SelectCombinedEventComponent>;

  // Combined event standings
  getCombinedEventStandings(combinedEventId: number): Promise<CombinedEventStanding[]>;
  updateCombinedEventTotals(combinedEventId: number): Promise<void>;
  addAthleteToCombinedEvent(combinedEventId: number, athleteId: string): Promise<void>;
  removeAthleteFromCombinedEvent(combinedEventId: number, athleteId: string): Promise<void>;
  deleteCombinedEvent(id: number): Promise<void>;
  updateCombinedEventStatus(id: number, status: string): Promise<SelectCombinedEvent | null>;
  getCombinedEventsByComponentEvent(eventId: string): Promise<SelectCombinedEvent[]>;
  getCombinedEventsByLynxEventNumber(lynxEventNumber: number): Promise<SelectCombinedEvent[]>;

  // QR code short links (in-memory)
  getQRCode(slug: string): Promise<QRCodeMeta | null>;
  createQRCode(meta: Omit<QRCodeMeta, 'slug' | 'createdAt'>): Promise<QRCodeMeta>;
  getAllQRCodes(): Promise<QRCodeMeta[]>;

  // Social media posts (in-memory queue)
  getSocialMediaPosts(): Promise<SocialMediaPost[]>;
  createSocialMediaPost(post: Omit<SocialMediaPost, 'id' | 'createdAt'>): Promise<SocialMediaPost>;
  deleteSocialMediaPost(id: string): Promise<void>;

  // FinishLynx result signatures (for deduplication)
  hasResultSignature(signature: string): Promise<boolean>;
  addResultSignature(signature: string): Promise<void>;
  clearOldSignatures(olderThan: Date): Promise<void>;

  // Weather station configuration
  getWeatherConfig(meetId: string): Promise<WeatherStationConfig | null>;
  setWeatherConfig(config: InsertWeatherConfig): Promise<WeatherStationConfig>;
  deleteWeatherConfig(meetId: string): Promise<void>;

  // Weather readings
  addWeatherReading(reading: InsertWeatherReading): Promise<WeatherReading>;
  getLatestWeatherReading(meetId: string): Promise<WeatherReading | null>;
  getWeatherHistory(meetId: string, hoursBack: number): Promise<WeatherReading[]>;

  // Lynx Configuration
  getLynxConfigs(meetId?: string): Promise<LynxConfig[]>;
  saveLynxConfig(config: InsertLynxConfig): Promise<LynxConfig>;
  deleteLynxConfigs(meetId?: string): Promise<void>;

  // Live Event Data (from Lynx)
  getLiveEventData(eventNumber: number, meetId?: string): Promise<LiveEventData | null>;
  getLiveEventsByMeet(meetId?: string): Promise<LiveEventData[]>;
  upsertLiveEventData(data: InsertLiveEventData): Promise<LiveEventData>;
  updateLiveEventEntries(eventNumber: number, entries: any[], meetId?: string): Promise<LiveEventData | null>;
  clearLiveEventData(meetId?: string): Promise<void>;

  // Athlete Bests (College and Season PRs)
  getAthleteBests(athleteId: string): Promise<AthleteBest[]>;
  getAthleteBest(athleteId: string, eventType: string, bestType: 'college' | 'season', seasonId?: number | null): Promise<AthleteBest | null>;
  getAthleteBestsByMeet(meetId: string): Promise<AthleteBest[]>;
  createAthleteBest(best: InsertAthleteBest): Promise<AthleteBest>;
  updateAthleteBest(id: string, updates: Partial<InsertAthleteBest>): Promise<AthleteBest | null>;
  upsertAthleteBest(best: InsertAthleteBest): Promise<AthleteBest>;
  deleteAthleteBest(id: string): Promise<void>;
  bulkImportAthleteBests(bests: InsertAthleteBest[]): Promise<AthleteBest[]>;

  // Field Event Sessions
  getAllFieldEventSessions(): Promise<FieldEventSession[]>;
  getFieldEventSessionsByMeetId(meetId: string): Promise<FieldEventSession[]>;
  getFieldEventSession(id: number): Promise<FieldEventSession | null>;
  getFieldEventSessionByEvent(eventId: string): Promise<FieldEventSession | null>;
  getFieldEventSessionByAccessCode(code: string): Promise<FieldEventSession | null>;
  createFieldEventSession(session: InsertFieldEventSession): Promise<FieldEventSession>;
  updateFieldEventSession(id: number, updates: Partial<InsertFieldEventSession>): Promise<FieldEventSession | null>;
  deleteFieldEventSession(id: number): Promise<void>;
  getFieldEventSessionWithDetails(id: number): Promise<FieldEventSessionWithDetails | null>;

  // Field Heights (for vertical events)
  getFieldHeights(sessionId: number): Promise<FieldHeight[]>;
  createFieldHeight(height: InsertFieldHeight): Promise<FieldHeight>;
  updateFieldHeight(id: number, updates: Partial<InsertFieldHeight>): Promise<FieldHeight | null>;
  deleteFieldHeight(id: number): Promise<void>;
  setFieldHeights(sessionId: number, heights: InsertFieldHeight[]): Promise<FieldHeight[]>;

  // Field Event Flights
  getFieldEventFlights(sessionId: number): Promise<FieldEventFlight[]>;
  createFieldEventFlight(flight: InsertFieldEventFlight): Promise<FieldEventFlight>;
  updateFieldEventFlight(id: number, updates: Partial<InsertFieldEventFlight>): Promise<FieldEventFlight | null>;

  // Field Event Athletes
  getFieldEventAthletes(sessionId: number): Promise<FieldEventAthlete[]>;
  getFieldEventAthlete(id: number): Promise<FieldEventAthlete | null>;
  createFieldEventAthlete(athlete: InsertFieldEventAthlete): Promise<FieldEventAthlete>;
  updateFieldEventAthlete(id: number, updates: Partial<InsertFieldEventAthlete>): Promise<FieldEventAthlete | null>;
  deleteFieldEventAthlete(id: number): Promise<void>;
  checkInFieldAthlete(id: number): Promise<FieldEventAthlete | null>;
  scratchFieldAthlete(id: number): Promise<FieldEventAthlete | null>;

  // Field Event Marks
  getFieldEventMark(id: number): Promise<FieldEventMark | null>;
  getFieldEventMarks(sessionId: number): Promise<FieldEventMark[]>;
  getFieldEventMarksByAthlete(athleteId: number): Promise<FieldEventMark[]>;
  createFieldEventMark(mark: InsertFieldEventMark): Promise<FieldEventMark>;
  updateFieldEventMark(id: number, updates: Partial<InsertFieldEventMark>): Promise<FieldEventMark | null>;
  deleteFieldEventMark(id: number): Promise<void>;

  // Layout Scenes (Scene-based layout system)
  getLayoutScenes(meetId?: string): Promise<LayoutSceneWithObjects[]>;
  getLayoutScene(id: number): Promise<LayoutSceneWithObjects | null>;
  createLayoutScene(scene: InsertLayoutScene): Promise<SelectLayoutScene>;
  updateLayoutScene(id: number, scene: Partial<InsertLayoutScene>): Promise<SelectLayoutScene | null>;
  deleteLayoutScene(id: number): Promise<boolean>;

  // Layout Objects (Objects within scenes)
  getLayoutObjects(sceneId: number): Promise<SelectLayoutObject[]>;
  getLayoutObject(id: number): Promise<SelectLayoutObject | null>;
  createLayoutObject(object: InsertLayoutObject): Promise<SelectLayoutObject>;
  updateLayoutObject(id: number, object: Partial<InsertLayoutObject>): Promise<SelectLayoutObject | null>;
  deleteLayoutObject(id: number): Promise<boolean>;
  reorderObjects(sceneId: number, objectIds: number[]): Promise<SelectLayoutObject[]>;

  // Scene Template Mappings
  getSceneTemplateMappings(meetId: string): Promise<SelectSceneTemplateMapping[]>;
  getSceneTemplateMappingByTypeAndMode(meetId: string, displayType: string, displayMode: string): Promise<SelectSceneTemplateMapping | undefined>;
  setSceneTemplateMapping(mapping: InsertSceneTemplateMapping): Promise<SelectSceneTemplateMapping>;
  deleteSceneTemplateMapping(id: number): Promise<boolean>;

  // Meet Ingestion Settings
  getIngestionSettings(meetId: string): Promise<MeetIngestionSettings | null>;
  upsertIngestionSettings(settings: InsertMeetIngestionSettings): Promise<MeetIngestionSettings>;
  updateIngestionSettings(meetId: string, updates: Partial<InsertMeetIngestionSettings>): Promise<MeetIngestionSettings | null>;
  deleteIngestionSettings(meetId: string): Promise<void>;

  // Processed Ingestion Files
  getProcessedFiles(meetId: string): Promise<ProcessedFile[]>;
  hasProcessedFile(meetId: string, filePath: string): Promise<boolean>;
  isFileHashProcessed(meetId: string, filePath: string, fileHash: string): Promise<boolean>;
  addProcessedFile(file: InsertProcessedFile): Promise<ProcessedFile>;
  clearProcessedFiles(meetId: string): Promise<void>;

  // External Scoreboards
  getExternalScoreboards(): Promise<ExternalScoreboard[]>;
  getExternalScoreboard(id: number): Promise<ExternalScoreboard | undefined>;
  createExternalScoreboard(data: InsertExternalScoreboard): Promise<ExternalScoreboard>;
  updateExternalScoreboard(id: number, data: Partial<ExternalScoreboard>): Promise<ExternalScoreboard | undefined>;
  deleteExternalScoreboard(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private qrCodes: Map<string, QRCodeMeta> = new Map();
  private socialMediaPosts: Map<string, SocialMediaPost> = new Map();
  private resultSignatures: Map<string, Date> = new Map();
  private externalScoreboards: Map<number, ExternalScoreboard> = new Map();
  private externalScoreboardIdCounter: number = 1;

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

  async getEventsByLynxEventNumber(lynxEventNumber: number): Promise<Event[]> {
    // Match Lynx event number to database events using the eventNumber column
    return db.select().from(events).where(eq(events.eventNumber, lynxEventNumber));
  }

  async getCurrentEvent(meetId?: string): Promise<EventWithEntries | undefined> {
    // If a meetId is provided, scope to that meet's events only
    // This prevents pulling events from other meets
    let allEvents: Event[];
    if (meetId) {
      allEvents = await db.select().from(events).where(eq(events.meetId, meetId));
    } else {
      // Fallback: try to find the active meet first, then scope to it
      const allMeets = await db.select().from(meets);
      const activeMeet = allMeets.find(m => m.status === 'in_progress')
        || allMeets.find(m => m.status === 'upcoming');
      if (activeMeet) {
        allEvents = await db.select().from(events).where(eq(events.meetId, activeMeet.id));
      } else {
        allEvents = await db.select().from(events);
      }
    }
    
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

  async updateEvent(id: string, updates: Record<string, any>): Promise<Event | undefined> {
    const fieldMap: Record<string, any> = {};
    if (updates.advanceByPlace !== undefined) fieldMap.advanceByPlace = updates.advanceByPlace;
    if (updates.advanceByTime !== undefined) fieldMap.advanceByTime = updates.advanceByTime;
    if (updates.hytekStatus !== undefined) fieldMap.hytekStatus = updates.hytekStatus;
    if (updates.isScored !== undefined) fieldMap.isScored = updates.isScored;
    if (updates.status !== undefined) fieldMap.status = updates.status;
    if (updates.numRounds !== undefined) fieldMap.numRounds = updates.numRounds;
    if (updates.numLanes !== undefined) fieldMap.numLanes = updates.numLanes;
    if (Object.keys(fieldMap).length === 0) return undefined;
    const [updated] = await db
      .update(events)
      .set(fieldMap)
      .where(eq(events.id, id))
      .returning();
    return updated || undefined;
  }

  async getTotalHeatsForEvent(eventId: string, round?: string): Promise<number> {
    // Get all entries for this event and count distinct heats based on round
    const eventEntries = await db.select().from(entries).where(eq(entries.eventId, eventId));
    
    if (eventEntries.length === 0) return 1;
    
    // Determine which heat column to use based on round
    const heatValues = new Set<number>();
    
    // Normalize round string for matching
    const normalizedRound = round?.toLowerCase().trim();
    
    for (const entry of eventEntries) {
      let heatNum: number | null = null;
      
      // Check each round's heat field based on round parameter
      if (normalizedRound === 'prelim' || normalizedRound === 'preliminary' || normalizedRound === '1') {
        heatNum = entry.preliminaryHeat;
      } else if (normalizedRound === 'quarter' || normalizedRound === 'quarterfinal' || normalizedRound === '2') {
        heatNum = entry.quarterfinalHeat;
      } else if (normalizedRound === 'semi' || normalizedRound === 'semifinal' || normalizedRound === '3') {
        heatNum = entry.semifinalHeat;
      } else if (normalizedRound === 'final' || normalizedRound === '4' || normalizedRound === 'f') {
        heatNum = entry.finalHeat;
      } else {
        // Default when round not specified: use preliminary heats as the most common case
        // If no preliminary heats, try other rounds in order
        heatNum = entry.preliminaryHeat || entry.quarterfinalHeat || entry.semifinalHeat || entry.finalHeat;
      }
      
      if (heatNum) heatValues.add(heatNum);
    }
    
    // Return count of distinct heats (not max heat number), minimum 1
    const distinctHeats = heatValues.size;
    return distinctHeats > 0 ? distinctHeats : 1;
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

  async getEntriesByAthlete(athleteId: string): Promise<EntryWithDetails[]> {
    const athleteEntries = await db.query.entries.findMany({
      where: eq(entries.athleteId, athleteId),
      with: {
        athlete: true,
        team: true,
        event: true,
        splits: true,
      },
    });
    
    return athleteEntries as EntryWithDetails[];
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

  async getMeetByCode(meetCode: string): Promise<Meet | undefined> {
    const [meet] = await db.select().from(meets).where(eq(meets.meetCode, meetCode));
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

  async deleteMeet(id: string): Promise<boolean> {
    const result = await db.delete(meets).where(eq(meets.id, id));
    return true;
  }

  async resetMeet(id: string): Promise<{ teamsDeleted: number; athletesDeleted: number; eventsDeleted: number; divisionsDeleted: number }> {
    // Get counts before deleting
    const [teamsCount] = await db.select({ count: count() }).from(teams).where(eq(teams.meetId, id));
    const [athletesCount] = await db.select({ count: count() }).from(athletes).where(eq(athletes.meetId, id));
    const [eventsCount] = await db.select({ count: count() }).from(events).where(eq(events.meetId, id));
    const [divisionsCount] = await db.select({ count: count() }).from(divisions).where(eq(divisions.meetId, id));
    
    // Delete live event data for this meet
    await db.delete(liveEventData).where(eq(liveEventData.meetId, id));
    
    // Delete meet scoring data (order matters due to FK constraints)
    await db.delete(teamScoringResults).where(eq(teamScoringResults.meetId, id));
    await db.delete(meetScoringState).where(
      inArray(meetScoringState.profileId, 
        db.select({ id: meetScoringProfiles.id }).from(meetScoringProfiles).where(eq(meetScoringProfiles.meetId, id))
      )
    );
    await db.delete(meetScoringOverrides).where(
      inArray(meetScoringOverrides.profileId, 
        db.select({ id: meetScoringProfiles.id }).from(meetScoringProfiles).where(eq(meetScoringProfiles.meetId, id))
      )
    );
    await db.delete(meetScoringProfiles).where(eq(meetScoringProfiles.meetId, id));
    
    // Delete display-related data (order matters)
    await db.delete(layoutObjects).where(
      inArray(layoutObjects.sceneId,
        db.select({ id: layoutScenes.id }).from(layoutScenes).where(eq(layoutScenes.meetId, id))
      )
    );
    await db.delete(layoutScenes).where(eq(layoutScenes.meetId, id));
    await db.delete(layoutCells).where(
      inArray(layoutCells.layoutId,
        db.select({ id: displayLayouts.id }).from(displayLayouts).where(eq(displayLayouts.meetId, id))
      )
    );
    await db.delete(displayLayouts).where(eq(displayLayouts.meetId, id));
    await db.delete(boardConfigs).where(eq(boardConfigs.meetId, id));
    await db.delete(displayAssignments).where(eq(displayAssignments.meetId, id));
    await db.delete(displayDevices).where(eq(displayDevices.meetId, id));
    await db.delete(displayComputers).where(eq(displayComputers.meetId, id));
    await db.delete(displayThemes).where(eq(displayThemes.meetId, id));
    
    // Delete sponsor data
    await db.delete(sponsorRotationProfiles).where(eq(sponsorRotationProfiles.meetId, id));
    await db.delete(sponsorAssignments).where(eq(sponsorAssignments.meetId, id));
    
    // Delete combined events data
    await db.delete(combinedEventTotals).where(
      inArray(combinedEventTotals.combinedEventId,
        db.select({ id: combinedEvents.id }).from(combinedEvents).where(eq(combinedEvents.meetId, id))
      )
    );
    await db.delete(combinedEventComponents).where(
      inArray(combinedEventComponents.combinedEventId,
        db.select({ id: combinedEvents.id }).from(combinedEvents).where(eq(combinedEvents.meetId, id))
      )
    );
    await db.delete(combinedEvents).where(eq(combinedEvents.meetId, id));
    
    // Delete composite layouts (layoutZones cascade from compositeLayouts)
    await db.delete(layoutZones).where(
      inArray(layoutZones.layoutId,
        db.select({ id: compositeLayouts.id }).from(compositeLayouts).where(eq(compositeLayouts.meetId, id))
      )
    );
    await db.delete(compositeLayouts).where(eq(compositeLayouts.meetId, id));
    
    // Delete weather data
    await db.delete(weatherReadings).where(eq(weatherReadings.meetId, id));
    await db.delete(weatherStationConfigs).where(eq(weatherStationConfigs.meetId, id));
    
    // Delete medal awards
    await db.delete(medalAwards).where(eq(medalAwards.meetId, id));
    
    // Delete judge tokens
    await db.delete(judgeTokens).where(eq(judgeTokens.meetId, id));
    
    // Delete Lynx configs for this meet (keep global ones with null meetId)
    await db.delete(lynxConfigs).where(eq(lynxConfigs.meetId, id));
    
    // Delete events (cascades to entries, event splits, field attempts, wind readings, etc.)
    await db.delete(events).where(eq(events.meetId, id));
    
    // Delete athletes (cascades to athlete photos, athlete bests)
    await db.delete(athletes).where(eq(athletes.meetId, id));
    
    // Delete teams (cascades to team logos)
    await db.delete(teams).where(eq(teams.meetId, id));
    
    // Delete divisions
    await db.delete(divisions).where(eq(divisions.meetId, id));
    
    // Clear lastImportAt timestamp
    await db.update(meets).set({ lastImportAt: null }).where(eq(meets.id, id));
    
    return {
      teamsDeleted: teamsCount?.count || 0,
      athletesDeleted: athletesCount?.count || 0,
      eventsDeleted: eventsCount?.count || 0,
      divisionsDeleted: divisionsCount?.count || 0,
    };
  }

  async clearMeetImportData(meetId: string): Promise<{ teamsDeleted: number; athletesDeleted: number; eventsDeleted: number; divisionsDeleted: number; entriesDeleted: number }> {
    console.log(`\n🧹 Clearing import data for meet ${meetId}...`);

    const [teamsCount] = await db.select({ count: count() }).from(teams).where(eq(teams.meetId, meetId));
    const [athletesCount] = await db.select({ count: count() }).from(athletes).where(eq(athletes.meetId, meetId));
    const [eventsCount] = await db.select({ count: count() }).from(events).where(eq(events.meetId, meetId));
    const [divisionsCount] = await db.select({ count: count() }).from(divisions).where(eq(divisions.meetId, meetId));

    const meetEventIds = db.select({ id: events.id }).from(events).where(eq(events.meetId, meetId));
    const [entriesCount] = await db.select({ count: count() }).from(entries).where(inArray(entries.eventId, meetEventIds));

    await db.delete(liveEventData).where(eq(liveEventData.meetId, meetId));

    const meetProfileIds = db.select({ id: meetScoringProfiles.id }).from(meetScoringProfiles).where(eq(meetScoringProfiles.meetId, meetId));
    await db.delete(teamScoringResults).where(inArray(teamScoringResults.profileId, meetProfileIds));
    await db.delete(meetScoringState).where(inArray(meetScoringState.profileId, meetProfileIds));

    await db.delete(combinedEventTotals).where(
      inArray(combinedEventTotals.combinedEventId,
        db.select({ id: combinedEvents.id }).from(combinedEvents).where(eq(combinedEvents.meetId, meetId))
      )
    );
    await db.delete(combinedEventComponents).where(
      inArray(combinedEventComponents.combinedEventId,
        db.select({ id: combinedEvents.id }).from(combinedEvents).where(eq(combinedEvents.meetId, meetId))
      )
    );
    await db.delete(combinedEvents).where(eq(combinedEvents.meetId, meetId));

    await db.delete(medalAwards).where(eq(medalAwards.meetId, meetId));

    await db.delete(processedIngestionFiles).where(eq(processedIngestionFiles.meetId, meetId));

    await db.delete(entries).where(inArray(entries.eventId, meetEventIds));
    await db.delete(events).where(eq(events.meetId, meetId));
    await db.delete(athletes).where(eq(athletes.meetId, meetId));
    await db.delete(teams).where(eq(teams.meetId, meetId));
    await db.delete(divisions).where(eq(divisions.meetId, meetId));

    const result = {
      teamsDeleted: teamsCount?.count || 0,
      athletesDeleted: athletesCount?.count || 0,
      eventsDeleted: eventsCount?.count || 0,
      divisionsDeleted: divisionsCount?.count || 0,
      entriesDeleted: entriesCount?.count || 0,
    };

    console.log(`🧹 Cleared: ${result.eventsDeleted} events, ${result.entriesDeleted} entries, ${result.athletesDeleted} athletes, ${result.teamsDeleted} teams, ${result.divisionsDeleted} divisions`);
    return result;
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async getTeamsByMeetId(meetId: string): Promise<Team[]> {
    return db.select().from(teams).where(eq(teams.meetId, meetId));
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values(insertTeam)
      .returning();
    return team;
  }

  async updateTeam(id: string, data: Partial<Team>): Promise<Team> {
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.shortName !== undefined) updateData.shortName = data.shortName;
    if (data.abbreviation !== undefined) updateData.abbreviation = data.abbreviation;
    if ('menScoreOverride' in data) updateData.menScoreOverride = data.menScoreOverride;
    if ('womenScoreOverride' in data) updateData.womenScoreOverride = data.womenScoreOverride;

    const [updated] = await db.update(teams).set(updateData).where(eq(teams.id, id)).returning();
    return updated;
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

  // Display Devices (Remote Display Control)
  async getDisplayDevices(meetId: string): Promise<DisplayDeviceWithEvent[]> {
    const devices = await db
      .select()
      .from(displayDevices)
      .where(eq(displayDevices.meetId, meetId));
    
    const assignedEventIds = devices
      .map(d => d.assignedEventId)
      .filter((id): id is string => !!id);
    
    const eventsMap = new Map<string, Event>();
    if (assignedEventIds.length > 0) {
      const assignedEvents = await db
        .select()
        .from(events)
        .where(inArray(events.id, assignedEventIds));
      for (const evt of assignedEvents) {
        eventsMap.set(evt.id, evt);
      }
    }
    
    return devices.map(device => ({
      ...device,
      assignedEvent: device.assignedEventId ? eventsMap.get(device.assignedEventId) : undefined,
    }));
  }

  async getDisplayDevice(id: string): Promise<DisplayDevice | undefined> {
    const [device] = await db
      .select()
      .from(displayDevices)
      .where(eq(displayDevices.id, id));
    return device || undefined;
  }

  async getDisplayDeviceByName(meetId: string, deviceName: string): Promise<DisplayDevice | undefined> {
    const [device] = await db
      .select()
      .from(displayDevices)
      .where(and(
        eq(displayDevices.meetId, meetId),
        eq(displayDevices.deviceName, deviceName)
      ));
    return device || undefined;
  }

  async createOrUpdateDisplayDevice(device: InsertDisplayDevice & { lastIp?: string; displayType?: string; displayWidth?: number; displayHeight?: number }): Promise<DisplayDevice> {
    const existing = await this.getDisplayDeviceByName(device.meetId, device.deviceName);
    
    if (existing) {
      const updateData: any = {
        status: 'online',
        lastSeenAt: new Date(),
        lastIp: device.lastIp || existing.lastIp,
      };
      if (device.displayType) {
        updateData.displayType = device.displayType;
      }
      if (device.displayWidth !== undefined) {
        updateData.displayWidth = device.displayWidth;
      }
      if (device.displayHeight !== undefined) {
        updateData.displayHeight = device.displayHeight;
      }
      const [updated] = await db
        .update(displayDevices)
        .set(updateData)
        .where(eq(displayDevices.id, existing.id))
        .returning();
      return updated;
    }
    
    const [newDevice] = await db
      .insert(displayDevices)
      .values({
        ...device,
        displayType: device.displayType || 'P10',
        displayWidth: device.displayWidth ?? null,
        displayHeight: device.displayHeight ?? null,
        autoMode: true,
        status: 'online',
        lastSeenAt: new Date(),
      })
      .returning();
    return newDevice;
  }

  async updateDisplayDeviceStatus(id: string, status: string, lastIp?: string): Promise<DisplayDevice | undefined> {
    const updates: any = {
      status,
      lastSeenAt: new Date(),
    };
    if (lastIp) {
      updates.lastIp = lastIp;
    }
    
    const [updated] = await db
      .update(displayDevices)
      .set(updates)
      .where(eq(displayDevices.id, id))
      .returning();
    return updated || undefined;
  }

  async updateDisplayDeviceMode(id: string, displayMode: 'track' | 'field'): Promise<DisplayDevice | undefined> {
    const updateData: any = { displayMode };
    
    // When switching to track mode, clear the assigned event since track displays auto-show from Lynx
    if (displayMode === 'track') {
      updateData.assignedEventId = null;
    }
    
    const [updated] = await db
      .update(displayDevices)
      .set(updateData)
      .where(eq(displayDevices.id, id))
      .returning();
    return updated || undefined;
  }

  async updateDisplayDeviceType(id: string, displayType: string, deviceName?: string, displayWidth?: number, displayHeight?: number): Promise<DisplayDevice | undefined> {
    const updateData: any = { 
      displayType,
      lastSeenAt: new Date(),
    };
    
    if (deviceName) {
      updateData.deviceName = deviceName;
    }
    if (displayWidth !== undefined) {
      updateData.displayWidth = displayWidth;
    }
    if (displayHeight !== undefined) {
      updateData.displayHeight = displayHeight;
    }
    
    const [updated] = await db
      .update(displayDevices)
      .set(updateData)
      .where(eq(displayDevices.id, id))
      .returning();
    return updated || undefined;
  }

  async updateDisplayAutoMode(id: string, autoMode: boolean): Promise<DisplayDevice | undefined> {
    const [updated] = await db
      .update(displayDevices)
      .set({ autoMode })
      .where(eq(displayDevices.id, id))
      .returning();
    return updated || undefined;
  }

  async updateDisplayDevice(id: string, updates: Partial<{ pagingSize: number; pagingInterval: number; fieldPort: number | null; isBigBoard: boolean }>): Promise<DisplayDevice | undefined> {
    const [updated] = await db
      .update(displayDevices)
      .set(updates)
      .where(eq(displayDevices.id, id))
      .returning();
    return updated || undefined;
  }

  async assignEventToDisplay(displayId: string, eventId: string | null): Promise<DisplayDevice | undefined> {
    const [updated] = await db
      .update(displayDevices)
      .set({
        assignedEventId: eventId,
      })
      .where(eq(displayDevices.id, displayId))
      .returning();
    return updated || undefined;
  }

  async updateDisplayTemplate(displayId: string, template: string | null): Promise<DisplayDevice | undefined> {
    const [updated] = await db
      .update(displayDevices)
      .set({
        currentTemplate: template,
      })
      .where(eq(displayDevices.id, displayId))
      .returning();
    return updated || undefined;
  }

  async deleteDisplayDevice(id: string): Promise<boolean> {
    const result = await db
      .delete(displayDevices)
      .where(eq(displayDevices.id, id))
      .returning();
    return result.length > 0;
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
    
    // Transform database result to BoardConfig type
    const { id, createdAt, updatedAt, ...boardConfig } = newConfig;
    return boardConfig as BoardConfig;
  }

  async getBoardConfig(boardId: string, meetId: string): Promise<BoardConfig | null> {
    const [config] = await db
      .select()
      .from(boardConfigs)
      .where(and(
        eq(boardConfigs.boardId, boardId),
        eq(boardConfigs.meetId, meetId)
      ));
    
    if (!config) return null;
    
    // Transform database result to BoardConfig type
    const { id, createdAt, updatedAt, ...boardConfig } = config;
    return boardConfig as BoardConfig;
  }

  async updateBoardConfig(id: string, config: Partial<InsertBoardConfig>): Promise<BoardConfig | null> {
    const [updated] = await db
      .update(boardConfigs)
      .set({ ...config, updatedAt: new Date() } as any)
      .where(eq(boardConfigs.id, id))
      .returning();
    
    if (!updated) return null;
    
    // Transform database result to BoardConfig type
    const { id: _, createdAt, updatedAt, ...boardConfig } = updated;
    return boardConfig as BoardConfig;
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
    return db.select().from(recordBooks).where(eq(recordBooks.isActive, true));
  }

  async getRecordBook(id: number): Promise<RecordBookWithRecords | null> {
    const [book] = await db
      .select()
      .from(recordBooks)
      .where(eq(recordBooks.id, id));
    
    if (!book) return null;
    
    const bookRecords = await db
      .select()
      .from(records)
      .where(eq(records.recordBookId, id));
    
    return { ...book, records: bookRecords };
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
  async getRecords(recordBookId: number): Promise<SelectRecord[]> {
    return db
      .select()
      .from(records)
      .where(eq(records.recordBookId, recordBookId));
  }

  async getRecordsByEvent(eventType: string, gender: string): Promise<SelectRecord[]> {
    const results = await db
      .select()
      .from(records)
      .innerJoin(recordBooks, eq(records.recordBookId, recordBooks.id))
      .where(and(
        eq(records.eventType, eventType),
        eq(records.gender, gender),
        eq(recordBooks.isActive, true)
      ));
    
    return results.map(r => r.records);
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

  async updateRecord(id: number, updates: Partial<InsertRecord>): Promise<SelectRecord> {
    const [record] = await db
      .update(records)
      .set(updates)
      .where(eq(records.id, id))
      .returning();
    return record;
  }

  async deleteRecord(id: number): Promise<void> {
    await db.delete(records).where(eq(records.id, id));
  }

  // Record Checking
  async checkForRecords(eventType: string, gender: string, performance: string, windSpeed?: number): Promise<RecordCheck[]> {
    const newPerf = parsePerformanceToSeconds(performance);
    if (newPerf === null) return [];
    
    // Check if wind-legal for track events (if windSpeed provided)
    const isWindLegal = windSpeed === undefined || windSpeed <= 2.0;
    if (!isWindLegal) return []; // Don't compare wind-illegal performances
    
    const matchingRecords = await this.getRecordsByEvent(eventType, gender);
    const checks: RecordCheck[] = [];
    
    for (const record of matchingRecords) {
      const existingPerf = parsePerformanceToSeconds(record.performance);
      if (existingPerf === null) continue;
      
      const [book] = await db
        .select()
        .from(recordBooks)
        .where(eq(recordBooks.id, record.recordBookId));
      
      if (!book) continue;
      
      // Determine if better (lower for times, higher for distances/heights)
      const isTimeBasedEvent = isTimeEvent(eventType);
      const isBetter = isTimeBasedEvent ? newPerf < existingPerf : newPerf > existingPerf;
      const isTied = Math.abs(newPerf - existingPerf) < 0.01;
      
      // Calculate margin
      const diff = Math.abs(newPerf - existingPerf);
      const margin = isTimeBasedEvent ? 
        `-${diff.toFixed(2)}s` : 
        `+${diff.toFixed(2)}m`;
      
      checks.push({
        recordId: record.id,
        recordBookId: record.recordBookId,
        recordBookName: book.name,
        isRecord: isBetter && !isTied,
        isTied,
        margin,
        existingPerformance: record.performance,
        newPerformance: performance
      });
    }
    
    return checks;
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
        .values([profile])
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
      .values([result])
      .returning();
    return newResult;
  }

  // Team Standings Query - computes on the fly from scored events using MDB scoring rules
  async getTeamStandings(
    meetId: string,
    scope?: { gender?: string; division?: string }
  ): Promise<TeamStandingsEntry[]> {
    const rules = await db
      .select({
        gender: meetScoringRules.gender,
        place: meetScoringRules.place,
        indScore: meetScoringRules.indScore,
        relScore: meetScoringRules.relScore,
      })
      .from(meetScoringRules)
      .where(eq(meetScoringRules.meetId, meetId))
      .orderBy(meetScoringRules.place);

    if (rules.length === 0) return [];

    const indPointsMap = new Map<string, Map<number, number>>();
    const relPointsMap = new Map<string, Map<number, number>>();
    for (const rule of rules) {
      const g = rule.gender;
      if (!indPointsMap.has(g)) indPointsMap.set(g, new Map());
      if (!relPointsMap.has(g)) relPointsMap.set(g, new Map());
      if (rule.indScore > 0) indPointsMap.get(g)!.set(rule.place, rule.indScore);
      if (rule.relScore > 0) relPointsMap.get(g)!.set(rule.place, rule.relScore);
    }

    let indMaxScorers = 0;
    let relMaxScorers = 0;
    try {
      const meetRecord = await db.select({
        indMaxScorersPerTeam: meets.indMaxScorersPerTeam,
        relMaxScorersPerTeam: meets.relMaxScorersPerTeam,
      }).from(meets).where(eq(meets.id, meetId)).limit(1);
      indMaxScorers = meetRecord[0]?.indMaxScorersPerTeam || 0;
      relMaxScorers = meetRecord[0]?.relMaxScorersPerTeam || 0;
    } catch (e) {
      console.warn('[getTeamStandings] Could not read max scorers columns (schema may need migration):', (e as any)?.message);
    }

    const scoredEventsConditions = [
      eq(events.meetId, meetId),
      eq(events.isScored, true),
    ];
    if (scope?.gender) {
      scoredEventsConditions.push(eq(events.gender, scope.gender));
    }

    const scoredEventsList = await db
      .select({ id: events.id, name: events.name, gender: events.gender, eventType: events.eventType })
      .from(events)
      .where(and(...scoredEventsConditions));

    if (scoredEventsList.length === 0) return [];

    const scoredEventIds = scoredEventsList.map(e => e.id);

    const allEntries = await db
      .select({
        eventId: entries.eventId,
        finalPlace: entries.finalPlace,
        scoredPoints: entries.scoredPoints,
        teamId: athletes.teamId,
        teamName: teams.name,
      })
      .from(entries)
      .innerJoin(athletes, eq(entries.athleteId, athletes.id))
      .leftJoin(teams, eq(athletes.teamId, teams.id))
      .where(and(
        inArray(entries.eventId, scoredEventIds),
        isNotNull(athletes.teamId),
        or(
          and(isNotNull(entries.scoredPoints), gt(entries.scoredPoints, 0)),
          isNotNull(entries.finalPlace),
        ),
      ))
      .orderBy(entries.eventId, entries.finalPlace);

    const entriesByEvent = new Map<string, typeof allEntries>();
    for (const entry of allEntries) {
      const eventEntries = entriesByEvent.get(entry.eventId) || [];
      eventEntries.push(entry);
      entriesByEvent.set(entry.eventId, eventEntries);
    }

    const teamScores = new Map<string, { teamName: string; totalPoints: number; events: Map<string, { eventName: string; points: number }> }>();

    for (const evt of scoredEventsList) {
      const nameLower = evt.name.toLowerCase();
      const typeLower = evt.eventType.toLowerCase();
      const isRelay = nameLower.includes('relay') || typeLower.startsWith('4x') || typeLower.includes('relay') ||
        /^\d+x\d+/.test(typeLower);
      const genderRaw = (evt.gender || "").toUpperCase().charAt(0);
      const evtGender = genderRaw === "W" || genderRaw === "F" ? "F" : genderRaw === "M" ? "M" : "M";

      let ptsMap: Map<number, number> | undefined;
      if (isRelay) {
        ptsMap = relPointsMap.get(evtGender) || relPointsMap.get("ALL");
      } else {
        ptsMap = indPointsMap.get(evtGender) || indPointsMap.get("ALL");
      }
      if (!ptsMap || ptsMap.size === 0) continue;

      const maxScorers = isRelay ? relMaxScorers : indMaxScorers;

      const eventEntries = entriesByEvent.get(evt.id) || [];

      const teamScorerCount = new Map<string, number>();

      for (const entry of eventEntries) {
        if (!entry.teamId || !entry.teamName) continue;

        let pts = 0;
        if (entry.scoredPoints != null && entry.scoredPoints > 0) {
          pts = entry.scoredPoints;
        } else if (entry.finalPlace && ptsMap && ptsMap.size > 0) {
          if (maxScorers > 0) {
            const count = teamScorerCount.get(entry.teamId) || 0;
            if (count >= maxScorers) continue;
            teamScorerCount.set(entry.teamId, count + 1);
          }
          pts = ptsMap.get(entry.finalPlace) || 0;
        }
        if (pts === 0) continue;

        if (!teamScores.has(entry.teamId)) {
          teamScores.set(entry.teamId, { teamName: entry.teamName, totalPoints: 0, events: new Map() });
        }
        const team = teamScores.get(entry.teamId)!;
        team.totalPoints += pts;

        const existing = team.events.get(evt.id);
        if (existing) {
          existing.points += pts;
        } else {
          team.events.set(evt.id, { eventName: evt.name, points: pts });
        }
      }
    }

    try {
      const meetTeams = await db.select({
        id: teams.id,
        name: teams.name,
        menScoreOverride: teams.menScoreOverride,
        womenScoreOverride: teams.womenScoreOverride,
      }).from(teams).where(eq(teams.meetId, meetId));

      for (const team of meetTeams) {
        const override = scope?.gender === 'W' ? team.womenScoreOverride : team.menScoreOverride;
        if (override !== null && override !== undefined) {
          if (teamScores.has(team.id)) {
            teamScores.get(team.id)!.totalPoints = override;
          } else {
            teamScores.set(team.id, {
              teamName: team.name,
              totalPoints: override,
              events: new Map(),
            });
          }
        }
      }
    } catch (e) {
      console.warn('[getTeamStandings] Could not read score override columns (schema may need migration):', (e as any)?.message);
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
        eq(eventSplitConfigs.eventType, event.eventType),
        eq(eventSplitConfigs.meetId, event.meetId)
      ))
      .orderBy(eventSplitConfigs.splitOrder);
    
    if (meetSpecific.length > 0) return meetSpecific;
    
    return db.select()
      .from(eventSplitConfigs)
      .where(and(
        eq(eventSplitConfigs.eventType, event.eventType),
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

  // Sponsors
  async getSponsors(): Promise<SelectSponsor[]> {
    return db.select().from(sponsors);
  }

  async getSponsor(id: number): Promise<SelectSponsor | null> {
    const [sponsor] = await db.select()
      .from(sponsors)
      .where(eq(sponsors.id, id));
    return sponsor || null;
  }

  async createSponsor(sponsor: InsertSponsor): Promise<SelectSponsor> {
    const [created] = await db.insert(sponsors).values(sponsor).returning();
    return created;
  }

  async updateSponsor(id: number, sponsor: Partial<InsertSponsor>): Promise<SelectSponsor> {
    const [updated] = await db.update(sponsors)
      .set(sponsor)
      .where(eq(sponsors.id, id))
      .returning();
    return updated;
  }

  async deleteSponsor(id: number): Promise<void> {
    await db.delete(sponsors).where(eq(sponsors.id, id));
  }

  // Sponsor assignments
  async getSponsorAssignments(meetId: string): Promise<SelectSponsorAssignment[]> {
    return db.select()
      .from(sponsorAssignments)
      .where(eq(sponsorAssignments.meetId, meetId));
  }

  async createSponsorAssignment(assignment: InsertSponsorAssignment): Promise<SelectSponsorAssignment> {
    const [created] = await db.insert(sponsorAssignments).values(assignment).returning();
    return created;
  }

  async deleteSponsorAssignment(id: number): Promise<void> {
    await db.delete(sponsorAssignments).where(eq(sponsorAssignments.id, id));
  }

  // Rotation profiles
  async getRotationProfile(meetId: string, zoneName: string): Promise<SelectSponsorRotationProfile | null> {
    const [profile] = await db.select()
      .from(sponsorRotationProfiles)
      .where(and(
        eq(sponsorRotationProfiles.meetId, meetId),
        eq(sponsorRotationProfiles.zoneName, zoneName)
      ));
    return profile || null;
  }

  async createRotationProfile(profile: InsertSponsorRotationProfile): Promise<SelectSponsorRotationProfile> {
    const [created] = await db.insert(sponsorRotationProfiles).values(profile).returning();
    return created;
  }

  async updateRotationProfile(id: number, profile: Partial<InsertSponsorRotationProfile>): Promise<SelectSponsorRotationProfile> {
    const [updated] = await db.update(sponsorRotationProfiles)
      .set(profile)
      .where(eq(sponsorRotationProfiles.id, id))
      .returning();
    return updated;
  }

  // Get active sponsors for rotation
  async getActiveSponsorsForRotation(meetId: string, eventType?: string): Promise<SelectSponsor[]> {
    // Get all assignments for this meet
    const assignments = await db.select()
      .from(sponsorAssignments)
      .where(eq(sponsorAssignments.meetId, meetId));
    
    // Filter by event type if provided
    const relevantAssignments = eventType
      ? assignments.filter(a => !a.eventType || a.eventType === eventType)
      : assignments;
    
    if (relevantAssignments.length === 0) {
      return [];
    }
    
    // Get sponsor IDs
    const sponsorIds = relevantAssignments.map(a => a.sponsorId);
    
    // Fetch active sponsors
    const activeSponsors = await db.select()
      .from(sponsors)
      .where(and(
        inArray(sponsors.id, sponsorIds),
        eq(sponsors.isActive, true)
      ));
    
    return activeSponsors;
  }

  // Medal awards
  async getMedalAwards(meetId: string): Promise<SelectMedalAward[]> {
    return db.select()
      .from(medalAwards)
      .where(eq(medalAwards.meetId, meetId))
      .orderBy(desc(medalAwards.awardedAt));
  }

  async getEventMedalAwards(eventId: string): Promise<SelectMedalAward[]> {
    return db.select()
      .from(medalAwards)
      .where(eq(medalAwards.eventId, eventId));
  }

  async createMedalAward(award: InsertMedalAward): Promise<SelectMedalAward> {
    const [created] = await db.insert(medalAwards).values(award).returning();
    return created;
  }

  async deleteMedalAwards(eventId: string): Promise<void> {
    await db.delete(medalAwards).where(eq(medalAwards.eventId, eventId));
  }

  async getMedalStandings(meetId: string): Promise<MedalStanding[]> {
    // Get all medal awards for the meet
    const awards = await this.getMedalAwards(meetId);
    
    // Group by team and count medals
    const teamMap = new Map<string, MedalStanding>();
    
    for (const award of awards) {
      const team = await db.select().from(teams).where(eq(teams.id, award.teamId)).then(r => r[0]);
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
    
    // Convert to array and sort by Olympic ranking (gold > silver > bronze > total)
    const standings = Array.from(teamMap.values()).sort((a, b) => {
      if (a.gold !== b.gold) return b.gold - a.gold;
      if (a.silver !== b.silver) return b.silver - a.silver;
      if (a.bronze !== b.bronze) return b.bronze - a.bronze;
      if (a.total !== b.total) return b.total - a.total;
      return a.teamName.localeCompare(b.teamName);
    });
    
    return standings;
  }

  async recomputeMedalsForEvent(eventId: string): Promise<void> {
    const event = await this.getEvent(eventId);
    if (!event || event.status !== 'completed') return;
    
    // Delete existing awards for this event
    await this.deleteMedalAwards(eventId);
    
    // Get all entries with results for this event
    const eventWithEntries = await this.getEventWithEntries(eventId);
    if (!eventWithEntries || !eventWithEntries.entries.length) return;
    
    // Find entries with positions 1, 2, 3
    const medalists = eventWithEntries.entries.filter(e => 
      e.finalPlace && e.finalPlace >= 1 && e.finalPlace <= 3
    );
    
    // Award medals
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

  // Combined events
  async getCombinedEvents(meetId: string): Promise<SelectCombinedEvent[]> {
    return db.select()
      .from(combinedEvents)
      .where(eq(combinedEvents.meetId, meetId));
  }

  async getCombinedEvent(id: number): Promise<SelectCombinedEvent | null> {
    const [event] = await db.select()
      .from(combinedEvents)
      .where(eq(combinedEvents.id, id));
    return event || null;
  }

  async createCombinedEvent(event: InsertCombinedEvent): Promise<SelectCombinedEvent> {
    const [created] = await db.insert(combinedEvents).values(event).returning();
    return created;
  }

  async getCombinedEventComponents(combinedEventId: number): Promise<SelectCombinedEventComponent[]> {
    return db.select()
      .from(combinedEventComponents)
      .where(eq(combinedEventComponents.combinedEventId, combinedEventId))
      .orderBy(combinedEventComponents.sequenceOrder);
  }

  async createCombinedEventComponent(component: InsertCombinedEventComponent): Promise<SelectCombinedEventComponent> {
    const [created] = await db.insert(combinedEventComponents).values(component).returning();
    return created;
  }

  async getCombinedEventStandings(combinedEventId: number): Promise<CombinedEventStanding[]> {
    const totals = await db.select()
      .from(combinedEventTotals)
      .leftJoin(athletes, eq(combinedEventTotals.athleteId, athletes.id))
      .leftJoin(teams, eq(athletes.teamId, teams.id))
      .where(eq(combinedEventTotals.combinedEventId, combinedEventId))
      .orderBy(desc(combinedEventTotals.totalPoints));
    
    const standings: CombinedEventStanding[] = totals.map((row, index) => ({
      rank: index + 1,
      athleteId: row.combined_event_totals.athleteId,
      athleteName: row.athletes ? `${row.athletes.firstName} ${row.athletes.lastName}` : "Unknown",
      teamName: row.teams?.name,
      totalPoints: row.combined_event_totals.totalPoints || 0,
      eventsCompleted: row.combined_event_totals.eventsCompleted || 0,
      breakdown: (row.combined_event_totals.eventBreakdown as any[]) || []
    }));
    
    return standings;
  }

  async updateCombinedEventTotals(combinedEventId: number): Promise<void> {
    const { calculateEventPoints, normalizeEventType } = await import('./combined-events-scoring');
    
    // Get combined event details
    const combinedEvent = await this.getCombinedEvent(combinedEventId);
    if (!combinedEvent) {
      console.error(`Combined event ${combinedEventId} not found`);
      return;
    }
    
    // Determine gender from event type
    const gender = combinedEvent.gender === 'M' || combinedEvent.gender === 'male' ? 'M' : 'F';
    
    // Get all component events
    const components = await this.getCombinedEventComponents(combinedEventId);
    
    // Get all athletes in this combined event
    const existingTotals = await db.select().from(combinedEventTotals)
      .where(eq(combinedEventTotals.combinedEventId, combinedEventId));
    
    // For each athlete, calculate their total points
    for (const total of existingTotals) {
      let totalPoints = 0;
      let eventsCompleted = 0;
      const breakdown: Array<{ eventName: string; performance: string; points: number }> = [];
      
      // Get entries for each component event
      for (const component of components) {
        const event = await this.getEvent(component.eventId);
        if (!event) continue;
        
        // Get athlete's entry for this event
        const eventEntries = await this.getEntriesWithDetails(component.eventId);
        const athleteEntry = eventEntries.find(e => e.athleteId === total.athleteId);
        
        if (athleteEntry && athleteEntry.performance) {
          const eventType = normalizeEventType(event.eventType || '');
          const points = calculateEventPoints(eventType, athleteEntry.performance, gender as 'M' | 'F');
          
          breakdown.push({
            eventName: event.name || event.eventType || '',
            performance: athleteEntry.performance,
            points
          });
          
          if (points > 0) {
            totalPoints += points;
            eventsCompleted++;
          }
        }
      }
      
      // Update the totals
      await db.update(combinedEventTotals)
        .set({
          totalPoints,
          eventsCompleted,
          eventBreakdown: breakdown,
          updatedAt: new Date()
        })
        .where(eq(combinedEventTotals.id, total.id));
    }
    
    console.log(`Updated combined event totals for ${combinedEventId}: ${existingTotals.length} athletes`);
  }
  
  async addAthleteToCombinedEvent(combinedEventId: number, athleteId: string): Promise<void> {
    await db.insert(combinedEventTotals)
      .values({
        combinedEventId,
        athleteId,
        totalPoints: 0,
        eventsCompleted: 0,
        eventBreakdown: []
      })
      .onConflictDoNothing();
  }
  
  async removeAthleteFromCombinedEvent(combinedEventId: number, athleteId: string): Promise<void> {
    await db.delete(combinedEventTotals)
      .where(
        and(
          eq(combinedEventTotals.combinedEventId, combinedEventId),
          eq(combinedEventTotals.athleteId, athleteId)
        )
      );
  }
  
  async deleteCombinedEvent(id: number): Promise<void> {
    await db.delete(combinedEvents).where(eq(combinedEvents.id, id));
  }
  
  async updateCombinedEventStatus(id: number, status: string): Promise<SelectCombinedEvent | null> {
    const [updated] = await db.update(combinedEvents)
      .set({ status })
      .where(eq(combinedEvents.id, id))
      .returning();
    return updated || null;
  }
  
  async getCombinedEventsByComponentEvent(eventId: string): Promise<SelectCombinedEvent[]> {
    const components = await db.select()
      .from(combinedEventComponents)
      .where(eq(combinedEventComponents.eventId, eventId));
    
    if (components.length === 0) return [];
    
    const combinedEventIds = [...new Set(components.map(c => c.combinedEventId))];
    const eventsResult = await db.select()
      .from(combinedEvents)
      .where(sql`${combinedEvents.id} IN (${sql.join(combinedEventIds.map(id => sql`${id}`), sql`, `)})`);
    
    return eventsResult;
  }
  
  async getCombinedEventsByLynxEventNumber(lynxEventNumber: number): Promise<SelectCombinedEvent[]> {
    // Match Lynx event number to database events using the eventNumber column
    const matchingEvents = await db.select().from(events).where(eq(events.eventNumber, lynxEventNumber));
    
    if (matchingEvents.length === 0) return [];
    
    const allCombinedEvents: SelectCombinedEvent[] = [];
    for (const event of matchingEvents) {
      const ce = await this.getCombinedEventsByComponentEvent(event.id);
      allCombinedEvents.push(...ce);
    }
    
    const uniqueIds = new Set<number>();
    return allCombinedEvents.filter(ce => {
      if (uniqueIds.has(ce.id)) return false;
      uniqueIds.add(ce.id);
      return true;
    });
  }

  // QR code short links (in-memory)
  async getQRCode(slug: string): Promise<QRCodeMeta | null> {
    return this.qrCodes.get(slug) || null;
  }

  async createQRCode(meta: Omit<QRCodeMeta, 'slug' | 'createdAt'>): Promise<QRCodeMeta> {
    // Generate short slug (8 characters)
    const slug = Math.random().toString(36).substring(2, 10);
    
    const qrCode: QRCodeMeta = {
      ...meta,
      slug,
      createdAt: new Date()
    };
    
    this.qrCodes.set(slug, qrCode);
    return qrCode;
  }

  async getAllQRCodes(): Promise<QRCodeMeta[]> {
    return Array.from(this.qrCodes.values());
  }

  // Social media posts (in-memory queue)
  async getSocialMediaPosts(): Promise<SocialMediaPost[]> {
    return Array.from(this.socialMediaPosts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createSocialMediaPost(post: Omit<SocialMediaPost, 'id' | 'createdAt'>): Promise<SocialMediaPost> {
    const id = Math.random().toString(36).substring(2, 15);
    const socialPost: SocialMediaPost = {
      ...post,
      id,
      createdAt: new Date()
    };
    this.socialMediaPosts.set(id, socialPost);
    return socialPost;
  }

  async deleteSocialMediaPost(id: string): Promise<void> {
    this.socialMediaPosts.delete(id);
  }

  // FinishLynx result signatures (for deduplication)
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

  // ===== WEATHER STATION =====

  async getWeatherConfig(meetId: string): Promise<WeatherStationConfig | null> {
    const [config] = await db
      .select()
      .from(weatherStationConfigs)
      .where(eq(weatherStationConfigs.meetId, meetId))
      .limit(1);
    
    if (!config) return null;
    
    // Decrypt API key (handles plaintext gracefully)
    const { decryptApiKey, encryptApiKey } = await import('./crypto-utils');
    const decryptedKey = decryptApiKey(config.apiKey);
    
    // If the key was plaintext (no encryption format), re-encrypt it
    if (!config.apiKey.includes(':')) {
      console.log(`Migrating plaintext API key to encrypted format for meet ${meetId}`);
      const encryptedKey = encryptApiKey(decryptedKey);
      
      // Update database with encrypted version
      await db
        .update(weatherStationConfigs)
        .set({ apiKey: encryptedKey })
        .where(eq(weatherStationConfigs.meetId, meetId));
    }
    
    return {
      ...config,
      apiKey: decryptedKey
    };
  }

  async setWeatherConfig(config: InsertWeatherConfig): Promise<WeatherStationConfig> {
    // Encrypt API key before storing
    const { encryptApiKey, decryptApiKey } = await import('./crypto-utils');
    const encryptedConfig = {
      ...config,
      apiKey: encryptApiKey(config.apiKey)
    };
    
    const [result] = await db
      .insert(weatherStationConfigs)
      .values({
        ...encryptedConfig,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: weatherStationConfigs.meetId,
        set: {
          ...encryptedConfig,
          updatedAt: new Date()
        }
      })
      .returning();
    
    // Decrypt before returning
    return {
      ...result,
      apiKey: decryptApiKey(result.apiKey)
    };
  }

  async deleteWeatherConfig(meetId: string): Promise<void> {
    await db
      .delete(weatherStationConfigs)
      .where(eq(weatherStationConfigs.meetId, meetId));
    
    await db
      .delete(weatherReadings)
      .where(eq(weatherReadings.meetId, meetId));
  }

  async addWeatherReading(reading: InsertWeatherReading): Promise<WeatherReading> {
    const [result] = await db
      .insert(weatherReadings)
      .values(reading)
      .returning();
    
    await db
      .delete(weatherReadings)
      .where(
        and(
          eq(weatherReadings.meetId, reading.meetId),
          sql`${weatherReadings.observedAt} < NOW() - INTERVAL '24 hours'`
        )
      );
    
    return result;
  }

  async getLatestWeatherReading(meetId: string): Promise<WeatherReading | null> {
    const [reading] = await db
      .select()
      .from(weatherReadings)
      .where(eq(weatherReadings.meetId, meetId))
      .orderBy(desc(weatherReadings.observedAt))
      .limit(1);
    
    return reading || null;
  }

  async getWeatherHistory(meetId: string, hoursBack: number): Promise<WeatherReading[]> {
    return await db
      .select()
      .from(weatherReadings)
      .where(
        and(
          eq(weatherReadings.meetId, meetId),
          sql`${weatherReadings.observedAt} >= NOW() - INTERVAL '${sql.raw(hoursBack.toString())} hours'`
        )
      )
      .orderBy(sql`${weatherReadings.observedAt} ASC`);
  }

  // Lynx Configuration
  async getLynxConfigs(meetId?: string): Promise<LynxConfig[]> {
    if (meetId) {
      return db.select().from(lynxConfigs).where(eq(lynxConfigs.meetId, meetId));
    }
    return db.select().from(lynxConfigs);
  }

  async saveLynxConfig(config: InsertLynxConfig): Promise<LynxConfig> {
    const [result] = await db
      .insert(lynxConfigs)
      .values(config)
      .returning();
    return result;
  }

  async deleteLynxConfigs(meetId?: string): Promise<void> {
    if (meetId) {
      await db.delete(lynxConfigs).where(eq(lynxConfigs.meetId, meetId));
    } else {
      await db.delete(lynxConfigs).where(isNull(lynxConfigs.meetId));
    }
  }

  // Live Event Data (from Lynx)
  async getLiveEventData(eventNumber: number, meetId?: string): Promise<LiveEventData | null> {
    const conditions = [eq(liveEventData.eventNumber, eventNumber)];
    if (meetId) {
      conditions.push(eq(liveEventData.meetId, meetId));
    }
    
    const [result] = await db
      .select()
      .from(liveEventData)
      .where(and(...conditions))
      .orderBy(desc(liveEventData.lastUpdateAt))
      .limit(1);
    
    return result || null;
  }

  async getLiveEventsByMeet(meetId?: string): Promise<LiveEventData[]> {
    // Fetch recent records
    let allRecords: LiveEventData[];
    if (meetId) {
      allRecords = await db.select().from(liveEventData).where(eq(liveEventData.meetId, meetId)).orderBy(desc(liveEventData.lastUpdateAt)).limit(50);
    } else {
      allRecords = await db.select().from(liveEventData).orderBy(desc(liveEventData.lastUpdateAt)).limit(50);
    }
    
    // Group by eventNumber and return only the most complete record per event
    // (most entries, or most recently updated if entries count is equal)
    const bestByEvent = new Map<number, LiveEventData>();
    
    for (const record of allRecords) {
      const existing = bestByEvent.get(record.eventNumber);
      const recordEntries = Array.isArray(record.entries) ? record.entries.length : 0;
      const existingEntries = existing && Array.isArray(existing.entries) ? existing.entries.length : 0;
      
      // Prefer record with more entries, or newer if equal
      if (!existing || recordEntries > existingEntries) {
        bestByEvent.set(record.eventNumber, record);
      }
    }
    
    // Return sorted by lastUpdateAt descending
    return Array.from(bestByEvent.values())
      .sort((a, b) => new Date(b.lastUpdateAt || 0).getTime() - new Date(a.lastUpdateAt || 0).getTime())
      .slice(0, 10);
  }

  async upsertLiveEventData(data: InsertLiveEventData): Promise<LiveEventData> {
    const [result] = await db
      .insert(liveEventData)
      .values({
        ...data,
        lastUpdateAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [liveEventData.eventNumber, liveEventData.heat, liveEventData.round, liveEventData.flight, liveEventData.eventType, liveEventData.meetId],
        set: {
          mode: data.mode,
          status: data.status,
          wind: data.wind,
          distance: data.distance,
          eventName: data.eventName,
          entries: data.entries,
          runningTime: data.runningTime,
          isArmed: data.isArmed,
          isRunning: data.isRunning,
          totalHeats: data.totalHeats,
          lastUpdateAt: new Date(),
        },
      })
      .returning();
    
    return result;
  }

  async updateLiveEventEntries(eventNumber: number, entries: any[], meetId?: string): Promise<LiveEventData | null> {
    const conditions = [eq(liveEventData.eventNumber, eventNumber)];
    if (meetId) {
      conditions.push(eq(liveEventData.meetId, meetId));
    }
    
    const [result] = await db
      .update(liveEventData)
      .set({
        entries: entries,
        lastUpdateAt: new Date(),
      })
      .where(and(...conditions))
      .returning();
    
    return result || null;
  }

  async clearLiveEventData(meetId?: string): Promise<void> {
    if (meetId) {
      await db.delete(liveEventData).where(eq(liveEventData.meetId, meetId));
    } else {
      await db.delete(liveEventData);
    }
  }

  // Athlete Bests (College and Season PRs)
  async getAthleteBests(athleteId: string): Promise<AthleteBest[]> {
    return db.select().from(athleteBests).where(eq(athleteBests.athleteId, athleteId));
  }

  async getAthleteBest(athleteId: string, eventType: string, bestType: 'college' | 'season', seasonId?: number | null): Promise<AthleteBest | null> {
    const conditions = [
      eq(athleteBests.athleteId, athleteId),
      eq(athleteBests.eventType, eventType),
      eq(athleteBests.bestType, bestType),
    ];
    
    if (bestType === 'season' && seasonId !== undefined) {
      if (seasonId === null) {
        conditions.push(isNull(athleteBests.seasonId));
      } else {
        conditions.push(eq(athleteBests.seasonId, seasonId));
      }
    }
    
    const [result] = await db.select().from(athleteBests).where(and(...conditions));
    return result || null;
  }

  async getAthleteBestsByMeet(meetId: string): Promise<AthleteBest[]> {
    const meetAthletes = await db.select({ id: athletes.id }).from(athletes).where(eq(athletes.meetId, meetId));
    const athleteIds = meetAthletes.map(a => a.id);
    
    if (athleteIds.length === 0) return [];
    
    return db.select().from(athleteBests).where(inArray(athleteBests.athleteId, athleteIds));
  }

  async createAthleteBest(best: InsertAthleteBest): Promise<AthleteBest> {
    const [result] = await db.insert(athleteBests).values(best).returning();
    return result;
  }

  async updateAthleteBest(id: string, updates: Partial<InsertAthleteBest>): Promise<AthleteBest | null> {
    const [result] = await db
      .update(athleteBests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(athleteBests.id, id))
      .returning();
    return result || null;
  }

  async upsertAthleteBest(best: InsertAthleteBest): Promise<AthleteBest> {
    const existing = await this.getAthleteBest(
      best.athleteId, 
      best.eventType, 
      best.bestType as 'college' | 'season',
      best.seasonId
    );
    
    if (existing) {
      const updated = await this.updateAthleteBest(existing.id, best);
      return updated!;
    }
    
    return this.createAthleteBest(best);
  }

  async deleteAthleteBest(id: string): Promise<void> {
    await db.delete(athleteBests).where(eq(athleteBests.id, id));
  }

  async bulkImportAthleteBests(bests: InsertAthleteBest[]): Promise<AthleteBest[]> {
    if (bests.length === 0) return [];
    
    const results: AthleteBest[] = [];
    for (const best of bests) {
      const result = await this.upsertAthleteBest(best);
      results.push(result);
    }
    return results;
  }

  // Layout Scenes (Scene-based layout system)
  async getLayoutScenes(meetId?: string): Promise<LayoutSceneWithObjects[]> {
    let scenes: SelectLayoutScene[];
    if (meetId) {
      scenes = await db
        .select()
        .from(layoutScenes)
        .where(eq(layoutScenes.meetId, meetId));
    } else {
      scenes = await db.select().from(layoutScenes);
    }
    
    // Fetch objects for each scene
    const scenesWithObjects = await Promise.all(
      scenes.map(async (scene) => {
        const objects = await this.getLayoutObjects(scene.id);
        return { ...scene, objects };
      })
    );
    
    return scenesWithObjects;
  }

  async getLayoutScene(id: number): Promise<LayoutSceneWithObjects | null> {
    const [scene] = await db
      .select()
      .from(layoutScenes)
      .where(eq(layoutScenes.id, id));
    
    if (!scene) {
      return null;
    }

    const objects = await this.getLayoutObjects(id);
    return { ...scene, objects };
  }

  async createLayoutScene(scene: InsertLayoutScene): Promise<SelectLayoutScene> {
    const [newScene] = await db
      .insert(layoutScenes)
      .values({
        ...scene,
        updatedAt: new Date(),
      } as any)
      .returning();
    return newScene;
  }

  async updateLayoutScene(id: number, scene: Partial<InsertLayoutScene>): Promise<SelectLayoutScene | null> {
    const [updated] = await db
      .update(layoutScenes)
      .set({
        ...scene,
        updatedAt: new Date(),
      } as any)
      .where(eq(layoutScenes.id, id))
      .returning();
    return updated || null;
  }

  async deleteLayoutScene(id: number): Promise<boolean> {
    const result = await db
      .delete(layoutScenes)
      .where(eq(layoutScenes.id, id))
      .returning();
    return result.length > 0;
  }

  // Layout Objects (Objects within scenes)
  async getLayoutObjects(sceneId: number): Promise<SelectLayoutObject[]> {
    return db
      .select()
      .from(layoutObjects)
      .where(eq(layoutObjects.sceneId, sceneId));
  }

  async getLayoutObject(id: number): Promise<SelectLayoutObject | null> {
    const [object] = await db
      .select()
      .from(layoutObjects)
      .where(eq(layoutObjects.id, id));
    return object || null;
  }

  async createLayoutObject(object: InsertLayoutObject): Promise<SelectLayoutObject> {
    const [newObject] = await db
      .insert(layoutObjects)
      .values(object as any)
      .returning();
    return newObject;
  }

  async updateLayoutObject(id: number, object: Partial<InsertLayoutObject>): Promise<SelectLayoutObject | null> {
    const [updated] = await db
      .update(layoutObjects)
      .set(object as any)
      .where(eq(layoutObjects.id, id))
      .returning();
    return updated || null;
  }

  async deleteLayoutObject(id: number): Promise<boolean> {
    const result = await db
      .delete(layoutObjects)
      .where(eq(layoutObjects.id, id))
      .returning();
    return result.length > 0;
  }

  async reorderObjects(sceneId: number, objectIds: number[]): Promise<SelectLayoutObject[]> {
    const results: SelectLayoutObject[] = [];
    
    for (let i = 0; i < objectIds.length; i++) {
      const [updated] = await db
        .update(layoutObjects)
        .set({ zIndex: i })
        .where(and(
          eq(layoutObjects.id, objectIds[i]),
          eq(layoutObjects.sceneId, sceneId)
        ))
        .returning();
      
      if (updated) {
        results.push(updated);
      }
    }
    
    return results;
  }

  // Scene Template Mappings
  async getSceneTemplateMappings(meetId: string): Promise<SelectSceneTemplateMapping[]> {
    return db
      .select()
      .from(sceneTemplateMappings)
      .where(eq(sceneTemplateMappings.meetId, meetId));
  }

  async getSceneTemplateMappingByTypeAndMode(
    meetId: string,
    displayType: string,
    displayMode: string
  ): Promise<SelectSceneTemplateMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(sceneTemplateMappings)
      .where(
        and(
          eq(sceneTemplateMappings.meetId, meetId),
          eq(sceneTemplateMappings.displayType, displayType),
          eq(sceneTemplateMappings.displayMode, displayMode)
        )
      );
    return mapping || undefined;
  }

  async setSceneTemplateMapping(mapping: InsertSceneTemplateMapping): Promise<SelectSceneTemplateMapping> {
    const existing = await this.getSceneTemplateMappingByTypeAndMode(
      mapping.meetId!,
      mapping.displayType,
      mapping.displayMode
    );

    if (existing) {
      const [updated] = await db
        .update(sceneTemplateMappings)
        .set({
          sceneId: mapping.sceneId,
          updatedAt: new Date(),
        })
        .where(eq(sceneTemplateMappings.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(sceneTemplateMappings)
      .values({
        ...mapping,
        updatedAt: new Date(),
      } as any)
      .returning();
    return created;
  }

  async deleteSceneTemplateMapping(id: number): Promise<boolean> {
    const result = await db
      .delete(sceneTemplateMappings)
      .where(eq(sceneTemplateMappings.id, id))
      .returning();
    return result.length > 0;
  }

  // Meet Ingestion Settings
  async getIngestionSettings(meetId: string): Promise<MeetIngestionSettings | null> {
    const [settings] = await db
      .select()
      .from(meetIngestionSettings)
      .where(eq(meetIngestionSettings.meetId, meetId));
    return settings || null;
  }

  async upsertIngestionSettings(settings: InsertMeetIngestionSettings): Promise<MeetIngestionSettings> {
    const existing = await this.getIngestionSettings(settings.meetId);
    
    if (existing) {
      const [updated] = await db
        .update(meetIngestionSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(meetIngestionSettings.meetId, settings.meetId))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(meetIngestionSettings)
      .values(settings)
      .returning();
    return created;
  }

  async updateIngestionSettings(meetId: string, updates: Partial<InsertMeetIngestionSettings>): Promise<MeetIngestionSettings | null> {
    const [updated] = await db
      .update(meetIngestionSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(meetIngestionSettings.meetId, meetId))
      .returning();
    return updated || null;
  }

  async deleteIngestionSettings(meetId: string): Promise<void> {
    await db
      .delete(meetIngestionSettings)
      .where(eq(meetIngestionSettings.meetId, meetId));
  }

  // Processed Ingestion Files
  async getProcessedFiles(meetId: string): Promise<ProcessedFile[]> {
    return db
      .select()
      .from(processedIngestionFiles)
      .where(eq(processedIngestionFiles.meetId, meetId));
  }

  async hasProcessedFile(meetId: string, filePath: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(processedIngestionFiles)
      .where(and(
        eq(processedIngestionFiles.meetId, meetId),
        eq(processedIngestionFiles.filePath, filePath)
      ));
    return !!existing;
  }

  async isFileHashProcessed(meetId: string, filePath: string, fileHash: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(processedIngestionFiles)
      .where(and(
        eq(processedIngestionFiles.meetId, meetId),
        eq(processedIngestionFiles.filePath, filePath),
        eq(processedIngestionFiles.fileHash, fileHash)
      ));
    return !!existing;
  }

  async addProcessedFile(file: InsertProcessedFile): Promise<ProcessedFile> {
    const [created] = await db
      .insert(processedIngestionFiles)
      .values(file)
      .onConflictDoUpdate({
        target: [processedIngestionFiles.meetId, processedIngestionFiles.filePath],
        set: { 
          fileHash: file.fileHash, 
          recordsProcessed: file.recordsProcessed,
          processedAt: new Date() 
        }
      })
      .returning();
    return created;
  }

  async clearProcessedFiles(meetId: string): Promise<void> {
    await db
      .delete(processedIngestionFiles)
      .where(eq(processedIngestionFiles.meetId, meetId));
  }

  // Field Event Sessions
  async getAllFieldEventSessions(): Promise<FieldEventSession[]> {
    return await db.select().from(fieldEventSessions);
  }

  async getFieldEventSessionsByMeetId(meetId: string): Promise<FieldEventSession[]> {
    // Field sessions connect to events, and events have meetId
    // Some sessions (EVT-based) don't have eventId, so we get:
    // 1. Sessions with eventId that matches the meetId's events
    // 2. Also include EVT-based sessions (no eventId) that are standalone
    
    // First get sessions linked to events for this meet
    const sessionsWithEvents = await db
      .select({ session: fieldEventSessions })
      .from(fieldEventSessions)
      .innerJoin(events, eq(fieldEventSessions.eventId, events.id))
      .where(eq(events.meetId, meetId));
    
    const linkedSessions = sessionsWithEvents.map(r => r.session);
    
    // For EVT-based sessions without eventId, include all of them
    // (they aren't linked to a specific meet but are still valid)
    const evtSessions = await db
      .select()
      .from(fieldEventSessions)
      .where(isNull(fieldEventSessions.eventId));
    
    // Combine and deduplicate by ID
    const allSessions = [...linkedSessions, ...evtSessions];
    const uniqueSessions = allSessions.filter((session, index, self) => 
      index === self.findIndex(s => s.id === session.id)
    );
    
    return uniqueSessions;
  }

  async getFieldEventSession(id: number): Promise<FieldEventSession | null> {
    const [session] = await db.select().from(fieldEventSessions).where(eq(fieldEventSessions.id, id));
    return session || null;
  }

  async getFieldEventSessionByEvent(eventId: string): Promise<FieldEventSession | null> {
    const [session] = await db.select().from(fieldEventSessions).where(eq(fieldEventSessions.eventId, eventId));
    return session || null;
  }

  async getFieldEventSessionByAccessCode(code: string): Promise<FieldEventSession | null> {
    const [session] = await db.select().from(fieldEventSessions).where(eq(fieldEventSessions.accessCode, code));
    return session || null;
  }

  async createFieldEventSession(session: InsertFieldEventSession): Promise<FieldEventSession> {
    const [created] = await db.insert(fieldEventSessions).values(session).returning();
    return created;
  }

  async updateFieldEventSession(id: number, updates: Partial<InsertFieldEventSession>): Promise<FieldEventSession | null> {
    const [updated] = await db
      .update(fieldEventSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fieldEventSessions.id, id))
      .returning();
    return updated || null;
  }

  async deleteFieldEventSession(id: number): Promise<void> {
    await db.delete(fieldEventSessions).where(eq(fieldEventSessions.id, id));
  }

  async getFieldEventSessionWithDetails(id: number): Promise<FieldEventSessionWithDetails | null> {
    const session = await this.getFieldEventSession(id);
    if (!session) return null;

    const [event, heights, fieldAthletes, marks] = await Promise.all([
      session.eventId ? this.getEvent(session.eventId) : null,
      this.getFieldHeights(id),
      this.getFieldEventAthletes(id),
      this.getFieldEventMarks(id),
    ]);

    const athletesWithDetails = await Promise.all(
      fieldAthletes.map(async (fa) => {
        const entry = await this.getEntry(fa.entryId);
        const athlete = entry?.athlete || null;
        return { ...fa, entry: entry || undefined, athlete: athlete || undefined };
      })
    );

    return {
      ...session,
      event: event || undefined,
      heights,
      athletes: athletesWithDetails,
      marks,
    };
  }

  // Field Heights
  async getFieldHeights(sessionId: number): Promise<FieldHeight[]> {
    return db.select().from(fieldHeights).where(eq(fieldHeights.sessionId, sessionId));
  }

  async createFieldHeight(height: InsertFieldHeight): Promise<FieldHeight> {
    const [created] = await db.insert(fieldHeights).values(height).returning();
    return created;
  }

  async updateFieldHeight(id: number, updates: Partial<InsertFieldHeight>): Promise<FieldHeight | null> {
    const [updated] = await db
      .update(fieldHeights)
      .set(updates)
      .where(eq(fieldHeights.id, id))
      .returning();
    return updated || null;
  }

  async deleteFieldHeight(id: number): Promise<void> {
    await db.delete(fieldHeights).where(eq(fieldHeights.id, id));
  }

  async setFieldHeights(sessionId: number, heights: InsertFieldHeight[]): Promise<FieldHeight[]> {
    await db.delete(fieldHeights).where(eq(fieldHeights.sessionId, sessionId));
    if (heights.length === 0) return [];
    const created = await db.insert(fieldHeights).values(heights).returning();
    return created;
  }

  // Field Event Flights
  async getFieldEventFlights(sessionId: number): Promise<FieldEventFlight[]> {
    return db.select().from(fieldEventFlights).where(eq(fieldEventFlights.sessionId, sessionId));
  }

  async createFieldEventFlight(flight: InsertFieldEventFlight): Promise<FieldEventFlight> {
    const [created] = await db.insert(fieldEventFlights).values(flight).returning();
    return created;
  }

  async updateFieldEventFlight(id: number, updates: Partial<InsertFieldEventFlight>): Promise<FieldEventFlight | null> {
    const [updated] = await db
      .update(fieldEventFlights)
      .set(updates)
      .where(eq(fieldEventFlights.id, id))
      .returning();
    return updated || null;
  }

  // Field Event Athletes
  async getFieldEventAthletes(sessionId: number): Promise<FieldEventAthlete[]> {
    return db.select().from(fieldEventAthletes).where(eq(fieldEventAthletes.sessionId, sessionId));
  }

  async getFieldEventAthlete(id: number): Promise<FieldEventAthlete | null> {
    const [athlete] = await db.select().from(fieldEventAthletes).where(eq(fieldEventAthletes.id, id));
    return athlete || null;
  }

  async createFieldEventAthlete(athlete: InsertFieldEventAthlete): Promise<FieldEventAthlete> {
    const [created] = await db.insert(fieldEventAthletes).values(athlete).returning();
    return created;
  }

  async updateFieldEventAthlete(id: number, updates: Partial<InsertFieldEventAthlete>): Promise<FieldEventAthlete | null> {
    const [updated] = await db
      .update(fieldEventAthletes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fieldEventAthletes.id, id))
      .returning();
    return updated || null;
  }

  async deleteFieldEventAthlete(id: number): Promise<void> {
    await db.delete(fieldEventAthletes).where(eq(fieldEventAthletes.id, id));
  }

  async checkInFieldAthlete(id: number): Promise<FieldEventAthlete | null> {
    const [updated] = await db
      .update(fieldEventAthletes)
      .set({ checkInStatus: 'checked_in', checkedInAt: new Date(), updatedAt: new Date() })
      .where(eq(fieldEventAthletes.id, id))
      .returning();
    return updated || null;
  }

  async scratchFieldAthlete(id: number): Promise<FieldEventAthlete | null> {
    const [updated] = await db
      .update(fieldEventAthletes)
      .set({ checkInStatus: 'scratched', updatedAt: new Date() })
      .where(eq(fieldEventAthletes.id, id))
      .returning();
    return updated || null;
  }

  // Field Event Marks
  async getFieldEventMark(id: number): Promise<FieldEventMark | null> {
    const [mark] = await db.select().from(fieldEventMarks).where(eq(fieldEventMarks.id, id));
    return mark || null;
  }

  async getFieldEventMarks(sessionId: number): Promise<FieldEventMark[]> {
    return db.select().from(fieldEventMarks).where(eq(fieldEventMarks.sessionId, sessionId));
  }

  async getFieldEventMarksByAthlete(athleteId: number): Promise<FieldEventMark[]> {
    return db.select().from(fieldEventMarks).where(eq(fieldEventMarks.athleteId, athleteId));
  }

  async createFieldEventMark(mark: InsertFieldEventMark): Promise<FieldEventMark> {
    const [created] = await db.insert(fieldEventMarks).values(mark).returning();
    return created;
  }

  async updateFieldEventMark(id: number, updates: Partial<InsertFieldEventMark>): Promise<FieldEventMark | null> {
    const [updated] = await db
      .update(fieldEventMarks)
      .set(updates)
      .where(eq(fieldEventMarks.id, id))
      .returning();
    return updated || null;
  }

  async deleteFieldEventMark(id: number): Promise<void> {
    await db.delete(fieldEventMarks).where(eq(fieldEventMarks.id, id));
  }

  // External Scoreboards (in-memory)
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
}

// Storage factory - creates the appropriate storage based on environment
import { SQLiteStorage } from './storage/sqlite-adapter';

export type StorageMode = 'cloud' | 'edge';

export function getStorageMode(): StorageMode {
  return process.env.EDGE_MODE === 'true' ? 'edge' : 'cloud';
}

function createStorage(): IStorage {
  const mode = getStorageMode();
  
  if (mode === 'edge') {
    const dbPath = process.env.SQLITE_DB_PATH || './data/scoreboard.db';
    console.log(`🔄 Running in EDGE mode with SQLite database: ${dbPath}`);
    return new SQLiteStorage(dbPath);
  }
  
  console.log('☁️ Running in CLOUD mode with PostgreSQL database');
  return new DatabaseStorage();
}

export const storage = createStorage();

// Export the SQLite storage class for direct use in sync operations
export { SQLiteStorage };
