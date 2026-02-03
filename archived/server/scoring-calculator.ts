import crypto from "crypto";
import type { IStorage } from "./storage";
import type {
  Entry,
  PresetRule,
  ScoringPreset,
  MeetScoringProfile,
  MeetScoringOverride,
  InsertTeamScoringResult,
  TeamStandingsEntry,
} from "@shared/schema";

export class ScoringCalculator {
  /**
   * Calculate and persist team scoring for a meet
   */
  async calculateMeetScoring(meetId: string, storage: IStorage): Promise<void> {
    // 1. Load meet scoring profile
    const profile = await storage.getMeetScoringProfile(meetId);
    if (!profile) {
      throw new Error(`No scoring profile found for meet ${meetId}`);
    }

    // 2. Load preset rules
    const presetRules = await storage.getPresetRules(profile.presetId);
    if (presetRules.length === 0) {
      throw new Error(`No scoring rules found for preset ${profile.presetId}`);
    }

    // 3. Load event-specific overrides
    const overrides = await storage.getMeetScoringOverrides(profile.id);
    const overridesMap = new Map<string, MeetScoringOverride>();
    overrides.forEach((override) => {
      overridesMap.set(override.eventId, override);
    });

    // 4. Fetch all events for this meet
    const events = await storage.getEventsByMeetId(meetId);

    // 5. Fetch all entries with results
    const allEntries: Entry[] = [];
    for (const event of events) {
      const entries = await storage.getEntriesByEvent(event.id);
      allEntries.push(...entries);
    }

    // 6. Filter to entries with final places and teams
    const scorableEntries = allEntries.filter(
      (entry) =>
        entry.finalPlace !== null &&
        entry.finalPlace !== undefined &&
        entry.teamId !== null &&
        !entry.isDisqualified &&
        !entry.isScratched
    );

    // 7. Calculate checksum to detect changes
    const newChecksum = this.computeChecksum(scorableEntries);
    const scoringState = await storage.getMeetScoringState(profile.id);
    if (scoringState && scoringState.checksum === newChecksum) {
      // No changes, skip recalculation
      return;
    }

    // 8. Calculate points for each entry
    const entryPoints = new Map<string, number>();
    for (const entry of scorableEntries) {
      const event = events.find((e) => e.id === entry.eventId);
      if (!event) continue;

      const isRelay = this.isRelayEvent(event.eventType);
      const override = overridesMap.get(event.id);

      let points = 0;
      if (override && override.pointsMap) {
        // Use event-specific override
        points = override.pointsMap[entry.finalPlace!] || 0;
        if (isRelay && override.relayMultiplier) {
          points *= override.relayMultiplier;
        }
      } else {
        // Use preset rules
        points = this.getPointsForPlace(entry.finalPlace!, presetRules, isRelay, profile);
      }

      entryPoints.set(entry.id, points);

      // Update entry with scored points
      await storage.updateEntry(entry.id, {
        scoredPoints: points,
        scoringStatus: "finalized",
      });
    }

    // 9. Aggregate points by team (and optionally by gender/division)
    const teamAggregates = new Map<string, Map<string, number>>();

    for (const entry of scorableEntries) {
      const event = events.find((e) => e.id === entry.eventId);
      if (!event || !entry.teamId) continue;

      const points = entryPoints.get(entry.id) || 0;
      const key = this.getAggregationKey(entry, event, profile);

      if (!teamAggregates.has(entry.teamId)) {
        teamAggregates.set(entry.teamId, new Map());
      }

      const teamMap = teamAggregates.get(entry.teamId)!;
      teamMap.set(key, (teamMap.get(key) || 0) + points);
    }

    // 10. Clear existing team scoring results for this profile
    await storage.clearTeamScoringResults(profile.id);

    // 11. Persist aggregated results
    for (const [teamId, aggregates] of teamAggregates) {
      for (const [key, totalPoints] of aggregates) {
        const { gender, division } = this.parseAggregationKey(key);

        // Build event breakdown
        const eventBreakdown = this.buildEventBreakdown(
          scorableEntries.filter((e) => e.teamId === teamId),
          events,
          entryPoints,
          gender,
          division,
          profile
        );

        const result: InsertTeamScoringResult = {
          profileId: profile.id,
          teamId,
          eventId: null,
          gender: gender || null,
          division: division || null,
          pointsAwarded: totalPoints,
          eventBreakdown,
          tieBreakData: null,
        };

        await storage.createTeamScoringResult(result);
      }
    }

    // 12. Update scoring state
    await storage.updateMeetScoringState(profile.id, {
      lastComputedAt: new Date(),
      checksum: newChecksum,
    });
  }

  /**
   * Get points for a specific place based on preset rules
   */
  private getPointsForPlace(
    place: number,
    rules: PresetRule[],
    isRelay: boolean,
    profile: MeetScoringProfile
  ): number {
    // Check if relay scoring is disabled
    if (isRelay && !profile.allowRelayScoring) {
      return 0;
    }

    // Find matching rule (check relay override first, then regular)
    const relayRule = rules.find((r) => r.place === place && r.isRelayOverride && isRelay);
    if (relayRule) {
      return relayRule.points;
    }

    const regularRule = rules.find((r) => r.place === place && !r.isRelayOverride);
    if (!regularRule) {
      return 0; // No points for this place
    }

    return regularRule.points;
  }

  /**
   * Check if an event is a relay event
   */
  private isRelayEvent(eventType: string): boolean {
    return eventType === "4x100m" || eventType === "4x400m";
  }

  /**
   * Compute checksum from entries to detect changes
   */
  private computeChecksum(entries: Entry[]): string {
    // Create deterministic string from entry data
    const data = entries
      .map((e) => `${e.id}:${e.finalPlace}:${e.teamId}:${e.isDisqualified}:${e.isScratched}`)
      .sort()
      .join("|");

    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Get aggregation key based on gender/division modes
   */
  private getAggregationKey(entry: Entry, event: any, profile: MeetScoringProfile): string {
    const parts: string[] = [];

    if (profile.genderMode === "separate") {
      parts.push(`gender:${event.gender || "unknown"}`);
    }

    if (profile.divisionMode === "by_division" && entry.divisionId) {
      parts.push(`division:${entry.divisionId}`);
    }

    return parts.length > 0 ? parts.join("|") : "overall";
  }

  /**
   * Parse aggregation key back to gender/division
   */
  private parseAggregationKey(key: string): { gender?: string; division?: string } {
    if (key === "overall") {
      return {};
    }

    const parts = key.split("|");
    const result: { gender?: string; division?: string } = {};

    for (const part of parts) {
      const [type, value] = part.split(":");
      if (type === "gender") {
        result.gender = value;
      } else if (type === "division") {
        result.division = value;
      }
    }

    return result;
  }

  /**
   * Build event breakdown for a team
   */
  private buildEventBreakdown(
    teamEntries: Entry[],
    events: any[],
    entryPoints: Map<string, number>,
    gender: string | undefined,
    division: string | undefined,
    profile: MeetScoringProfile
  ): any[] {
    const eventMap = new Map<string, any>();

    for (const entry of teamEntries) {
      const event = events.find((e) => e.id === entry.eventId);
      if (!event) continue;

      // Filter by gender/division if needed
      if (profile.genderMode === "separate" && gender && event.gender !== gender) {
        continue;
      }

      if (profile.divisionMode === "by_division" && division && entry.divisionId !== division) {
        continue;
      }

      const points = entryPoints.get(entry.id) || 0;
      if (points === 0) continue;

      if (!eventMap.has(event.id)) {
        eventMap.set(event.id, {
          eventId: event.id,
          eventName: event.name,
          points: 0,
          athletes: [],
        });
      }

      const eventData = eventMap.get(event.id);
      eventData.points += points;
      eventData.athletes.push({
        athleteId: entry.athleteId,
        name: "Athlete", // Would need to fetch athlete name
        place: entry.finalPlace!,
        points,
      });
    }

    return Array.from(eventMap.values());
  }
}

/**
 * Seed default scoring presets
 */
export async function seedScoringPresets(storage: IStorage): Promise<void> {
  const existingPresets = await storage.getScoringPresets();
  if (existingPresets.length > 0) {
    // Already seeded
    return;
  }

  // Dual Meet: 5-3-1
  const dualMeet = await storage.createScoringPreset({
    name: "Dual Meet",
    category: "dual",
    defaultRelayMultiplier: 1.0,
    allowRelayScoring: true,
    description: "Standard dual meet scoring: 5 points for 1st, 3 for 2nd, 1 for 3rd",
  });

  await storage.createPresetRule({ presetId: dualMeet.id, place: 1, points: 5, isRelayOverride: false });
  await storage.createPresetRule({ presetId: dualMeet.id, place: 2, points: 3, isRelayOverride: false });
  await storage.createPresetRule({ presetId: dualMeet.id, place: 3, points: 1, isRelayOverride: false });

  // Invitational: 10-8-6-5-4-3-2-1
  const invitational = await storage.createScoringPreset({
    name: "Invitational",
    category: "invitational",
    defaultRelayMultiplier: 1.0,
    allowRelayScoring: true,
    description: "Invitational meet scoring: 10-8-6-5-4-3-2-1 for top 8 places",
  });

  const invitationalPoints = [10, 8, 6, 5, 4, 3, 2, 1];
  for (let i = 0; i < invitationalPoints.length; i++) {
    await storage.createPresetRule({
      presetId: invitational.id,
      place: i + 1,
      points: invitationalPoints[i],
      isRelayOverride: false,
    });
  }

  // Championship: 10-8-6-5-4-3-2-1-1-1 (top 10)
  const championship = await storage.createScoringPreset({
    name: "Championship",
    category: "championship",
    defaultRelayMultiplier: 1.0,
    allowRelayScoring: true,
    description: "Championship meet scoring: 10-8-6-5-4-3-2-1-1-1 for top 10 places",
  });

  const championshipPoints = [10, 8, 6, 5, 4, 3, 2, 1, 1, 1];
  for (let i = 0; i < championshipPoints.length; i++) {
    await storage.createPresetRule({
      presetId: championship.id,
      place: i + 1,
      points: championshipPoints[i],
      isRelayOverride: false,
    });
  }
}
