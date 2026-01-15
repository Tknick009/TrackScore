#!/usr/bin/env node

/**
 * FinishLynx TCP-to-HTTP Forwarder (JSON Format)
 * 
 * This script runs on the same computer as FinishLynx and:
 * 1. Listens for TCP connections on configured ports
 * 2. Parses JSON messages and layout commands
 * 3. Forwards to the remote server via HTTP in order
 * 
 * Usage:
 *   node lynx-tcp-forwarder.cjs
 *   
 * Environment variables:
 *   FORWARD_URL - The server URL (default: http://localhost:5000)
 *   RESULTS_PORT - Port for race results (default: 5555)
 *   CLOCK_PORT - Port for clock data (default: 5556)
 *   FIELD_PORT - Port for field results (default: 5557)
 */

const net = require('net');
const http = require('http');
const https = require('https');

// ========== CONFIGURATION ==========

const BASE_URL = process.env.FORWARD_URL || 'http://localhost:5000';
const RESULTS_PORT = parseInt(process.env.RESULTS_PORT) || 5555;
const CLOCK_PORT = parseInt(process.env.CLOCK_PORT) || 5556;
const FIELD_PORT = parseInt(process.env.FIELD_PORT) || 5557;

// ====================================

console.log('==============================================');
console.log('  FinishLynx TCP-to-HTTP Forwarder (JSON)');
console.log('==============================================');
console.log(`Server URL: ${BASE_URL}`);
console.log(`Results Port: ${RESULTS_PORT}`);
console.log(`Clock Port:   ${CLOCK_PORT}`);
console.log(`Field Port:   ${FIELD_PORT}`);
console.log('');
console.log('Waiting for FinishLynx connections...');
console.log('==============================================');
console.log('');

const baseUrl = new URL(BASE_URL);
const isHttps = baseUrl.protocol === 'https:';
const httpModule = isHttps ? https : http;

// Sequential request queue to preserve order
const requestQueue = [];
let isProcessingQueue = false;
let globalSeqNum = 0;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const { data, portType, seqNum } = requestQueue.shift();
    await forwardToServerAsync(data, portType, seqNum);
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

// Clean FinishLynx formatting codes from JSON
function cleanLynxData(data) {
  let cleaned = data.replace(/\\[A-Z][0-9]+/g, '');
  cleaned = cleaned.replace(/\{\s*,/g, '{');
  cleaned = cleaned.replace(/\[\s*,/g, '[');
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  cleaned = cleaned.replace(/:\s*,/g, ':null,');
  return cleaned;
}

/**
 * Forward data to the server (async for sequential queue)
 */
function forwardToServerAsync(data, portType, seqNum) {
  return new Promise((resolve) => {
    const cleanedData = cleanLynxData(data);
    
    const payload = JSON.stringify({
      data: cleanedData,
      portType: portType,
      seqNum: seqNum
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
      res.on('data', () => {});
      res.on('end', () => {
        const preview = cleanedData.length > 80 ? cleanedData.substring(0, 80) + '...' : cleanedData;
        console.log(`[${timestamp()}] [${portType.toUpperCase()}] #${seqNum} ✓ ${preview}`);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(`[${timestamp()}] [${portType.toUpperCase()}] #${seqNum} ✗ ${err.message}`);
      resolve(); // Continue queue on error
    });

    req.write(payload);
    req.end();
  });
}

// Extract complete JSON objects or newline-terminated lines IN ORDER
// CRITICAL: Never emit content until we know its boundaries are complete
function extractCompleteData(buffer) {
  const complete = [];
  let remaining = buffer;

  while (remaining.length > 0) {
    // Check if buffer starts with a JSON object
    const firstBrace = remaining.indexOf('{');
    const firstNewline = remaining.indexOf('\n');
    
    // No JSON and no newlines - keep everything in buffer
    if (firstBrace === -1 && firstNewline === -1) {
      break;
    }
    
    // If there's a complete line BEFORE any JSON, emit it first
    if (firstNewline !== -1 && (firstBrace === -1 || firstNewline < firstBrace)) {
      const line = remaining.slice(0, firstNewline).trim();
      remaining = remaining.slice(firstNewline + 1);
      if (line) {
        complete.push(line);
      }
      continue;
    }
    
    // JSON object starts here - find its end
    if (firstBrace !== -1) {
      // If there's content before the brace on the same line, it's part of the JSON line
      if (firstBrace > 0) {
        const beforeBrace = remaining.slice(0, firstBrace);
        // Check if there are complete lines before the brace
        const lastNewline = beforeBrace.lastIndexOf('\n');
        if (lastNewline !== -1) {
          // Emit complete lines before the JSON
          const lines = beforeBrace.slice(0, lastNewline).split('\n');
          lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed) complete.push(trimmed);
          });
          remaining = remaining.slice(lastNewline + 1);
          continue;
        }
      }
      
      // Now parse the JSON object
      let braceDepth = 0;
      let endIdx = -1;
      let inString = false;
      let escape = false;

      for (let i = firstBrace; i < remaining.length; i++) {
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
        // Complete JSON found - emit everything from start to end
        const jsonStr = remaining.slice(firstBrace, endIdx + 1);
        
        // Also emit any content before the JSON on the same "line"
        const beforeJson = remaining.slice(0, firstBrace).trim();
        if (beforeJson) {
          // Prepend to the JSON (some commands have prefix text)
          complete.push(beforeJson + jsonStr);
        } else {
          complete.push(jsonStr);
        }
        
        remaining = remaining.slice(endIdx + 1).replace(/^[\r\n]+/, '');
      } else {
        // Incomplete JSON - wait for more data
        break;
      }
    }
  }

  return { complete, remaining };
}

/**
 * Create a TCP server that forwards all data to the remote server
 */
function createForwarder(port, portType) {
  const server = net.createServer((socket) => {
    console.log(`[${timestamp()}] [${portType.toUpperCase()}] Connected from ${socket.remoteAddress}`);
    
    let buffer = '';
    
    socket.on('data', (data) => {
      // Convert to string for JSON parsing
      buffer += data.toString();
      
      const { complete, remaining } = extractCompleteData(buffer);
      buffer = remaining;
      
      // Queue each complete message in arrival order
      complete.forEach((msg) => {
        if (msg.trim()) {
          queueForward(msg.trim(), portType);
        }
      });
    });
    
    socket.on('end', () => {
      console.log(`[${timestamp()}] [${portType.toUpperCase()}] Disconnected`);
      // Flush any remaining data
      if (buffer.trim()) {
        queueForward(buffer.trim(), portType);
        buffer = '';
      }
    });
    
    socket.on('error', (err) => {
      console.error(`[${timestamp()}] [${portType.toUpperCase()}] Socket error: ${err.message}`);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[${timestamp()}] [${portType.toUpperCase()}] Port ${port} already in use`);
    } else {
      console.error(`[${timestamp()}] [${portType.toUpperCase()}] Server error: ${err.message}`);
    }
  });

  server.listen(port, () => {
    console.log(`[${timestamp()}] [${portType.toUpperCase()}] Listening on port ${port}`);
  });

  return server;
}

// Create forwarders for each port
const resultsServer = createForwarder(RESULTS_PORT, 'results');
const clockServer = createForwarder(CLOCK_PORT, 'clock');
const fieldServer = createForwarder(FIELD_PORT, 'field');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  resultsServer.close();
  clockServer.close();
  fieldServer.close();
  process.exit(0);
});
