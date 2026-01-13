#!/usr/bin/env node

/**
 * FinishLynx Raw Data Logger
 * 
 * Logs ALL raw data from FinishLynx on port 5555 to help debug layout switching.
 * Run this on your Windows machine where FinishLynx is installed.
 * 
 * Usage:
 *   node lynx-raw-logger.cjs
 */

const net = require('net');
const fs = require('fs');

const RESULTS_PORT = parseInt(process.env.RESULTS_PORT) || 5555;
const LOG_FILE = 'finishlynx-raw.log';

console.log('==============================================');
console.log('  FinishLynx Raw Data Logger');
console.log('==============================================');
console.log(`Listening on port: ${RESULTS_PORT}`);
console.log(`Logging to: ${LOG_FILE}`);
console.log('');
console.log('Waiting for FinishLynx connection...');
console.log('ARM an event, START a race, then check the log file.');
console.log('==============================================');
console.log('');

// Clear log file
fs.writeFileSync(LOG_FILE, `FinishLynx Raw Log - ${new Date().toISOString()}\n\n`);

const server = net.createServer((socket) => {
  console.log(`[${new Date().toLocaleTimeString()}] FinishLynx connected from ${socket.remoteAddress}`);
  fs.appendFileSync(LOG_FILE, `\n=== CONNECTED: ${new Date().toISOString()} ===\n\n`);
  
  let lineNum = 0;
  let buffer = '';
  
  socket.on('data', (data) => {
    const raw = data.toString();
    buffer += raw;
    
    // Log each complete line
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        lineNum++;
        const timestamp = new Date().toLocaleTimeString();
        const logLine = `[${lineNum}] ${timestamp} | ${line.trim()}\n`;
        
        // Write to file
        fs.appendFileSync(LOG_FILE, logLine);
        
        // Also show interesting patterns in console
        if (line.includes('Command=') || 
            line.includes('LayoutDraw') ||
            line.includes('ARMED') ||
            line.includes('Armed') ||
            line.includes('RUNNING') ||
            line.includes('Running') ||
            line.includes('"S":')) {
          console.log(`[${timestamp}] INTERESTING: ${line.substring(0, 100)}...`);
        } else if (lineNum % 100 === 0) {
          console.log(`[${timestamp}] Logged ${lineNum} lines...`);
        }
      }
    }
  });
  
  socket.on('end', () => {
    console.log(`[${new Date().toLocaleTimeString()}] FinishLynx disconnected`);
    fs.appendFileSync(LOG_FILE, `\n=== DISCONNECTED: ${new Date().toISOString()} ===\n`);
    console.log(`\nCheck ${LOG_FILE} for all raw data.`);
  });
  
  socket.on('error', (err) => {
    console.error('Socket error:', err.message);
  });
});

server.listen(RESULTS_PORT, '0.0.0.0', () => {
  console.log(`✓ Logger ready on port ${RESULTS_PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${RESULTS_PORT} is already in use!`);
    console.error('Stop the other forwarder first.\n');
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(`\n\nLogged ${fs.readFileSync(LOG_FILE, 'utf8').split('\n').length} lines to ${LOG_FILE}`);
  console.log('Check the file for raw FinishLynx data.');
  process.exit(0);
});
