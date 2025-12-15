#!/usr/bin/env node

/**
 * FinishLynx Dual TCP-to-HTTP Forwarder
 * 
 * This script runs on the same computer as FinishLynx and:
 * 1. Listens for TCP race results on port 5555 (from FinishLynx)
 * 2. Listens for TCP clock data on port 5556 (from FinishLynx)
 * 3. Forwards both to your online scoring system via HTTP
 * 
 * Usage:
 *   node tcp-forwarder.cjs
 *   
 * Or on Windows:
 *   tcp-forwarder.bat
 */

const net = require('net');
const http = require('http');
const https = require('https');

// ========== CONFIGURATION ==========

// Your online scoring system BASE URL (without the /api/... path)
// For local testing: http://localhost:4001
// For Replit: https://your-app.replit.app
// For your server: http://your-domain.com:4001
const BASE_URL = 'http://localhost:4001';

// Ports
const RESULTS_PORT = 5555;  // FinishLynx race results
const CLOCK_PORT = 5556;    // FinishLynx clock data

// ====================================

console.log('==============================================');
console.log('  FinishLynx Dual TCP-to-HTTP Forwarder');
console.log('==============================================');
console.log(`Results Port: ${RESULTS_PORT} → ${BASE_URL}/api/timing-data`);
console.log(`Clock Port:   ${CLOCK_PORT} → ${BASE_URL}/api/clock-data`);
console.log('');
console.log('Waiting for FinishLynx connections...');
console.log('==============================================');
console.log('');

// Parse the base URL
const baseUrl = new URL(BASE_URL);
const isHttps = baseUrl.protocol === 'https:';
const httpModule = isHttps ? https : http;

// ========== RESULTS SERVER (PORT 5555) ==========

const resultsServer = net.createServer((socket) => {
  console.log(`[${new Date().toLocaleTimeString()}] [RESULTS] FinishLynx connected from ${socket.remoteAddress}`);
  
  let buffer = '';
  
  socket.on('data', (data) => {
    buffer += data.toString();
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    lines.forEach((line) => {
      if (line.trim()) {
        processResultsData(line.trim());
      }
    });
  });
  
  socket.on('end', () => {
    console.log(`[${new Date().toLocaleTimeString()}] [RESULTS] FinishLynx disconnected`);
  });
  
  socket.on('error', (err) => {
    console.error('[RESULTS] Socket error:', err.message);
  });
});

// ========== CLOCK SERVER (PORT 5556) ==========

const clockServer = net.createServer((socket) => {
  console.log(`[${new Date().toLocaleTimeString()}] [CLOCK] FinishLynx connected from ${socket.remoteAddress}`);
  
  let buffer = '';
  
  socket.on('data', (data) => {
    buffer += data.toString();
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    lines.forEach((line) => {
      if (line.trim()) {
        processClockData(line.trim());
      }
    });
  });
  
  socket.on('end', () => {
    console.log(`[${new Date().toLocaleTimeString()}] [CLOCK] FinishLynx disconnected`);
  });
  
  socket.on('error', (err) => {
    console.error('[CLOCK] Socket error:', err.message);
  });
});

// ========== DATA PROCESSORS ==========

// Process race results data from FinishLynx
function processResultsData(line) {
  let jsonString = '';
  try {
    // Extract JSON from FinishLynx format
    const jsonMatch = line.match(/\{.*\}/);
    if (!jsonMatch) {
      console.log(`[${new Date().toLocaleTimeString()}] [RESULTS] Non-JSON: ${line.substring(0, 50)}...`);
      return;
    }
    
    // Clean up FinishLynx formatting codes
    jsonString = jsonMatch[0].replace(/\\[A-Z][0-9]+/g, '');
    
    // Fix common JSON issues from FinishLynx split data
    // Fix opening brace followed by comma: {, -> {
    jsonString = jsonString.replace(/\{\s*,/g, '{');
    // Fix opening bracket followed by comma: [, -> [
    jsonString = jsonString.replace(/\[\s*,/g, '[');
    // Remove trailing commas before closing braces/brackets
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    // Remove empty property values that might cause issues
    jsonString = jsonString.replace(/:\s*,/g, ':null,');
    
    const resultsData = JSON.parse(jsonString);
    
    // Forward to online server
    forwardToServer('/api/timing-data', resultsData, 'RESULTS');
  } catch (err) {
    console.error('[RESULTS] Parse error:', err.message);
    console.error('[RESULTS] Raw line:', line.substring(0, 150));
    console.error('[RESULTS] Attempted JSON:', jsonString.substring(0, 150));
  }
}

// Process clock data from FinishLynx
function processClockData(line) {
  try {
    // Extract JSON from FinishLynx format
    const jsonMatch = line.match(/\{.*\}/);
    if (!jsonMatch) {
      console.log(`[${new Date().toLocaleTimeString()}] [CLOCK] Non-JSON: ${line.substring(0, 50)}...`);
      return;
    }
    
    // Clean up FinishLynx formatting codes
    let jsonString = jsonMatch[0].replace(/\\[A-Z][0-9]+/g, '');
    const clockData = JSON.parse(jsonString);
    
    // Support both formats: {t: "time", c: "command"} or {time: "time"}
    let timeValue = clockData.time || clockData.t;
    
    // Handle armed state
    if (clockData.c === 'armed') {
      timeValue = '0';
    }
    
    if (timeValue) {
      // Forward to online server
      forwardToServer('/api/clock-data', { time: timeValue }, 'CLOCK');
    }
  } catch (err) {
    console.error('[CLOCK] Parse error:', err.message);
  }
}

// ========== HTTP FORWARDER ==========

// Forward data to remote HTTP server
function forwardToServer(path, data, label) {
  const payload = JSON.stringify(data);
  
  const options = {
    hostname: baseUrl.hostname,
    port: baseUrl.port || (isHttps ? 443 : 80),
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  
  const req = httpModule.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        const preview = payload.length > 60 ? payload.substring(0, 60) + '...' : payload;
        console.log(`[${new Date().toLocaleTimeString()}] [${label}] ✓ Forwarded: ${preview}`);
      } else {
        console.error(`[${new Date().toLocaleTimeString()}] [${label}] ✗ Server error ${res.statusCode}: ${responseData}`);
      }
    });
  });
  
  req.on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] [${label}] ✗ Forward failed: ${err.message}`);
  });
  
  req.write(payload);
  req.end();
}

// ========== START SERVERS ==========

// Start results server
resultsServer.listen(RESULTS_PORT, '0.0.0.0', () => {
  console.log(`✓ Results forwarder ready on port ${RESULTS_PORT}`);
});

// Start clock server
clockServer.listen(CLOCK_PORT, '0.0.0.0', () => {
  console.log(`✓ Clock forwarder ready on port ${CLOCK_PORT}`);
  console.log('');
});

// ========== SHUTDOWN HANDLING ==========

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  resultsServer.close(() => {
    console.log('Results server closed');
    clockServer.close(() => {
      console.log('Clock server closed');
      process.exit(0);
    });
  });
});

// Handle errors
resultsServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${RESULTS_PORT} is already in use!`);
    console.error('Make sure the main scoring app is NOT running on this computer.\n');
  } else {
    console.error('Results server error:', err.message);
  }
  process.exit(1);
});

clockServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${CLOCK_PORT} is already in use!`);
    console.error('Make sure the main scoring app is NOT running on this computer.\n');
  } else {
    console.error('Clock server error:', err.message);
  }
  process.exit(1);
});
