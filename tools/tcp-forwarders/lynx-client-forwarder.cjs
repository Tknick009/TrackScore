#!/usr/bin/env node

/**
 * FinishLynx TCP Client Forwarder
 * 
 * SIMPLE APPROACH: Collect all messages in order, send as ordered batch.
 * The batch array maintains exact arrival order.
 * 
 * Usage: node lynx-client-forwarder.cjs
 * 
 * Environment variables:
 *   FORWARD_URL - Server URL (default: http://localhost:5000)
 *   LYNX_HOST - FinishLynx IP (default: 127.0.0.1)
 *   RESULTS_PORT - Results port (default: 5055)
 */

const net = require('net');
const http = require('http');
const https = require('https');

const BASE_URL = process.env.FORWARD_URL || 'http://localhost:5000';
const LYNX_HOST = process.env.LYNX_HOST || '127.0.0.1';
const RESULTS_PORT = parseInt(process.env.RESULTS_PORT) || 5055;
const BATCH_DELAY_MS = 100; // Wait 100ms for batch to complete

console.log('==============================================');
console.log('  FinishLynx Client Forwarder (Batch Mode)');
console.log('==============================================');
console.log(`Connecting to: ${LYNX_HOST}:${RESULTS_PORT}`);
console.log(`Forwarding to: ${BASE_URL}/api/lynx/batch`);
console.log('==============================================\n');

const baseUrl = new URL(BASE_URL);
const isHttps = baseUrl.protocol === 'https:';
const httpModule = isHttps ? https : http;

// Message batch - array maintains insertion order
let messageBatch = [];
let batchTimer = null;
let isSending = false;
let batchNumber = 0;

function timestamp() {
  return new Date().toLocaleTimeString();
}

// Send the batch to server
function sendBatch() {
  if (messageBatch.length === 0 || isSending) return;
  
  isSending = true;
  batchNumber++;
  
  // Take current batch and reset
  const batch = messageBatch.slice();
  messageBatch = [];
  
  const payload = JSON.stringify({
    batchId: batchNumber,
    messages: batch,  // Array in exact arrival order
    timestamp: Date.now()
  });

  console.log(`[${timestamp()}] Sending batch #${batchNumber} with ${batch.length} messages...`);
  
  const options = {
    hostname: baseUrl.hostname,
    port: baseUrl.port || (isHttps ? 443 : 80),
    path: '/api/lynx/batch',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = httpModule.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[${timestamp()}] Batch #${batchNumber} sent successfully`);
        // Show first few messages
        batch.slice(0, 3).forEach((msg, i) => {
          const preview = msg.length > 60 ? msg.substring(0, 60) + '...' : msg;
          console.log(`  [${i}] ${preview}`);
        });
        if (batch.length > 3) {
          console.log(`  ... and ${batch.length - 3} more`);
        }
      } else {
        console.error(`[${timestamp()}] Batch #${batchNumber} failed: ${res.statusCode}`);
      }
      isSending = false;
      
      // If more messages came in while sending, send them
      if (messageBatch.length > 0) {
        scheduleBatchSend();
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[${timestamp()}] Batch #${batchNumber} error: ${err.message}`);
    isSending = false;
  });

  req.write(payload);
  req.end();
}

function scheduleBatchSend() {
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(sendBatch, BATCH_DELAY_MS);
}

// Add message to batch (maintains order)
function addToBatch(message) {
  messageBatch.push(message);
  scheduleBatchSend();
}

// Parse complete messages from buffer
function parseMessages(buffer) {
  const messages = [];
  let remaining = buffer;

  while (remaining.length > 0) {
    const newlineIdx = remaining.indexOf('\n');
    const braceIdx = remaining.indexOf('{');
    
    // No more complete content
    if (newlineIdx === -1 && braceIdx === -1) break;
    
    // Simple line (no JSON or newline comes first)
    if (newlineIdx !== -1 && (braceIdx === -1 || newlineIdx < braceIdx)) {
      const line = remaining.slice(0, newlineIdx).trim();
      remaining = remaining.slice(newlineIdx + 1);
      if (line) messages.push(line);
      continue;
    }
    
    // JSON object - find matching closing brace
    if (braceIdx !== -1) {
      // Any text before the brace on its own lines
      if (braceIdx > 0) {
        const before = remaining.slice(0, braceIdx);
        const lastNL = before.lastIndexOf('\n');
        if (lastNL !== -1) {
          before.slice(0, lastNL).split('\n').forEach(l => {
            if (l.trim()) messages.push(l.trim());
          });
          remaining = remaining.slice(lastNL + 1);
          continue;
        }
      }
      
      // Find end of JSON
      let depth = 0, end = -1, inStr = false, esc = false;
      for (let i = braceIdx; i < remaining.length; i++) {
        const c = remaining[i];
        if (esc) { esc = false; continue; }
        if (c === '\\' && inStr) { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (!inStr) {
          if (c === '{') depth++;
          else if (c === '}' && --depth === 0) { end = i; break; }
        }
      }
      
      if (end !== -1) {
        messages.push(remaining.slice(braceIdx, end + 1));
        remaining = remaining.slice(end + 1).replace(/^[\r\n]+/, '');
      } else {
        break; // Incomplete JSON, wait for more
      }
    }
  }

  return { messages, remaining };
}

// Connect to FinishLynx
let buffer = '';
let reconnectDelay = 3000;

function connect() {
  console.log(`[${timestamp()}] Connecting to ${LYNX_HOST}:${RESULTS_PORT}...`);
  
  const socket = new net.Socket();
  
  socket.connect(RESULTS_PORT, LYNX_HOST, () => {
    console.log(`[${timestamp()}] Connected to FinishLynx!`);
    reconnectDelay = 3000;
    buffer = '';
  });

  socket.on('data', (data) => {
    // Add to buffer
    buffer += data.toString();
    
    // Parse complete messages
    const { messages, remaining } = parseMessages(buffer);
    buffer = remaining;
    
    // Add each message to batch IN ORDER
    messages.forEach(msg => addToBatch(msg));
  });

  socket.on('close', () => {
    console.log(`[${timestamp()}] Connection closed. Reconnecting in ${reconnectDelay/1000}s...`);
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
  });

  socket.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.log(`[${timestamp()}] FinishLynx not ready. Retrying...`);
    } else {
      console.error(`[${timestamp()}] Error: ${err.message}`);
    }
  });
}

connect();

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (messageBatch.length > 0) {
    console.log(`Sending final batch of ${messageBatch.length} messages...`);
    sendBatch();
  }
  setTimeout(() => process.exit(0), 500);
});
