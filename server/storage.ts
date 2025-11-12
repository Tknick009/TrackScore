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
} from "@shared/schema";
import { randomUUID } from "crypto";

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

  // Combined
  getEventWithResults(eventId: string): Promise<EventWithResults | undefined>;
}

export class MemStorage implements IStorage {
  private events: Map<string, Event>;
  private athletes: Map<string, Athlete>;
  private trackResults: Map<string, TrackResult>;
  private fieldResults: Map<string, FieldResult>;
  private meets: Map<string, Meet>;

  constructor() {
    this.events = new Map();
    this.athletes = new Map();
    this.trackResults = new Map();
    this.fieldResults = new Map();
    this.meets = new Map();
  }

  // Events
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getCurrentEvent(): Promise<EventWithResults | undefined> {
    const events = Array.from(this.events.values());
    
    // Priority: in_progress > scheduled > completed
    let currentEvent = events.find((e) => e.status === "in_progress");
    if (!currentEvent) {
      currentEvent = events.find((e) => e.status === "scheduled");
    }
    if (!currentEvent) {
      const completedEvents = events.filter((e) => e.status === "completed");
      currentEvent = completedEvents[completedEvents.length - 1]; // Most recent completed
    }

    if (!currentEvent) {
      return undefined;
    }

    return this.getEventWithResults(currentEvent.id);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = { 
      ...insertEvent, 
      id,
      startTime: insertEvent.startTime || null,
      windReading: insertEvent.windReading || null,
    };
    this.events.set(id, event);
    return event;
  }

  async updateEventStatus(id: string, status: string): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) {
      return undefined;
    }
    const updated = { ...event, status };
    this.events.set(id, updated);
    return updated;
  }

  // Athletes
  async getAthletes(): Promise<Athlete[]> {
    return Array.from(this.athletes.values());
  }

  async getAthlete(id: string): Promise<Athlete | undefined> {
    return this.athletes.get(id);
  }

  async createAthlete(insertAthlete: InsertAthlete): Promise<Athlete> {
    const id = randomUUID();
    const athlete: Athlete = { 
      ...insertAthlete, 
      id,
      team: insertAthlete.team || null,
      country: insertAthlete.country || null,
    };
    this.athletes.set(id, athlete);
    return athlete;
  }

  // Track Results
  async getTrackResults(): Promise<TrackResult[]> {
    return Array.from(this.trackResults.values());
  }

  async getTrackResultsByEvent(eventId: string): Promise<TrackResult[]> {
    return Array.from(this.trackResults.values()).filter(
      (result) => result.eventId === eventId
    );
  }

  async createTrackResult(insertResult: InsertTrackResult): Promise<TrackResult> {
    const id = randomUUID();
    const result: TrackResult = { 
      ...insertResult, 
      id,
      lane: insertResult.lane || null,
      time: insertResult.time || null,
      position: insertResult.position || null,
      reaction: insertResult.reaction || null,
      isDisqualified: insertResult.isDisqualified || false,
      notes: insertResult.notes || null,
    };
    this.trackResults.set(id, result);
    return result;
  }

  // Field Results
  async getFieldResults(): Promise<FieldResult[]> {
    return Array.from(this.fieldResults.values());
  }

  async getFieldResultsByEvent(eventId: string): Promise<FieldResult[]> {
    return Array.from(this.fieldResults.values()).filter(
      (result) => result.eventId === eventId
    );
  }

  async createFieldResult(insertResult: InsertFieldResult): Promise<FieldResult> {
    const id = randomUUID();
    const result: FieldResult = { 
      ...insertResult, 
      id,
      attempt1: insertResult.attempt1 || null,
      attempt2: insertResult.attempt2 || null,
      attempt3: insertResult.attempt3 || null,
      attempt4: insertResult.attempt4 || null,
      attempt5: insertResult.attempt5 || null,
      attempt6: insertResult.attempt6 || null,
      bestMark: insertResult.bestMark || null,
      position: insertResult.position || null,
      isDisqualified: insertResult.isDisqualified || false,
      notes: insertResult.notes || null,
    };
    this.fieldResults.set(id, result);
    return result;
  }

  // Meets
  async getMeets(): Promise<Meet[]> {
    return Array.from(this.meets.values());
  }

  async getMeet(id: string): Promise<Meet | undefined> {
    return this.meets.get(id);
  }

  async createMeet(insertMeet: InsertMeet): Promise<Meet> {
    const id = randomUUID();
    const meet: Meet = { 
      ...insertMeet, 
      id,
      location: insertMeet.location || null,
      logoUrl: insertMeet.logoUrl || null,
    };
    this.meets.set(id, meet);
    return meet;
  }

  // Combined
  async getEventWithResults(eventId: string): Promise<EventWithResults | undefined> {
    const event = this.events.get(eventId);
    if (!event) {
      return undefined;
    }

    const trackResults = await this.getTrackResultsByEvent(eventId);
    const fieldResults = await this.getFieldResultsByEvent(eventId);

    const results: AthleteResult[] = [];

    // Combine track results
    for (const trackResult of trackResults) {
      const athlete = this.athletes.get(trackResult.athleteId);
      if (athlete) {
        results.push({
          athlete,
          trackResult,
        });
      }
    }

    // Combine field results
    for (const fieldResult of fieldResults) {
      const athlete = this.athletes.get(fieldResult.athleteId);
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

export const storage = new MemStorage();
