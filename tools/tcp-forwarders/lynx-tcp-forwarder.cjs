#!/usr/bin/env node

/**
 * Track & Field Lynx TCP-to-HTTP Forwarder
 * 
 * This script runs on the same computer as FinishLynx/FieldLynx and:
 * 1. Listens for TCP clock data on port 5056 (from FinishLynx)
 * 2. Listens for TCP track results on port 5055 (from FinishLynx)
 * 3. Listens for TCP field results on port 5057 (from FieldLynx)
 * 4. Forwards all data to your online scoring system via HTTP
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

// Your online scoring system URL
// For local testing: http://localhost:5000
// For Replit: https://your-app.replit.app
const BASE_URL = process.env.FORWARD_URL || 'http://localhost:5000';

// Local ports to listen on (these should match your FinishLynx/FieldLynx output settings)
const CLOCK_PORT = parseInt(process.env.CLOCK_PORT) || 5056;
const RESULTS_PORT = parseInt(process.env.RESULTS_PORT) || 5055;
const FIELD_PORT = parseInt(process.env.FIELD_PORT) || 5057;

// ====================================

console.log('==============================================');
console.log('  Track & Field Lynx TCP-to-HTTP Forwarder');
console.log('==============================================');
console.log(`Clock Port:   ${CLOCK_PORT} → ${BASE_URL}/api/lynx/forward (clock)`);
console.log(`Results Port: ${RESULTS_PORT} → ${BASE_URL}/api/lynx/forward (results)`);
console.log(`Field Port:   ${FIELD_PORT} → ${BASE_URL}/api/lynx/forward (field)`);
console.log('');
console.log('Waiting for FinishLynx/FieldLynx connections...');
console.log('==============================================');
console.log('');

// Parse the base URL
const baseUrl = new URL(BASE_URL);
const isHttps = baseUrl.protocol === 'https:';
const httpModule = isHttps ? https : http;

// Connection tracking
const connections = {
  clock: { connected: false, lastData: null },
  results: { connected: false, lastData: null },
  field: { connected: false, lastData: null }
};

// ========== CLOCK SERVER (PORT 5056) ==========

const clockServer = net.createServer((socket) => {
  const clientAddr = socket.remoteAddress;
  console.log(`[${timestamp()}] [CLOCK] FinishLynx connected from ${clientAddr}`);
  connections.clock.connected = true;
  
  let buffer = '';
  
  socket.on('data', (data) => {
    buffer += data.toString();
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    lines.forEach((line) => {
      if (line.trim()) {
        forwardData(line.trim(), 'clock', 'FinishLynx Clock');
      }
    });
  });
  
  socket.on('end', () => {
    console.log(`[${timestamp()}] [CLOCK] FinishLynx disconnected`);
    connections.clock.connected = false;
  });
  
  socket.on('error', (err) => {
    console.error('[CLOCK] Socket error:', err.message);
    connections.clock.connected = false;
  });
});

// ========== RESULTS SERVER (PORT 5055) ==========

const resultsServer = net.createServer((socket) => {
  const clientAddr = socket.remoteAddress;
  console.log(`[${timestamp()}] [RESULTS] FinishLynx connected from ${clientAddr}`);
  connections.results.connected = true;
  
  let buffer = '';
  
  socket.on('data', (data) => {
    buffer += data.toString();
    
    // Handle JSON objects that might span multiple chunks
    const { complete, remaining } = extractCompleteData(buffer);
    buffer = remaining;
    
    complete.forEach((item) => {
      if (item.trim()) {
        forwardData(item.trim(), 'results', 'FinishLynx Results');
      }
    });
  });
  
  socket.on('end', () => {
    console.log(`[${timestamp()}] [RESULTS] FinishLynx disconnected`);
    connections.results.connected = false;
  });
  
  socket.on('error', (err) => {
    console.error('[RESULTS] Socket error:', err.message);
    connections.results.connected = false;
  });
});

// ========== FIELD SERVER (PORT 5057) ==========

const fieldServer = net.createServer((socket) => {
  const clientAddr = socket.remoteAddress;
  console.log(`[${timestamp()}] [FIELD] FieldLynx connected from ${clientAddr}`);
  connections.field.connected = true;
  
  let buffer = '';
  
  socket.on('data', (data) => {
    buffer += data.toString();
    
    // Handle JSON objects that might span multiple chunks
    const { complete, remaining } = extractCompleteData(buffer);
    buffer = remaining;
    
    complete.forEach((item) => {
      if (item.trim()) {
        forwardData(item.trim(), 'field', 'FieldLynx Results');
      }
    });
  });
  
  socket.on('end', () => {
    console.log(`[${timestamp()}] [FIELD] FieldLynx disconnected`);
    connections.field.connected = false;
  });
  
  socket.on('error', (err) => {
    console.error('[FIELD] Socket error:', err.message);
    connections.field.connected = false;
  });
});

// ========== HELPER FUNCTIONS ==========

function timestamp() {
  return new Date().toLocaleTimeString();
}

// Extract complete JSON objects or newline-delimited data
function extractCompleteData(buffer) {
  const complete = [];
  let remaining = buffer;
  
  // First, try to extract complete JSON objects
  while (remaining.length > 0) {
    const startIdx = remaining.indexOf('{');
    
    if (startIdx === -1) {
      // No JSON, split by newlines
      const lines = remaining.split(/\r?\n/);
      remaining = lines.pop() || '';
      complete.push(...lines.filter(l => l.trim()));
      break;
    }
    
    // Handle any content before the JSON
    if (startIdx > 0) {
      const preContent = remaining.slice(0, startIdx);
      const lines = preContent.split(/\r?\n/).filter(l => l.trim());
      complete.push(...lines);
      remaining = remaining.slice(startIdx);
    }
    
    // Find matching closing brace
    let braceDepth = 0;
    let endIdx = -1;
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < remaining.length; i++) {
      const char = remaining[i];
      
      if (escape) {
        escape = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escape = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          braceDepth++;
        } else if (char === '}') {
          braceDepth--;
          if (braceDepth === 0) {
            endIdx = i;
            break;
          }
        }
      }
    }
    
    if (endIdx !== -1) {
      const jsonStr = remaining.slice(0, endIdx + 1);
      complete.push(jsonStr);
      remaining = remaining.slice(endIdx + 1).replace(/^[\r\n]+/, '');
    } else {
      // Incomplete JSON, keep in buffer
      break;
    }
  }
  
  return { complete, remaining };
}

// Clean up FinishLynx formatting codes from JSON
function cleanLynxData(data) {
  // Remove FinishLynx formatting codes like \A1, \B2, etc.
  let cleaned = data.replace(/\\[A-Z][0-9]+/g, '');
  
  // Fix common JSON issues
  cleaned = cleaned.replace(/\{\s*,/g, '{');
  cleaned = cleaned.replace(/\[\s*,/g, '[');
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  cleaned = cleaned.replace(/:\s*,/g, ':null,');
  
  return cleaned;
}

// ========== HTTP FORWARDER ==========

function forwardData(data, portType, portName) {
  // Clean the data
  const cleanedData = cleanLynxData(data);
  
  const payload = JSON.stringify({
    data: cleanedData,
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
      connections[portType].lastData = new Date();
      
      if (res.statusCode === 200) {
        const preview = cleanedData.length > 50 ? cleanedData.substring(0, 50) + '...' : cleanedData;
        console.log(`[${timestamp()}] [${portType.toUpperCase()}] ✓ ${preview}`);
      } else {
        console.error(`[${timestamp()}] [${portType.toUpperCase()}] ✗ Server error ${res.statusCode}: ${responseData}`);
      }
    });
  });
  
  req.on('error', (err) => {
    console.error(`[${timestamp()}] [${portType.toUpperCase()}] ✗ Forward failed: ${err.message}`);
  });
  
  req.write(payload);
  req.end();
}

// ========== START SERVERS ==========

clockServer.listen(CLOCK_PORT, '0.0.0.0', () => {
  console.log(`✓ Clock forwarder ready on port ${CLOCK_PORT}`);
});

resultsServer.listen(RESULTS_PORT, '0.0.0.0', () => {
  console.log(`✓ Results forwarder ready on port ${RESULTS_PORT}`);
});

fieldServer.listen(FIELD_PORT, '0.0.0.0', () => {
  console.log(`✓ Field forwarder ready on port ${FIELD_PORT}`);
  console.log('');
});

// ========== STATUS DISPLAY ==========

setInterval(() => {
  const status = Object.entries(connections).map(([type, info]) => {
    const connected = info.connected ? '●' : '○';
    return `${type}: ${connected}`;
  }).join(' | ');
  
  // Only show status if there's activity
  const hasConnection = Object.values(connections).some(c => c.connected);
  if (hasConnection) {
    process.stdout.write(`\r[Status] ${status}   `);
  }
}, 5000);

// ========== SHUTDOWN HANDLING ==========

process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  clockServer.close(() => {
    console.log('Clock server closed');
    resultsServer.close(() => {
      console.log('Results server closed');
      fieldServer.close(() => {
        console.log('Field server closed');
        process.exit(0);
      });
    });
  });
});

// Handle errors
clockServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${CLOCK_PORT} is already in use!`);
    console.error('Make sure nothing else is using this port.\n');
  } else {
    console.error('Clock server error:', err.message);
  }
});

resultsServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${RESULTS_PORT} is already in use!`);
    console.error('Make sure nothing else is using this port.\n');
  } else {
    console.error('Results server error:', err.message);
  }
});

fieldServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${FIELD_PORT} is already in use!`);
    console.error('Make sure nothing else is using this port.\n');
  } else {
    console.error('Field server error:', err.message);
  }
});
