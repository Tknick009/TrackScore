#!/usr/bin/env npx tsx

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const testAthletes = [
  { lane: '1', bib: '101', name: 'John Smith', affiliation: 'Alabama', firstName: 'John', lastName: 'Smith' },
  { lane: '2', bib: '102', name: 'Mike Johnson', affiliation: 'Arizona', firstName: 'Mike', lastName: 'Johnson' },
  { lane: '3', bib: '103', name: 'David Williams', affiliation: 'Arkansas', firstName: 'David', lastName: 'Williams' },
  { lane: '4', bib: '104', name: 'James Brown', affiliation: 'Air Force', firstName: 'James', lastName: 'Brown' },
  { lane: '5', bib: '105', name: 'Robert Davis', affiliation: 'Army', firstName: 'Robert', lastName: 'Davis' },
  { lane: '6', bib: '106', name: 'William Miller', affiliation: 'Arizona St.', firstName: 'William', lastName: 'Miller' },
  { lane: '7', bib: '107', name: 'Richard Wilson', affiliation: 'Akron', firstName: 'Richard', lastName: 'Wilson' },
  { lane: '8', bib: '108', name: 'Joseph Moore', affiliation: 'Appalachian St.', firstName: 'Joseph', lastName: 'Moore' },
];

async function sendLynxData(data: string, portType: string) {
  const response = await fetch(`${BASE_URL}/api/lynx/forward`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data,
      portType,
      portName: 'Simulator'
    }),
  });
  const result = await response.json();
  console.log('Sent:', data.substring(0, 80) + (data.length > 80 ? '...' : ''));
  console.log('Response:', result);
}

async function sendStartList(eventNumber: number, heat: number, distance: string) {
  console.log(`\n=== Sending Start List: Event ${eventNumber}, Heat ${heat}, ${distance} ===\n`);
  
  for (const athlete of testAthletes) {
    const message = JSON.stringify({
      T: 'S',
      D: {
        EN: eventNumber,
        R: 1,
        H: heat,
        S: 'UNOFFICIAL',
        DS: distance,
        P: '',
        L: athlete.lane,
        BIB: athlete.bib,
        N: athlete.name,
        AF: athlete.affiliation,
        FN: athlete.firstName,
        LN: athlete.lastName,
      }
    });
    await sendLynxData(message, 'start_list');
    await new Promise(r => setTimeout(r, 100));
  }
}

async function sendRunningTime(timeMs: number) {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = ((timeMs % 60000) / 1000).toFixed(2);
  const timeStr = minutes > 0 ? `${minutes}:${seconds.padStart(5, '0')}` : seconds;
  
  const message = JSON.stringify({ t: timeStr });
  console.log(`Running time: ${timeStr}`);
  await sendLynxData(message, 'clock');
}

async function sendResults(eventNumber: number, heat: number, distance: string) {
  console.log(`\n=== Sending Results: Event ${eventNumber}, Heat ${heat} ===\n`);
  
  const times = ['10.23', '10.45', '10.67', '10.89', '11.01', '11.15', '11.32', '11.48'];
  
  for (let i = 0; i < testAthletes.length; i++) {
    const athlete = testAthletes[i];
    const message = JSON.stringify({
      T: 'F',
      D: {
        EN: eventNumber,
        R: 1,
        H: heat,
        S: 'OFFICIAL',
        DS: distance,
        P: String(i + 1),
        L: athlete.lane,
        BIB: athlete.bib,
        N: athlete.name,
        AF: athlete.affiliation,
        FN: athlete.firstName,
        LN: athlete.lastName,
        TM: times[i],
      }
    });
    await sendLynxData(message, 'results');
    await new Promise(r => setTimeout(r, 100));
  }
}

async function simulateRace(eventNumber: number, heat: number, distance: string, durationMs: number) {
  console.log(`\n🏃 Simulating ${distance}m race - Event ${eventNumber}, Heat ${heat}\n`);
  
  // Send start list
  await sendStartList(eventNumber, heat, distance);
  
  // Simulate running time
  console.log('\n=== Race Running ===\n');
  const startTime = Date.now();
  const interval = 500;
  
  while (Date.now() - startTime < durationMs) {
    const elapsed = Date.now() - startTime;
    await sendRunningTime(elapsed);
    await new Promise(r => setTimeout(r, interval));
  }
  
  // Send final results
  await sendResults(eventNumber, heat, distance);
  
  console.log('\n✅ Race simulation complete!\n');
}

const args = process.argv.slice(2);
const command = args[0] || 'race';

switch (command) {
  case 'startlist':
    sendStartList(
      parseInt(args[1] || '1'),
      parseInt(args[2] || '1'),
      args[3] || '100'
    );
    break;
  case 'results':
    sendResults(
      parseInt(args[1] || '1'),
      parseInt(args[2] || '1'),
      args[3] || '100'
    );
    break;
  case 'race':
    simulateRace(
      parseInt(args[1] || '1'),
      parseInt(args[2] || '1'),
      args[3] || '100',
      parseInt(args[4] || '10000')
    );
    break;
  default:
    console.log(`
Usage:
  npx tsx scripts/simulate-lynx.ts startlist [event] [heat] [distance]
  npx tsx scripts/simulate-lynx.ts results [event] [heat] [distance]
  npx tsx scripts/simulate-lynx.ts race [event] [heat] [distance] [duration_ms]

Examples:
  npx tsx scripts/simulate-lynx.ts startlist 1 1 100
  npx tsx scripts/simulate-lynx.ts race 1 1 100 10000
`);
}
