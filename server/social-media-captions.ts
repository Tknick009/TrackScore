import type { Event, MedalStanding } from "@shared/schema";

export function generateEventResultCaption(
  event: Event,
  results: Array<{
    athleteName: string;
    teamName?: string;
    finalTime?: string;
    finalMark?: string;
    finalPlace?: number;
  }>,
  meetName: string
): string {
  const winner = results.find(r => r.finalPlace === 1);
  if (!winner) return "";
  
  const performance = winner.finalTime || winner.finalMark || "";
  const teamText = winner.teamName ? ` (${winner.teamName})` : "";
  
  return `🏆 ${event.name} Results - ${meetName}

🥇 ${winner.athleteName}${teamText} - ${performance}
${results[1] ? `🥈 ${results[1].athleteName}${results[1].teamName ? ` (${results[1].teamName})` : ""} - ${results[1].finalTime || results[1].finalMark}` : ""}
${results[2] ? `🥉 ${results[2].athleteName}${results[2].teamName ? ` (${results[2].teamName})` : ""} - ${results[2].finalTime || results[2].finalMark}` : ""}

#TrackAndField #${event.eventType.replace(/\s+/g, '')}`;
}

export function generateRecordBrokenCaption(
  athleteName: string,
  eventName: string,
  newRecord: string,
  oldRecord: string,
  meetName: string
): string {
  return `🚨 NEW MEET RECORD! 🚨

${athleteName} just broke the ${eventName} record at ${meetName}!

New Record: ${newRecord}
Previous: ${oldRecord}

#MeetRecord #TrackAndField #Athletics`;
}

export function generateMedalCountCaption(
  standings: MedalStanding[],
  meetName: string
): string {
  const top3 = standings.slice(0, 3);
  
  return `🏅 Medal Count Update - ${meetName}

${top3.map((team, idx) => `${idx + 1}. ${team.teamName} - 🥇${team.gold} 🥈${team.silver} 🥉${team.bronze}`).join('\n')}

#TrackAndField #MedalCount`;
}

export function generateMeetHighlightCaption(
  meetName: string,
  location: string,
  eventCount: number,
  athleteCount: number
): string {
  return `📍 ${meetName} | ${location}

${eventCount} events featuring ${athleteCount} athletes competing today!

Follow along for live results and updates!

#TrackAndField #Athletics #TrackMeet`;
}
