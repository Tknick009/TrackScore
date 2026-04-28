import type { Express } from "express";
import { storage } from "../storage";
import type { RouteContext } from "../route-context";

export function registerPublicRoutes(app: Express, ctx: RouteContext) {
  const { fileStorage } = ctx;

  // ===== PUBLIC SPECTATOR API =====

  // Get current meet (public info only)
  app.get("/api/public/current-meet", async (req, res) => {
    try {
      const meets = await storage.getMeets();
      // Prefer in_progress meet, then upcoming, then most recent
      const currentMeet = meets.find(m => m.status === 'in_progress') 
                       || meets.find(m => m.status === 'upcoming')
                       || (meets.length > 0 ? meets[0] : null);
      
      if (!currentMeet) {
        return res.status(404).json({ error: "No active meet" });
      }
      
      res.json({
        id: currentMeet.id,
        name: currentMeet.name,
        startDate: currentMeet.startDate,
        endDate: currentMeet.endDate,
        location: currentMeet.location
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get events for spectator view
  app.get("/api/public/meets/:meetId/events", async (req, res) => {
    try {
      const events = await storage.getEventsByMeetId(req.params.meetId);
      
      const publicEvents = events.map(e => ({
        id: e.id,
        name: e.name,
        eventType: e.eventType,
        gender: e.gender,
        status: e.status,
        eventTime: e.eventTime
      }));
      
      res.json(publicEvents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get event results (with athlete info)
  app.get("/api/public/events/:eventId/results", async (req, res) => {
    try {
      const event = await storage.getEventWithEntries(req.params.eventId);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const results = event.entries.map(entry => ({
        id: entry.id,
        athleteName: entry.athlete ? `${entry.athlete.firstName} ${entry.athlete.lastName}` : "Unknown",
        athleteId: entry.athlete?.id,
        teamName: entry.team?.name,
        bibNumber: entry.athlete?.bibNumber,
        finalPlace: entry.finalPlace,
        finalMark: entry.finalMark
      })).sort((a, b) => (a.finalPlace || 999) - (b.finalPlace || 999));
      
      res.json({
        event: {
          id: event.id,
          name: event.name,
          eventType: event.eventType,
          status: event.status
        },
        results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get team standings split by gender with logo URLs
  app.get("/api/public/meets/:meetId/team-standings", async (req, res) => {
    try {
      const meetId = req.params.meetId;
      const [menStandings, womenStandings] = await Promise.all([
        storage.getTeamStandings(meetId, { gender: "M" }),
        storage.getTeamStandings(meetId, { gender: "W" }),
      ]);

      res.json({
        men: menStandings,
        women: womenStandings,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get medal standings
  app.get("/api/public/meets/:meetId/medal-standings", async (req, res) => {
    try {
      const standings = await storage.getMedalStandings(req.params.meetId);
      res.json(standings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get athletes (public info only)
  app.get("/api/public/meets/:meetId/athletes", async (req, res) => {
    try {
      const athletes = await storage.getAthletesByMeetId(req.params.meetId);
      
      const publicAthletes = await Promise.all(athletes.map(async (a) => {
        const team = a.teamId ? await storage.getTeam(a.teamId) : null;
        return {
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          bibNumber: a.bibNumber,
          teamId: a.teamId,
          teamName: team?.name
        };
      }));
      
      res.json(publicAthletes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single athlete details
  app.get("/api/public/athletes/:athleteId", async (req, res) => {
    try {
      const athlete = await storage.getAthlete(req.params.athleteId);
      
      if (!athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      
      let photoUrl = null;
      try {
        const photo = await storage.getAthletePhoto(athlete.id);
        if (photo?.storageKey) {
          photoUrl = fileStorage.publicUrlForKey(photo.storageKey);
        }
      } catch (e) {
        // Photo not available
      }
      
      const team = athlete.teamId ? await storage.getTeam(athlete.teamId) : null;
      
      res.json({
        id: athlete.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        bibNumber: athlete.bibNumber,
        teamName: team?.name,
        photoUrl
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

}
