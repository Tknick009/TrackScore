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
  events,
  athletes,
  entries,
  meets,
  teams,
  divisions,
  entrySplits,
  displayComputers,
  displayAssignments,
  displayThemes,
  boardConfigs,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, not } from "drizzle-orm";

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
  createAthlete(athlete: InsertAthlete): Promise<Athlete>;

  // Entries (unified results for track and field)
  getEntries(): Promise<Entry[]>;
  getEntriesByEvent(eventId: string): Promise<Entry[]>;
  getEntriesWithDetails(eventId: string): Promise<EntryWithDetails[]>;
  createEntry(entry: InsertEntry): Promise<Entry>;
  updateEntry(id: string, updates: Partial<InsertEntry>): Promise<Entry | undefined>;

  // Meets
  getMeets(): Promise<Meet[]>;
  getMeet(id: string): Promise<Meet | undefined>;
  createMeet(meet: InsertMeet): Promise<Meet>;
  updateMeet(id: string, data: Partial<InsertMeet>): Promise<Meet | null>;

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

  // Meets
  async getMeets(): Promise<Meet[]> {
    return db.select().from(meets);
  }

  async getMeet(id: string): Promise<Meet | undefined> {
    const [meet] = await db.select().from(meets).where(eq(meets.id, id));
    return meet || undefined;
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
}

export const storage = new DatabaseStorage();
