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
 * Port Architecture:
 *   - Track Results (Big Board): 4554 -> broadcasts to track_mode_change_big
 *   - Track Results (Small Board): 4555 -> broadcasts to track_mode_change
 *   - Clock: 4556 -> shared clock data
 *   - FieldLynx: 4557 -> legacy field port
 *   - Field Ports 4560-4569: Per-field-event routing (10 simultaneous field events)
 * 
 * Usage:
 *   node lynx-tcp-forwarder.cjs
 *   
 * Environment variables:
 *   FORWARD_URL - The server URL (default: http://localhost:5000)
 *   RESULTS_BIG_PORT - Port for big board results (default: 4554)
 *   RESULTS_PORT - Port for small board results (default: 4555)
 *   CLOCK_PORT - Port for clock data (default: 4556)
 *   FIELD_PORT - Legacy field port (default: 4557)
 *   FIELD_PORT_START - Start of field port range (default: 4560)
 *   FIELD_PORT_COUNT - Number of field ports (default: 10)
 */

const net = require('net');
const http = require('http');
const https = require('https');

// ========== CONFIGURATION ==========

const BASE_URL = process.env.FORWARD_URL || 'http://localhost:5000';
const RESULTS_BIG_PORT = parseInt(process.env.RESULTS_BIG_PORT) || 4554;
const RESULTS_PORT = parseInt(process.env.RESULTS_PORT) || 4555;
const CLOCK_PORT = parseInt(process.env.CLOCK_PORT) || 4556;
const FIELD_PORT = parseInt(process.env.FIELD_PORT) || 4557;
const FIELD_PORT_START = parseInt(process.env.FIELD_PORT_START) || 4560;
const FIELD_PORT_COUNT = parseInt(process.env.FIELD_PORT_COUNT) || 10;

// ====================================

console.log('==============================================');
console.log('  FinishLynx TCP-to-HTTP Forwarder');
console.log('==============================================');
console.log(`Server URL: ${BASE_URL}`);
console.log('');
console.log('Track Ports:');
console.log(`  Big Board Results: ${RESULTS_BIG_PORT}`);
console.log(`  Small Board Results: ${RESULTS_PORT}`);
console.log(`  Clock: ${CLOCK_PORT}`);
console.log('');
console.log('Field Ports:');
console.log(`  Legacy Field: ${FIELD_PORT}`);
console.log(`  Field Range: ${FIELD_PORT_START}-${FIELD_PORT_START + FIELD_PORT_COUNT - 1}`);
console.log('');
console.log('Waiting for FinishLynx/FieldLynx connections...');
console.log('==============================================');
console.log('');

const baseUrl = new URL(BASE_URL);
const isHttps = baseUrl.protocol === 'https:';
const httpModule = isHttps ? https : http;

/**
 * Forward raw data to the server
 * No parsing - just send the raw bytes as base64
 */
function forwardToServer(rawData, portType, fieldPort = null) {
  const payload = JSON.stringify({
    data: rawData.toString('base64'),
    encoding: 'base64',
    portType: portType,
    fieldPort: fieldPort,
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
    // Silently consume response
    res.on('data', () => {});
  });

  req.on('error', (err) => {
    const portInfo = fieldPort ? ` (port ${fieldPort})` : '';
    console.error(`[${portType.toUpperCase()}${portInfo}] Forward error:`, err.message);
  });

  req.write(payload);
  req.end();
}

/**
 * Create a TCP server that forwards all data to the remote server
 */
function createForwarder(port, portType, fieldPort = null) {
  const server = net.createServer((socket) => {
    const portInfo = fieldPort ? ` (field port ${fieldPort})` : '';
    console.log(`[${new Date().toLocaleTimeString()}] [${portType.toUpperCase()}${portInfo}] Connected from ${socket.remoteAddress}`);
    
    socket.on('data', (data) => {
      console.log(`[${new Date().toLocaleTimeString()}] [${portType.toUpperCase()}${portInfo}] Received ${data.length} bytes`);
      
      // Forward raw data immediately - no parsing
      forwardToServer(data, portType, fieldPort);
    });
    
    socket.on('end', () => {
      console.log(`[${new Date().toLocaleTimeString()}] [${portType.toUpperCase()}${portInfo}] Disconnected`);
    });
    
    socket.on('error', (err) => {
      console.error(`[${portType.toUpperCase()}${portInfo}] Socket error:`, err.message);
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
    const portInfo = fieldPort ? ` -> field_mode_change_${fieldPort}` : '';
    console.log(`[${portType.toUpperCase()}] Listening on port ${port}${portInfo}`);
  });

  return server;
}

// Store all servers for graceful shutdown
const servers = [];

// Create track forwarders
servers.push(createForwarder(RESULTS_BIG_PORT, 'results_big'));
servers.push(createForwarder(RESULTS_PORT, 'results'));
servers.push(createForwarder(CLOCK_PORT, 'clock'));

// Create legacy field forwarder
servers.push(createForwarder(FIELD_PORT, 'field'));

// Create field port range forwarders (4560-4569)
for (let i = 0; i < FIELD_PORT_COUNT; i++) {
  const fieldPort = FIELD_PORT_START + i;
  servers.push(createForwarder(fieldPort, 'field', fieldPort));
}

console.log('');
console.log(`Total forwarders: ${servers.length}`);
console.log('');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  servers.forEach(server => server.close());
  process.exit(0);
});
