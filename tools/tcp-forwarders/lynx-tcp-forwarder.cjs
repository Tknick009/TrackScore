#!/usr/bin/env node

/**
 * FinishLynx Dual TCP-to-HTTP Forwarder
 * 
 * This script runs on the same computer as FinishLynx and:
 * 1. Listens for TCP race results on port 5555 (from FinishLynx)
 * 2. Listens for TCP clock data on port 5556 (from FinishLynx)
 * 3. Listens for TCP field results on port 5557 (from FieldLynx)
 * 4. Forwards all to your online scoring system via HTTP
 * 
 * Usage:
 *   node lynx-tcp-forwarder.cjs
 *   
 * Or on Windows:
 *   lynx-forwarder.bat
 */

const net = require('net');
const http = require('http');
const https = require('https');

// ========== CONFIGURATION ==========

// Your online scoring system BASE URL
// For local testing: http://localhost:5000
// For Replit: https://your-app.replit.app
const BASE_URL = process.env.FORWARD_URL || 'http://localhost:5000';

// Ports - matching FinishLynx scoreboard settings
const RESULTS_PORT = parseInt(process.env.RESULTS_PORT) || 5555;
const CLOCK_PORT = parseInt(process.env.CLOCK_PORT) || 5556;
const FIELD_PORT = parseInt(process.env.FIELD_PORT) || 5557;

// ====================================

console.log('==============================================');
console.log('  FinishLynx TCP-to-HTTP Forwarder');
console.log('==============================================');
console.log(`Results Port: ${RESULTS_PORT} → ${BASE_URL}/api/lynx/forward`);
console.log(`Clock Port:   ${CLOCK_PORT} → ${BASE_URL}/api/lynx/forward`);
console.log(`Field Port:   ${FIELD_PORT} → ${BASE_URL}/api/lynx/forward`);
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

// ========== FIELD SERVER (PORT 5557) ==========

const fieldServer = net.createServer((socket) => {
  console.log(`[${new Date().toLocaleTimeString()}] [FIELD] FieldLynx connected from ${socket.remoteAddress}`);
  
  let buffer = '';
  
  socket.on('data', (data) => {
    buffer += data.toString();
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    lines.forEach((line) => {
      if (line.trim()) {
        processFieldData(line.trim());
      }
    });
  });
  
  socket.on('end', () => {
    console.log(`[${new Date().toLocaleTimeString()}] [FIELD] FieldLynx disconnected`);
  });
  
  socket.on('error', (err) => {
    console.error('[FIELD] Socket error:', err.message);
  });
});

// ========== DATA PROCESSORS ==========

// Clean up FinishLynx formatting codes from JSON
function cleanLynxJson(line) {
  // Extract JSON from FinishLynx format
  const jsonMatch = line.match(/\{.*\}/);
  if (!jsonMatch) {
    return null;
  }
  
  // Clean up FinishLynx formatting codes
  let jsonString = jsonMatch[0].replace(/\\[A-Z][0-9]+/g, '');
  
  // Fix common JSON issues from FinishLynx split data
  jsonString = jsonString.replace(/\{\s*,/g, '{');
  jsonString = jsonString.replace(/\[\s*,/g, '[');
  jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
  jsonString = jsonString.replace(/:\s*,/g, ':null,');
  
  return jsonString;
}

// Process race results data from FinishLynx
function processResultsData(line) {
  try {
    const jsonString = cleanLynxJson(line);
    if (!jsonString) {
      // Forward non-JSON lines too - they may contain layout commands like:
      // Command=LayoutDraw;Name=Running;
      // Command=LayoutDraw;Name=Results;
      if (line.includes('Command=') || line.includes('LayoutDraw')) {
        console.log(`[${new Date().toLocaleTimeString()}] [RESULTS] Layout command: ${line.substring(0, 60)}...`);
        forwardToServer(line.trim(), 'results', 'FinishLynx Results');
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] [RESULTS] Non-JSON: ${line.substring(0, 50)}...`);
      }
      return;
    }
    
    // Forward to online server
    forwardToServer(jsonString, 'results', 'FinishLynx Results');
  } catch (err) {
    console.error('[RESULTS] Parse error:', err.message);
    console.error('[RESULTS] Raw line:', line.substring(0, 150));
  }
}

// Process clock data from FinishLynx
function processClockData(line) {
  try {
    const jsonString = cleanLynxJson(line);
    if (!jsonString) {
      // Clock data might be plain text time like "12:34.56"
      forwardToServer(line.trim(), 'clock', 'FinishLynx Clock');
      return;
    }
    
    // Forward JSON clock data
    forwardToServer(jsonString, 'clock', 'FinishLynx Clock');
  } catch (err) {
    console.error('[CLOCK] Parse error:', err.message);
  }
}

// Process field results data from FieldLynx
function processFieldData(line) {
  try {
    const jsonString = cleanLynxJson(line);
    if (!jsonString) {
      console.log(`[${new Date().toLocaleTimeString()}] [FIELD] Non-JSON: ${line.substring(0, 50)}...`);
      return;
    }
    
    // Forward to online server
    forwardToServer(jsonString, 'field', 'FieldLynx Results');
  } catch (err) {
    console.error('[FIELD] Parse error:', err.message);
    console.error('[FIELD] Raw line:', line.substring(0, 150));
  }
}

// ========== HTTP FORWARDER ==========

// Forward data to remote HTTP server
function forwardToServer(data, portType, portName) {
  const payload = JSON.stringify({
    data: data,
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
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        const preview = data.length > 60 ? data.substring(0, 60) + '...' : data;
        console.log(`[${new Date().toLocaleTimeString()}] [${portType.toUpperCase()}] ✓ Forwarded: ${preview}`);
      } else {
        console.error(`[${new Date().toLocaleTimeString()}] [${portType.toUpperCase()}] ✗ Server error ${res.statusCode}: ${responseData}`);
      }
    });
  });
  
  req.on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] [${portType.toUpperCase()}] ✗ Forward failed: ${err.message}`);
  });
  
  req.write(payload);
  req.end();
}

// ========== START SERVERS ==========

resultsServer.listen(RESULTS_PORT, '0.0.0.0', () => {
  console.log(`✓ Results forwarder ready on port ${RESULTS_PORT}`);
});

clockServer.listen(CLOCK_PORT, '0.0.0.0', () => {
  console.log(`✓ Clock forwarder ready on port ${CLOCK_PORT}`);
});

fieldServer.listen(FIELD_PORT, '0.0.0.0', () => {
  console.log(`✓ Field forwarder ready on port ${FIELD_PORT}`);
  console.log('');
});

// ========== SHUTDOWN HANDLING ==========

process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  resultsServer.close(() => {
    console.log('Results server closed');
    clockServer.close(() => {
      console.log('Clock server closed');
      fieldServer.close(() => {
        console.log('Field server closed');
        process.exit(0);
      });
    });
  });
});

// Handle errors
resultsServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${RESULTS_PORT} is already in use!`);
    console.error('Make sure nothing else is using this port.\n');
  } else {
    console.error('Results server error:', err.message);
  }
  process.exit(1);
});

clockServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${CLOCK_PORT} is already in use!`);
    console.error('Make sure nothing else is using this port.\n');
  } else {
    console.error('Clock server error:', err.message);
  }
  process.exit(1);
});

fieldServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${FIELD_PORT} is already in use!`);
    console.error('Make sure nothing else is using this port.\n');
  } else {
    console.error('Field server error:', err.message);
  }
  process.exit(1);
});
