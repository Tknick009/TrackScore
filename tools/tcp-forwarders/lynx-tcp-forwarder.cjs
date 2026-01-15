#!/usr/bin/env node

/**
 * FinishLynx TCP-to-HTTP Forwarder
 * 
 * This script runs on the same computer as FinishLynx and:
 * 1. Listens for TCP connections on configured ports
 * 2. Forwards ALL raw data to the remote server via HTTP
 * 3. Does NOT parse or modify the data - just forwards it
 * 
 * The server handles all parsing of the ResulTV/LSS format.
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
console.log('  FinishLynx TCP-to-HTTP Forwarder');
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
    const { rawData, portType, seqNum } = requestQueue.shift();
    await forwardToServerAsync(rawData, portType, seqNum);
  }
  
  isProcessingQueue = false;
}

function queueForward(rawData, portType) {
  const seqNum = ++globalSeqNum;
  requestQueue.push({ rawData, portType, seqNum });
  processQueue();
}

/**
 * Forward raw data to the server (async for sequential queue)
 * No parsing - just send the raw bytes as base64
 */
function forwardToServerAsync(rawData, portType, seqNum) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      data: rawData.toString('base64'),
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
      res.on('data', () => {});
      res.on('end', () => {
        console.log(`[${new Date().toLocaleTimeString()}] [${portType.toUpperCase()}] #${seqNum} Forwarded ${rawData.length} bytes`);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(`[${portType.toUpperCase()}] #${seqNum} Forward error:`, err.message);
      resolve(); // Continue queue on error
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Create a TCP server that forwards all data to the remote server
 */
function createForwarder(port, portType) {
  const server = net.createServer((socket) => {
    console.log(`[${new Date().toLocaleTimeString()}] [${portType.toUpperCase()}] Connected from ${socket.remoteAddress}`);
    
    socket.on('data', (data) => {
      // Log the size of data received
      console.log(`[${new Date().toLocaleTimeString()}] [${portType.toUpperCase()}] Received ${data.length} bytes`);
      
      // Queue for sequential forwarding to preserve order
      queueForward(data, portType);
    });
    
    socket.on('end', () => {
      console.log(`[${new Date().toLocaleTimeString()}] [${portType.toUpperCase()}] Disconnected`);
    });
    
    socket.on('error', (err) => {
      console.error(`[${portType.toUpperCase()}] Socket error:`, err.message);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[${portType.toUpperCase()}] Port ${port} already in use`);
    } else {
      console.error(`[${portType.toUpperCase()}] Server error:`, err.message);
    }
  });

  server.listen(port, () => {
    console.log(`[${portType.toUpperCase()}] Listening on port ${port}`);
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
