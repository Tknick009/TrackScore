#!/usr/bin/env node

/**
 * FinishLynx Test Data Sender
 * 
 * Sends simulated FinishLynx timing data to test the scoreboard system.
 * 
 * Usage:
 *   node test-lynx-sender.cjs [mode]
 * 
 * Modes:
 *   clock     - Send running clock updates
 *   results   - Send track results
 *   startlist - Send start list
 *   field     - Send field event results
 *   full      - Run full race simulation (default)
 *   all       - Send all types of test data
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.FORWARD_URL || 'http://localhost:5000';
const baseUrl = new URL(BASE_URL);
const isHttps = baseUrl.protocol === 'https:';
const httpModule = isHttps ? https : http;

const mode = process.argv[2] || 'full';

console.log('==============================================');
console.log('  FinishLynx Test Data Sender');
console.log('==============================================');
console.log(`Target: ${BASE_URL}/api/lynx/forward`);
console.log(`Mode: ${mode}`);
console.log('==============================================\n');

// Sample athlete data
const athletes = [
  { lane: 1, bib: '101', firstName: 'Marcus', lastName: 'Johnson', affiliation: 'State U' },
  { lane: 2, bib: '205', firstName: 'David', lastName: 'Williams', affiliation: 'Tech' },
  { lane: 3, bib: '312', firstName: 'James', lastName: 'Brown', affiliation: 'Central' },
  { lane: 4, bib: '418', firstName: 'Michael', lastName: 'Davis', affiliation: 'Northern' },
  { lane: 5, bib: '524', firstName: 'Chris', lastName: 'Miller', affiliation: 'Southern' },
  { lane: 6, bib: '631', firstName: 'Andre', lastName: 'Wilson', affiliation: 'Eastern' },
  { lane: 7, bib: '742', firstName: 'Tyler', lastName: 'Moore', affiliation: 'Western' },
  { lane: 8, bib: '855', firstName: 'Brandon', lastName: 'Taylor', affiliation: 'Coastal' },
];

const fieldAthletes = [
  { bib: '201', firstName: 'Sarah', lastName: 'Anderson', affiliation: 'State U' },
  { bib: '202', firstName: 'Emily', lastName: 'Thomas', affiliation: 'Tech' },
  { bib: '203', firstName: 'Jessica', lastName: 'Jackson', affiliation: 'Central' },
  { bib: '204', firstName: 'Ashley', lastName: 'White', affiliation: 'Northern' },
  { bib: '205', firstName: 'Amanda', lastName: 'Harris', affiliation: 'Southern' },
  { bib: '206', firstName: 'Megan', lastName: 'Martin', affiliation: 'Eastern' },
];

// Forward data to the server
function forwardData(data, portType, portName = 'Test Sender') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      data: typeof data === 'object' ? JSON.stringify(data) : data,
      portType: portType,
      portName: portName
    });

    const options = {
      hostname: baseUrl.hostname,
      port: baseUrl.port || (isHttps ? 443 : 80),
      path: '/api/lynx/forward',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = httpModule.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[${portType.toUpperCase()}] Sent successfully`);
          resolve(responseData);
        } else {
          console.error(`[${portType.toUpperCase()}] Error ${res.statusCode}: ${responseData}`);
          reject(new Error(responseData));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[${portType.toUpperCase()}] Failed: ${err.message}`);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

// Generate start list JSON (S message)
function generateStartList(eventNumber = 1, heat = 1) {
  const entries = athletes.map(a => ({
    lane: String(a.lane),
    bib: a.bib,
    firstName: a.firstName,
    lastName: a.lastName,
    name: `${a.lastName}, ${a.firstName}`,
    affiliation: a.affiliation,
  }));

  return {
    type: 'S',
    eventNumber: eventNumber,
    heat: heat,
    round: 1,
    distance: '100m',
    entries: entries
  };
}

// Generate track results JSON (T message)
function generateTrackResults(eventNumber = 1, heat = 1, wind = '+1.2') {
  const baseTimes = [10.21, 10.35, 10.42, 10.58, 10.67, 10.89, 11.02, 11.15];
  
  const results = athletes.map((a, i) => ({
    place: String(i + 1),
    lane: String(a.lane),
    bib: a.bib,
    firstName: a.firstName,
    lastName: a.lastName,
    name: `${a.lastName}, ${a.firstName}`,
    affiliation: a.affiliation,
    time: baseTimes[i].toFixed(2),
    reactionTime: (0.12 + Math.random() * 0.08).toFixed(3),
  }));

  return {
    type: 'T',
    eventNumber: eventNumber,
    heat: heat,
    round: 1,
    wind: wind,
    status: 'Final',
    results: results
  };
}

// Generate field results JSON (F message)
function generateFieldResults(eventNumber = 10, flight = 1) {
  const baseMarks = ['5.85', '5.72', '5.68', '5.55', '5.42', '5.31'];
  const allAttempts = [
    ['5.45', '5.62', '5.85'],
    ['5.55', '5.72', 'X'],
    ['5.68', 'X', 'P'],
    ['5.42', '5.55', 'X'],
    ['5.42', 'X', 'X'],
    ['5.31', 'X', 'X'],
  ];

  const results = fieldAthletes.map((a, i) => ({
    place: String(i + 1),
    bib: a.bib,
    firstName: a.firstName,
    lastName: a.lastName,
    name: `${a.lastName}, ${a.firstName}`,
    affiliation: a.affiliation,
    bestMark: baseMarks[i],
    mark: baseMarks[i],
    wind: i < 3 ? '+0.8' : '+1.1',
    attemptNumber: '3',
    attempts: allAttempts[i].join(' | '),
    attemptMarks: allAttempts[i],
  }));

  return {
    type: 'F',
    eventNumber: eventNumber,
    flight: flight,
    round: 1,
    results: results
  };
}

// Generate clock update
function generateClockUpdate(timeMs) {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const hundredths = Math.floor((timeMs % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
}

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Run modes
async function runClockMode() {
  console.log('Sending clock updates (Ctrl+C to stop)...\n');
  let timeMs = 0;
  
  while (true) {
    const timeStr = generateClockUpdate(timeMs);
    await forwardData(timeStr, 'clock', 'Test Clock');
    console.log(`  Clock: ${timeStr}`);
    await sleep(100);
    timeMs += 100;
  }
}

async function runStartListMode() {
  console.log('Sending start list...\n');
  const startList = generateStartList(1, 1);
  console.log('Start List:', JSON.stringify(startList, null, 2));
  await forwardData(startList, 'results', 'Test StartList');
}

async function runResultsMode() {
  console.log('Sending track results...\n');
  const results = generateTrackResults(1, 1, '+1.5');
  console.log('Results:', JSON.stringify(results, null, 2));
  await forwardData(results, 'results', 'Test Results');
}

async function runFieldMode() {
  console.log('Sending field results...\n');
  const results = generateFieldResults(10, 1);
  console.log('Field Results:', JSON.stringify(results, null, 2));
  await forwardData(results, 'field', 'Test Field');
}

async function runFullSimulation() {
  console.log('Running full race simulation...\n');
  
  // 1. Send start list
  console.log('Step 1: Broadcasting start list...');
  const startList = generateStartList(1, 1);
  await forwardData(startList, 'results', 'FinishLynx');
  await sleep(1000);
  
  // 2. Countdown
  console.log('\nStep 2: Pre-race countdown...');
  for (let i = 3; i > 0; i--) {
    console.log(`  ${i}...`);
    await sleep(1000);
  }
  
  // 3. Running clock
  console.log('\nStep 3: Race in progress (clock running)...');
  let timeMs = 0;
  const raceTime = 11500; // 11.5 seconds for 100m
  
  while (timeMs < raceTime) {
    const timeStr = generateClockUpdate(timeMs);
    await forwardData(timeStr, 'clock', 'FinishLynx Clock');
    process.stdout.write(`\r  Clock: ${timeStr}   `);
    await sleep(100);
    timeMs += 100;
  }
  console.log('\n');
  
  // 4. Final results
  console.log('Step 4: Broadcasting final results...');
  const results = generateTrackResults(1, 1, '+1.8');
  await forwardData(results, 'results', 'FinishLynx');
  
  console.log('\nSimulation complete!');
  console.log('Check your display board to see the results.');
}

async function runAllMode() {
  console.log('Sending all test data types...\n');
  
  await runStartListMode();
  console.log('');
  await sleep(500);
  
  await runResultsMode();
  console.log('');
  await sleep(500);
  
  await runFieldMode();
  console.log('\nAll test data sent!');
}

// Main
async function main() {
  try {
    switch (mode) {
      case 'clock':
        await runClockMode();
        break;
      case 'startlist':
        await runStartListMode();
        break;
      case 'results':
        await runResultsMode();
        break;
      case 'field':
        await runFieldMode();
        break;
      case 'full':
        await runFullSimulation();
        break;
      case 'all':
        await runAllMode();
        break;
      default:
        console.log('Unknown mode. Use: clock, startlist, results, field, full, all');
        process.exit(1);
    }
  } catch (error) {
    console.error('\nError:', error.message);
    console.error('Make sure the server is running at', BASE_URL);
    process.exit(1);
  }
}

main();
