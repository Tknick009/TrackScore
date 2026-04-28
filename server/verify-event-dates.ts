import { db } from './db';
import { meets, events } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import MDBReader from 'mdb-reader';

async function verifyEventDates() {
  const meet = await db.query.meets.findFirst({
    where: eq(meets.name, 'Meet A')
  });

  if (!meet) {
    console.log('No meet found');
    return;
  }

  // Read MDB file to get Session data
  const filePath = 'uploads/430802951cacecbf1106726c4a9a9ec2';
  const buffer = readFileSync(filePath);
  const reader = new MDBReader(buffer);
  const sessionTable = reader.getTable('Session');
  const sessionData = sessionTable.getData();
  
  console.log('📋 Session Information:');
  sessionData.forEach((session) => {
    console.log(`   Sess_ptr: ${session.Sess_ptr} | Day: ${session.Sess_day} | Name: ${session.Sess_name}`);
  });

  console.log('\nMeet Start Date:', meet.startDate?.toISOString().split('T')[0] || 'N/A');
  console.log('\n📅 Events by Session Day:\n');

  const eventsList = await db.query.events.findMany({
    where: eq(events.meetId, meet.id),
    limit: 20,
    orderBy: (events, { asc }) => [asc(events.eventNumber)]
  });

  const uniqueDates = new Set<string>();
  const dateGroups: { [key: string]: number } = {};
  
  eventsList.forEach(event => {
    const dateStr = event.eventDate ? event.eventDate.toISOString().split('T')[0] : 'N/A';
    uniqueDates.add(dateStr);
    dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
    console.log(`Event #${event.eventNumber.toString().padStart(2, ' ')}: ${event.name.padEnd(35, ' ')} | Date: ${dateStr}`);
  });
  
  console.log('\n✅ Verification Summary:');
  console.log(`   Total events checked: ${eventsList.length}`);
  console.log(`   Unique dates found: ${uniqueDates.size}`);
  console.log(`   Date distribution:`);
  Object.entries(dateGroups).forEach(([date, count]) => {
    console.log(`     ${date}: ${count} events`);
  });
  
  if (uniqueDates.size > 1) {
    console.log('\n✅ SUCCESS: Events have different dates based on their sessions!');
  } else {
    console.log('\n⚠️  WARNING: All events have the same date.');
  }
}

verifyEventDates().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
