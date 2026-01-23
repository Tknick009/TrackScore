#!/usr/bin/env node
/**
 * FinishLynx Data Logger
 * 
 * Captures all raw data from FinishLynx TCP connections and logs to file.
 * Usage: node tools/lynx-logger.cjs [port] [output-file]
 * 
 * Examples:
 *   node tools/lynx-logger.cjs 4554 lynx-big-board.log
 *   node tools/lynx-logger.cjs 4555 lynx-small-board.log
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.argv[2]) || 4554;
const outputFile = process.argv[3] || `lynx-capture-${port}.log`;
const outputPath = path.join(process.cwd(), 'data', outputFile);

// Ensure data directory exists
if (!fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

// Create/clear log file
fs.writeFileSync(outputPath, `=== FinishLynx Capture Started ===\n`);
fs.appendFileSync(outputPath, `Port: ${port}\n`);
fs.appendFileSync(outputPath, `Started: ${new Date().toISOString()}\n`);
fs.appendFileSync(outputPath, `${'='.repeat(50)}\n\n`);

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());
  fs.appendFileSync(outputPath, line);
}

function logHex(label, buffer) {
  const hex = buffer.toString('hex').match(/.{1,2}/g)?.join(' ') || '';
  const ascii = buffer.toString('ascii').replace(/[\x00-\x1f\x7f-\xff]/g, '.');
  log(`${label}:`);
  log(`  HEX: ${hex}`);
  log(`  ASCII: ${ascii}`);
  log(`  Length: ${buffer.length} bytes`);
}

function logParsed(buffer) {
  // Try to parse ResulTV format for better readability
  const text = buffer.toString('latin1');
  
  // Look for common patterns
  const lines = [];
  let pos = 0;
  
  while (pos < text.length) {
    // Find line breaks (CR, LF, or CRLF)
    let lineEnd = text.indexOf('\r', pos);
    if (lineEnd === -1) lineEnd = text.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = text.length;
    
    const line = text.substring(pos, lineEnd);
    if (line.length > 0) {
      // Escape control characters for display
      const escaped = line.replace(/[\x00-\x1f]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`);
      lines.push(escaped);
    }
    
    pos = lineEnd + 1;
    // Skip LF after CR
    if (pos < text.length && text[pos - 1] === '\r' && text[pos] === '\n') {
      pos++;
    }
  }
  
  if (lines.length > 0) {
    log('  PARSED LINES:');
    lines.forEach((line, i) => {
      log(`    [${i + 1}] ${line}`);
    });
  }
}

const server = net.createServer((socket) => {
  const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
  log(`\n>>> CLIENT CONNECTED: ${clientAddr}`);
  
  socket.on('data', (data) => {
    log(`\n--- DATA RECEIVED (${data.length} bytes) ---`);
    logHex('RAW', data);
    logParsed(data);
    log('--- END DATA ---\n');
  });
  
  socket.on('close', () => {
    log(`<<< CLIENT DISCONNECTED: ${clientAddr}\n`);
  });
  
  socket.on('error', (err) => {
    log(`!!! SOCKET ERROR: ${err.message}`);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`ERROR: Port ${port} is already in use.`);
    console.error('Stop the main app first, or use a different port.');
    process.exit(1);
  }
  console.error(`Server error: ${err.message}`);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`FinishLynx Data Logger`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Listening on port: ${port}`);
  console.log(`Logging to: ${outputPath}`);
  console.log(`\nPress Ctrl+C to stop\n`);
  log('Server listening...');
});

process.on('SIGINT', () => {
  log('\nShutting down...');
  server.close();
  console.log(`\nLog saved to: ${outputPath}`);
  process.exit(0);
});
