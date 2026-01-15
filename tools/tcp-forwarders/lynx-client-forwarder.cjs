#!/usr/bin/env node

/**
 * Track & Field Lynx TCP Client Forwarder (Binary Mode)
 * 
 * CRITICAL: This forwards RAW BINARY data exactly as received from FinishLynx.
 * ResulTV is a binary protocol - we must NOT convert to string or parse.
 * 
 * Each complete message (terminated by LF or 0x03 0x04) is sent as base64.
 * 
 * Usage:
 *   node lynx-client-forwarder.cjs
 * 
 * Environment variables:
 *   FORWARD_URL - Cloud server URL (default: http://localhost:5000)
 *   LYNX_HOST - FinishLynx IP address (default: 127.0.0.1)
 *   CLOCK_PORT - Clock data port (default: 5056)
 *   RESULTS_PORT - Results data port (default: 5055)
 *   FIELD_PORT - Field data port (default: 5057)
 */

const net = require('net');
const http = require('http');
const https = require('https');

// ========== CONFIGURATION ==========

const BASE_URL = process.env.FORWARD_URL || 'http://localhost:5000';
const LYNX_HOST = process.env.LYNX_HOST || '127.0.0.1';
const CLOCK_PORT = parseInt(process.env.CLOCK_PORT) || 5056;
const RESULTS_PORT = parseInt(process.env.RESULTS_PORT) || 5055;
const FIELD_PORT = parseInt(process.env.FIELD_PORT) || 5057;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;

// ====================================

console.log('==============================================');
console.log('  Lynx TCP Client Forwarder (BINARY Mode)');
console.log('==============================================');
console.log(`Connecting TO FinishLynx at: ${LYNX_HOST}`);
console.log(`  Clock:   ${LYNX_HOST}:${CLOCK_PORT}`);
console.log(`  Results: ${LYNX_HOST}:${RESULTS_PORT}`);
console.log(`  Field:   ${LYNX_HOST}:${FIELD_PORT}`);
console.log(`Forwarding to: ${BASE_URL}/api/lynx/raw`);
console.log('==============================================\n');

const baseUrl = new URL(BASE_URL);
const isHttps = baseUrl.protocol === 'https:';
const httpModule = isHttps ? https : http;

const connections = {
  clock: { socket: null, connected: false, reconnectDelay: RECONNECT_DELAY, buffer: Buffer.alloc(0) },
  results: { socket: null, connected: false, reconnectDelay: RECONNECT_DELAY, buffer: Buffer.alloc(0) },
  field: { socket: null, connected: false, reconnectDelay: RECONNECT_DELAY, buffer: Buffer.alloc(0) }
};

// Sequential queue to preserve order
const requestQueue = [];
let isProcessingQueue = false;
let globalSeqNum = 0;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const { data, portType, seqNum } = requestQueue.shift();
    await forwardBinaryData(data, portType, seqNum);
  }
  
  isProcessingQueue = false;
}

function queueForward(data, portType) {
  const seqNum = ++globalSeqNum;
  requestQueue.push({ data, portType, seqNum });
  processQueue();
}

function timestamp() {
  return new Date().toLocaleTimeString();
}

// Format buffer for display (show hex of control chars, ascii for printable)
function formatForDisplay(buf, maxLen = 80) {
  let result = '';
  for (let i = 0; i < buf.length && result.length < maxLen; i++) {
    const b = buf[i];
    if (b >= 32 && b <= 126) {
      result += String.fromCharCode(b);
    } else if (b === 0x0a) {
      result += '\\n';
    } else if (b === 0x0d) {
      result += '\\r';
    } else {
      result += `\\x${b.toString(16).padStart(2, '0')}`;
    }
  }
  if (buf.length > maxLen) result += '...';
  return result;
}

// Forward raw binary data as base64
function forwardBinaryData(data, portType, seqNum) {
  return new Promise((resolve) => {
    const base64Data = data.toString('base64');
    
    const payload = JSON.stringify({
      data: base64Data,
      encoding: 'base64',
      portType: portType,
      seqNum: seqNum,
      timestamp: Date.now()
    });

    const options = {
      hostname: baseUrl.hostname,
      port: baseUrl.port || (isHttps ? 443 : 80),
      path: '/api/lynx/raw',
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
        const preview = formatForDisplay(data, 60);
        if (res.statusCode === 200) {
          console.log(`[${timestamp()}] [${portType.toUpperCase()}] #${seqNum} ✓ ${data.length}b: ${preview}`);
        } else {
          console.error(`[${timestamp()}] [${portType.toUpperCase()}] #${seqNum} ✗ ${res.statusCode}: ${preview}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(`[${timestamp()}] [${portType.toUpperCase()}] #${seqNum} ✗ ${err.message}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// Extract complete binary messages from buffer
// ResulTV messages are terminated by LF (0x0A) or 0x03 0x04
function extractCompleteMessages(buffer) {
  const complete = [];
  let remaining = buffer;

  while (remaining.length > 0) {
    // Look for LF terminator
    const lfIndex = remaining.indexOf(0x0a);
    
    // Look for 0x03 0x04 terminator
    let etxEotIndex = -1;
    for (let i = 0; i < remaining.length - 1; i++) {
      if (remaining[i] === 0x03 && remaining[i + 1] === 0x04) {
        etxEotIndex = i;
        break;
      }
    }
    
    // Find the earliest terminator
    let terminatorIndex = -1;
    let terminatorLen = 0;
    
    if (lfIndex !== -1 && (etxEotIndex === -1 || lfIndex < etxEotIndex)) {
      terminatorIndex = lfIndex;
      terminatorLen = 1; // LF is 1 byte
    } else if (etxEotIndex !== -1) {
      terminatorIndex = etxEotIndex;
      terminatorLen = 2; // 0x03 0x04 is 2 bytes
    }
    
    if (terminatorIndex === -1) {
      // No complete message yet
      break;
    }
    
    // Extract the complete message (including terminator for proper parsing)
    const message = remaining.slice(0, terminatorIndex + terminatorLen);
    if (message.length > 0) {
      complete.push(message);
    }
    
    remaining = remaining.slice(terminatorIndex + terminatorLen);
  }

  return { complete, remaining };
}

// Connect to a FinishLynx port
function connectToLynx(portType, host, port) {
  const conn = connections[portType];
  
  console.log(`[${timestamp()}] [${portType.toUpperCase()}] Connecting to ${host}:${port}...`);
  
  const socket = new net.Socket();
  conn.socket = socket;
  conn.buffer = Buffer.alloc(0);

  socket.connect(port, host, () => {
    console.log(`[${timestamp()}] [${portType.toUpperCase()}] ✓ Connected to FinishLynx`);
    conn.connected = true;
    conn.reconnectDelay = RECONNECT_DELAY;
  });

  socket.on('data', (data) => {
    // CRITICAL: Keep as Buffer, do NOT convert to string!
    conn.buffer = Buffer.concat([conn.buffer, data]);
    
    const { complete, remaining } = extractCompleteMessages(conn.buffer);
    conn.buffer = remaining;
    
    // Queue each complete message in order
    complete.forEach((msg) => {
      queueForward(msg, portType);
    });
  });

  socket.on('close', () => {
    console.log(`[${timestamp()}] [${portType.toUpperCase()}] Connection closed`);
    conn.connected = false;
    scheduleReconnect(portType, host, port);
  });

  socket.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.log(`[${timestamp()}] [${portType.toUpperCase()}] Waiting for FinishLynx...`);
    } else {
      console.error(`[${timestamp()}] [${portType.toUpperCase()}] Error: ${err.message}`);
    }
  });
}

function scheduleReconnect(portType, host, port) {
  const conn = connections[portType];
  const delay = conn.reconnectDelay;
  
  setTimeout(() => {
    if (!conn.connected) {
      conn.reconnectDelay = Math.min(conn.reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
      connectToLynx(portType, host, port);
    }
  }, delay);
}

// Start all connections
console.log(`[${timestamp()}] Starting connections...`);
connectToLynx('clock', LYNX_HOST, CLOCK_PORT);
connectToLynx('results', LYNX_HOST, RESULTS_PORT);
connectToLynx('field', LYNX_HOST, FIELD_PORT);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  Object.values(connections).forEach(conn => {
    if (conn.socket) {
      conn.socket.destroy();
    }
  });
  process.exit(0);
});

console.log(`[${timestamp()}] Forwarder running. Press Ctrl+C to stop.`);
