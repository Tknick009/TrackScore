import {
  type Event,
  type InsertEvent,
  type Athlete,
  type InsertAthlete,
  type TrackResult,
  type InsertTrackResult,
  type FieldResult,
  type InsertFieldResult,
  type Meet,
  type InsertMeet,
  type EventWithResults,
  type AthleteResult,
  type SplitTime,
  type InsertSplitTime,
  events,
  athletes,
  trackResults,
  fieldResults,
  meets,
  splitTimes,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getCurrentEvent(): Promise<EventWithResults | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEventStatus(id: string, status: string): Promise<Event | undefined>;

  // Athletes
  getAthletes(): Promise<Athlete[]>;
  getAthlete(id: string): Promise<Athlete | undefined>;
  createAthlete(athlete: InsertAthlete): Promise<Athlete>;

  // Track Results
  getTrackResults(): Promise<TrackResult[]>;
  getTrackResultsByEvent(eventId: string): Promise<TrackResult[]>;
  createTrackResult(result: InsertTrackResult): Promise<TrackResult>;

  // Field Results
  getFieldResults(): Promise<FieldResult[]>;
  getFieldResultsByEvent(eventId: string): Promise<FieldResult[]>;
  createFieldResult(result: InsertFieldResult): Promise<FieldResult>;

  // Meets
  getMeets(): Promise<Meet[]>;
  getMeet(id: string): Promise<Meet | undefined>;
  createMeet(meet: InsertMeet): Promise<Meet>;

  // Split Times
  getSplitTimesByTrackResult(trackResultId: string): Promise<SplitTime[]>;
  createSplitTime(splitTime: InsertSplitTime): Promise<SplitTime>;

  // Combined
  getEventWithResults(eventId: string): Promise<EventWithResults | undefined>;
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

  async getCurrentEvent(): Promise<EventWithResults | undefined> {
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

    return this.getEventWithResults(currentEvent.id);
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

  // Track Results
  async getTrackResults(): Promise<TrackResult[]> {
    return db.select().from(trackResults);
  }

  async getTrackResultsByEvent(eventId: string): Promise<TrackResult[]> {
    return db
      .select()
      .from(trackResults)
      .where(eq(trackResults.eventId, eventId));
  }

  async createTrackResult(insertResult: InsertTrackResult): Promise<TrackResult> {
    const [result] = await db
      .insert(trackResults)
      .values(insertResult)
      .returning();
    return result;
  }

  // Field Results
  async getFieldResults(): Promise<FieldResult[]> {
    return db.select().from(fieldResults);
  }

  async getFieldResultsByEvent(eventId: string): Promise<FieldResult[]> {
    return db
      .select()
      .from(fieldResults)
      .where(eq(fieldResults.eventId, eventId));
  }

  async createFieldResult(insertResult: InsertFieldResult): Promise<FieldResult> {
    const [result] = await db
      .insert(fieldResults)
      .values(insertResult)
      .returning();
    return result;
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

  // Split Times
  async getSplitTimesByTrackResult(trackResultId: string): Promise<SplitTime[]> {
    return db
      .select()
      .from(splitTimes)
      .where(eq(splitTimes.trackResultId, trackResultId))
      .orderBy(splitTimes.lapNumber);
  }

  async createSplitTime(insertSplitTime: InsertSplitTime): Promise<SplitTime> {
    const [splitTime] = await db
      .insert(splitTimes)
      .values(insertSplitTime)
      .returning();
    return splitTime;
  }

  // Combined
  async getEventWithResults(eventId: string): Promise<EventWithResults | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      return undefined;
    }

    const trackResultsData = await this.getTrackResultsByEvent(eventId);
    const fieldResultsData = await this.getFieldResultsByEvent(eventId);

    const results: AthleteResult[] = [];

    // Combine track results with splits
    for (const trackResult of trackResultsData) {
      const [athlete] = await db
        .select()
        .from(athletes)
        .where(eq(athletes.id, trackResult.athleteId));
      if (athlete) {
        const splits = await this.getSplitTimesByTrackResult(trackResult.id);
        results.push({
          athlete,
          trackResult,
          splitTimes: splits,
        });
      }
    }

    // Combine field results
    for (const fieldResult of fieldResultsData) {
      const [athlete] = await db
        .select()
        .from(athletes)
        .where(eq(athletes.id, fieldResult.athleteId));
      if (athlete) {
        results.push({
          athlete,
          fieldResult,
        });
      }
    }

    return {
      ...event,
      results,
    };
  }
}

export const storage = new DatabaseStorage();
