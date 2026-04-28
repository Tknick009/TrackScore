import { readFileSync, writeFileSync } from "fs";
import MDBReader from "mdb-reader";

/**
 * Diagnostic script to analyze event scheduling and session relationships
 * Investigates why only 6 out of 56 events have session times
 */

interface Session {
  Sess_no: number;
  Sess_ptr: number;
  Sess_name: string;
  Sess_starttime: number;
  Sess_day: number;
}

interface Event {
  Event_no: number;
  Event_ptr: number;
  Event_dist: number;
  Event_sex: string;
  CCracestart_time: any;
  Fin_time: any;
  Comm_1: string;
  Event_stroke: string;
  Ind_rel: string;
}

function formatTime(timeValue: any): string {
  if (timeValue === null || timeValue === undefined) {
    return "NULL";
  }
  if (typeof timeValue === 'number') {
    // HyTek stores time as fractional days, convert to HH:MM format
    const hours = Math.floor(timeValue * 24);
    const minutes = Math.floor((timeValue * 24 * 60) % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  if (timeValue instanceof Date) {
    return timeValue.toLocaleTimeString();
  }
  return String(timeValue);
}

async function diagnoseEventScheduling(filePath: string) {
  console.log('🔍 Event Scheduling Diagnostic');
  console.log('='.repeat(80));
  console.log(`Analyzing file: ${filePath}\n`);

  const buffer = readFileSync(filePath);
  const reader = new MDBReader(buffer);

  // Read Session table
  console.log('\n📅 SESSION TABLE ANALYSIS');
  console.log('='.repeat(80));
  
  const sessionTable = reader.getTable('Session');
  const sessions = sessionTable.getData() as Session[];
  
  console.log(`Total sessions: ${sessions.length}\n`);
  
  // Display all sessions
  const sessionMap = new Map<number, Session>();
  sessions.forEach((session, index) => {
    sessionMap.set(session.Sess_ptr, session);
    console.log(`Session ${index + 1}:`);
    console.log(`  Sess_ptr: ${session.Sess_ptr}`);
    console.log(`  Sess_name: ${session.Sess_name}`);
    console.log(`  Sess_starttime: ${formatTime(session.Sess_starttime)}`);
    console.log(`  Sess_day: ${session.Sess_day}`);
    console.log();
  });

  // Read Event table
  console.log('\n🏃 EVENT TABLE ANALYSIS');
  console.log('='.repeat(80));
  
  const eventTable = reader.getTable('Event');
  const events = eventTable.getData() as Event[];
  
  console.log(`Total events: ${events.length}\n`);

  // Analyze each event
  let eventsWithSession = 0;
  let eventsWithIndividualTiming = 0;
  let eventsWithNoTiming = 0;

  events.forEach((event, index) => {
    const matchingSession = sessionMap.get(event.Event_ptr);
    const hasMatch = matchingSession !== undefined;
    
    console.log(`\nEvent ${index + 1}:`);
    console.log(`  Event_no: ${event.Event_no}`);
    console.log(`  Event_ptr: ${event.Event_ptr}`);
    console.log(`  Event_dist: ${event.Event_dist}${event.Event_stroke ? ` (${event.Event_stroke})` : ''}`);
    console.log(`  Event_sex: ${event.Event_sex}`);
    console.log(`  Type: ${event.Ind_rel === 'I' ? 'Individual' : 'Relay'}`);
    
    if (hasMatch) {
      console.log(`  ✅ MATCHES SESSION: Sess_ptr ${event.Event_ptr}`);
      console.log(`     Session Name: ${matchingSession.Sess_name}`);
      console.log(`     Session Time: ${formatTime(matchingSession.Sess_starttime)}`);
      console.log(`     Session Day: ${matchingSession.Sess_day}`);
      eventsWithSession++;
    } else {
      console.log(`  ❌ NO SESSION MATCH (Event_ptr ${event.Event_ptr} not found in Session table)`);
      console.log(`     Individual Timing Fields:`);
      console.log(`       CCracestart_time: ${formatTime(event.CCracestart_time)}`);
      console.log(`       Fin_time: ${formatTime(event.Fin_time)}`);
      console.log(`       Comm_1: ${event.Comm_1 || '(empty)'}`);
      
      // Check if event has individual timing
      const hasIndividualTiming = 
        (event.CCracestart_time !== null && event.CCracestart_time !== undefined) ||
        (event.Fin_time !== null && event.Fin_time !== undefined);
      
      if (hasIndividualTiming) {
        eventsWithIndividualTiming++;
      } else {
        eventsWithNoTiming++;
      }
    }
  });

  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Events: ${events.length}`);
  console.log(`Total Sessions: ${sessions.length}`);
  console.log();
  console.log(`Events with Session Match: ${eventsWithSession} (${(eventsWithSession/events.length*100).toFixed(1)}%)`);
  console.log(`Events with Individual Timing: ${eventsWithIndividualTiming} (${(eventsWithIndividualTiming/events.length*100).toFixed(1)}%)`);
  console.log(`Events with NO Timing: ${eventsWithNoTiming} (${(eventsWithNoTiming/events.length*100).toFixed(1)}%)`);
  console.log();

  // Analysis of Event_ptr distribution
  console.log('\n🔍 EVENT_PTR DISTRIBUTION');
  console.log('='.repeat(80));
  
  const eventPtrCounts = new Map<number, number>();
  events.forEach(event => {
    const count = eventPtrCounts.get(event.Event_ptr) || 0;
    eventPtrCounts.set(event.Event_ptr, count + 1);
  });

  console.log('Event_ptr values and their frequency:');
  const sortedPtrs = Array.from(eventPtrCounts.entries()).sort((a, b) => a[0] - b[0]);
  sortedPtrs.forEach(([ptr, count]) => {
    const session = sessionMap.get(ptr);
    if (session) {
      console.log(`  Event_ptr ${ptr}: ${count} events → ✅ Session "${session.Sess_name}"`);
    } else {
      console.log(`  Event_ptr ${ptr}: ${count} events → ❌ NO SESSION`);
    }
  });

  console.log('\n\n💡 FINDINGS');
  console.log('='.repeat(80));
  console.log(`1. Only ${eventsWithSession} out of ${events.length} events are linked to sessions`);
  console.log(`2. Session table has ${sessions.length} sessions with Sess_ptr values: ${Array.from(sessionMap.keys()).join(', ')}`);
  console.log(`3. Events use Event_ptr values: ${Array.from(eventPtrCounts.keys()).sort((a,b) => a-b).join(', ')}`);
  console.log(`4. Events without session matches should use their individual timing fields`);
  console.log(`   (CCracestart_time, Fin_time) or be assigned to appropriate sessions.`);
  console.log('\n' + '='.repeat(80));
}

const filePath = process.argv[2] || "uploads/8df8ab1108ac242e04c7ee9bcdc28bf1";

// Run the diagnostic
diagnoseEventScheduling(filePath)
  .then(() => {
    console.log('\n✅ Diagnostic complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
