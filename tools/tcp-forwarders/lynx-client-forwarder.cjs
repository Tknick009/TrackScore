#!/usr/bin/env node

/**
 * Track & Field Lynx TCP Client Forwarder
 * 
 * This version CONNECTS TO FinishLynx/FieldLynx (when they're in "accept" mode)
 * instead of waiting for them to connect.
 * 
 * Use this when FinishLynx is configured with "Network (accept)" 
 * instead of "Network (connect)"
 * 
 * Usage:
 *   node lynx-client-forwarder.cjs
 */

const net = require('net');
const http = require('http');
const https = require('https');

// ========== CONFIGURATION ==========

// Your online scoring system URL
const BASE_URL = process.env.FORWARD_URL || 'http://localhost:5000';

// FinishLynx/FieldLynx IP address (where they're running)
const LYNX_HOST = process.env.LYNX_HOST || '127.0.0.1';

// Ports that FinishLynx is listening on (in accept mode)
const CLOCK_PORT = parseInt(process.env.CLOCK_PORT) || 5056;
const RESULTS_PORT = parseInt(process.env.RESULTS_PORT) || 5055;
const FIELD_PORT = parseInt(process.env.FIELD_PORT) || 5057;

// Reconnection settings
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_DELAY = 30000; // 30 seconds max

// ====================================

console.log('==============================================');
console.log('  Lynx TCP Client Forwarder (Connect Mode)');
console.log('==============================================');
console.log(`Connecting TO FinishLynx at: ${LYNX_HOST}`);
console.log(`  Clock:   ${LYNX_HOST}:${CLOCK_PORT}`);
console.log(`  Results: ${LYNX_HOST}:${RESULTS_PORT}`);
console.log(`  Field:   ${LYNX_HOST}:${FIELD_PORT}`);
console.log(`Forwarding to: ${BASE_URL}/api/lynx/forward`);
console.log('==============================================\n');

const baseUrl = new URL(BASE_URL);
const isHttps = baseUrl.protocol === 'https:';
const httpModule = isHttps ? https : http;

// Connection state
const connections = {
  clock: { socket: null, connected: false, reconnectDelay: RECONNECT_DELAY },
  results: { socket: null, connected: false, reconnectDelay: RECONNECT_DELAY },
  field: { socket: null, connected: false, reconnectDelay: RECONNECT_DELAY }
};

function timestamp() {
  return new Date().toLocaleTimeString();
}

// Clean FinishLynx formatting codes
function cleanLynxData(data) {
  let cleaned = data.replace(/\\[A-Z][0-9]+/g, '');
  cleaned = cleaned.replace(/\{\s*,/g, '{');
  cleaned = cleaned.replace(/\[\s*,/g, '[');
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  cleaned = cleaned.replace(/:\s*,/g, ':null,');
  return cleaned;
}

// Forward data via HTTP
function forwardData(data, portType, portName) {
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
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const preview = cleanedData.length > 60 ? cleanedData.substring(0, 60) + '...' : cleanedData;
        console.log(`[${timestamp()}] [${portType.toUpperCase()}] ✓ ${preview}`);
      } else {
        console.error(`[${timestamp()}] [${portType.toUpperCase()}] ✗ Error ${res.statusCode}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[${timestamp()}] [${portType.toUpperCase()}] ✗ Forward failed: ${err.message}`);
  });

  req.write(payload);
  req.end();
}

// Extract complete JSON objects or lines
function extractCompleteData(buffer) {
  const complete = [];
  let remaining = buffer;

  while (remaining.length > 0) {
    const startIdx = remaining.indexOf('{');
    
    if (startIdx === -1) {
      const lines = remaining.split(/\r?\n/);
      remaining = lines.pop() || '';
      complete.push(...lines.filter(l => l.trim()));
      break;
    }

    if (startIdx > 0) {
      const preContent = remaining.slice(0, startIdx);
      const lines = preContent.split(/\r?\n/).filter(l => l.trim());
      complete.push(...lines);
      remaining = remaining.slice(startIdx);
    }

    let braceDepth = 0;
    let endIdx = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < remaining.length; i++) {
      const char = remaining[i];
      if (escape) { escape = false; continue; }
      if (char === '\\' && inString) { escape = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (!inString) {
        if (char === '{') braceDepth++;
        else if (char === '}') {
          braceDepth--;
          if (braceDepth === 0) { endIdx = i; break; }
        }
      }
    }

    if (endIdx !== -1) {
      complete.push(remaining.slice(0, endIdx + 1));
      remaining = remaining.slice(endIdx + 1).replace(/^[\r\n]+/, '');
    } else {
      break;
    }
  }

  return { complete, remaining };
}

// Connect to a FinishLynx port
function connectToLynx(portType, host, port, portName) {
  const conn = connections[portType];
  
  console.log(`[${timestamp()}] [${portType.toUpperCase()}] Connecting to ${host}:${port}...`);
  
  const socket = new net.Socket();
  conn.socket = socket;
  
  let buffer = '';

  socket.connect(port, host, () => {
    console.log(`[${timestamp()}] [${portType.toUpperCase()}] ✓ Connected to FinishLynx`);
    conn.connected = true;
    conn.reconnectDelay = RECONNECT_DELAY; // Reset delay on success
  });

  socket.on('data', (data) => {
    buffer += data.toString();
    const { complete, remaining } = extractCompleteData(buffer);
    buffer = remaining;
    
    complete.forEach((item) => {
      if (item.trim()) {
        forwardData(item.trim(), portType, portName);
      }
    });
  });

  socket.on('close', () => {
    console.log(`[${timestamp()}] [${portType.toUpperCase()}] Connection closed`);
    conn.connected = false;
    scheduleReconnect(portType, host, port, portName);
  });

  socket.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.log(`[${timestamp()}] [${portType.toUpperCase()}] FinishLynx not ready (connection refused)`);
    } else {
      console.error(`[${timestamp()}] [${portType.toUpperCase()}] Error: ${err.message}`);
    }
    conn.connected = false;
  });
}

// Schedule reconnection with exponential backoff
function scheduleReconnect(portType, host, port, portName) {
  const conn = connections[portType];
  
  console.log(`[${timestamp()}] [${portType.toUpperCase()}] Reconnecting in ${conn.reconnectDelay / 1000}s...`);
  
  setTimeout(() => {
    connectToLynx(portType, host, port, portName);
  }, conn.reconnectDelay);
  
  // Exponential backoff
  conn.reconnectDelay = Math.min(conn.reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
}

// Start all connections
console.log('Connecting to FinishLynx/FieldLynx...\n');

connectToLynx('clock', LYNX_HOST, CLOCK_PORT, 'FinishLynx Clock');
connectToLynx('results', LYNX_HOST, RESULTS_PORT, 'FinishLynx Results');
connectToLynx('field', LYNX_HOST, FIELD_PORT, 'FieldLynx Results');

// Status display
setInterval(() => {
  const status = Object.entries(connections).map(([type, info]) => {
    return `${type}: ${info.connected ? '●' : '○'}`;
  }).join(' | ');
  
  const anyConnected = Object.values(connections).some(c => c.connected);
  if (anyConnected) {
    process.stdout.write(`\r[Status] ${status}   `);
  }
}, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  Object.values(connections).forEach(conn => {
    if (conn.socket) conn.socket.destroy();
  });
  process.exit(0);
});

console.log('Press Ctrl+C to stop\n');
