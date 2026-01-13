#!/usr/bin/env node

/**
 * FinishLynx TCP-to-HTTP Forwarder v2.0
 * 
 * A reliable bridge for forwarding FinishLynx data from stadium networks
 * to cloud servers. Designed for spotty venue networks.
 * 
 * Features:
 * - Raw byte forwarding (no parsing - server handles all parsing)
 * - Batching (100ms) to reduce HTTP overhead
 * - Retry with exponential backoff
 * - Connection health monitoring
 * - Dual destinations (primary + backup)
 * - Configurable via environment variables
 * 
 * Usage:
 *   node lynx-tcp-forwarder.cjs
 *   
 * Environment Variables:
 *   FORWARD_URL      - Primary server URL (default: http://localhost:5000)
 *   BACKUP_URL       - Backup server URL (optional)
 *   RESULTS_PORT     - Port for race results (default: 5555)
 *   CLOCK_PORT       - Port for clock data (default: 5556)
 *   FIELD_PORT       - Port for field results (default: 5557)
 *   BATCH_INTERVAL   - Batch interval in ms (default: 100)
 *   MAX_RETRIES      - Maximum retry attempts (default: 3)
 */

const net = require('net');
const http = require('http');
const https = require('https');

// ========== CONFIGURATION ==========

const CONFIG = {
  PRIMARY_URL: process.env.FORWARD_URL || 'http://localhost:5000',
  BACKUP_URL: process.env.BACKUP_URL || null,
  RESULTS_PORT: parseInt(process.env.RESULTS_PORT) || 5555,
  CLOCK_PORT: parseInt(process.env.CLOCK_PORT) || 5556,
  FIELD_PORT: parseInt(process.env.FIELD_PORT) || 5557,
  BATCH_INTERVAL_MS: parseInt(process.env.BATCH_INTERVAL) || 100,
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
  RETRY_BASE_MS: 500,
  HEALTH_CHECK_INTERVAL_MS: 30000,
};

// ========== STATE ==========

const portStats = {
  results: { bytesReceived: 0, bytesSent: 0, lastActivity: null, connected: false, errors: 0 },
  clock: { bytesReceived: 0, bytesSent: 0, lastActivity: null, connected: false, errors: 0 },
  field: { bytesReceived: 0, bytesSent: 0, lastActivity: null, connected: false, errors: 0 },
};

const batchBuffers = {
  results: [],
  clock: [],
  field: [],
};

let batchTimers = {
  results: null,
  clock: null,
  field: null,
};

// ========== LOGGING ==========

function log(level, portType, message) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = portType ? `[${portType.toUpperCase()}]` : '';
  console.log(`[${timestamp}] ${level} ${prefix} ${message}`);
}

function logInfo(portType, message) { log('INFO', portType, message); }
function logError(portType, message) { log('ERROR', portType, message); }
function logDebug(portType, message) { 
  if (process.env.DEBUG) log('DEBUG', portType, message); 
}

// ========== HTTP HELPERS ==========

function createHttpClient(urlString) {
  const url = new URL(urlString);
  return {
    url,
    module: url.protocol === 'https:' ? https : http,
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
  };
}

async function postWithRetry(client, payload, retryCount = 0) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: client.hostname,
      port: client.port,
      path: '/api/lynx/raw',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 5000,
    };

    const req = client.module.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, statusCode: res.statusCode });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(payload);
    req.end();
  }).catch(async (error) => {
    if (retryCount < CONFIG.MAX_RETRIES) {
      const delay = CONFIG.RETRY_BASE_MS * Math.pow(2, retryCount);
      logDebug(null, `Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES} after ${delay}ms: ${error.message}`);
      await new Promise(r => setTimeout(r, delay));
      return postWithRetry(client, payload, retryCount + 1);
    }
    throw error;
  });
}

// ========== FORWARDING ==========

const primaryClient = createHttpClient(CONFIG.PRIMARY_URL);
const backupClient = CONFIG.BACKUP_URL ? createHttpClient(CONFIG.BACKUP_URL) : null;

async function forwardBatch(portType) {
  const batch = batchBuffers[portType];
  if (batch.length === 0) return;

  // Combine all buffered data
  const combinedData = Buffer.concat(batch);
  batchBuffers[portType] = [];

  const payload = JSON.stringify({
    data: combinedData.toString('base64'),
    encoding: 'base64',
    portType: portType,
    timestamp: Date.now(),
    batchSize: batch.length,
  });

  try {
    await postWithRetry(primaryClient, payload);
    portStats[portType].bytesSent += combinedData.length;
    logDebug(portType, `Forwarded ${combinedData.length} bytes`);
  } catch (error) {
    portStats[portType].errors++;
    logError(portType, `Primary forward failed: ${error.message}`);

    // Try backup if configured
    if (backupClient) {
      try {
        await postWithRetry(backupClient, payload);
        portStats[portType].bytesSent += combinedData.length;
        logInfo(portType, `Forwarded to backup server`);
      } catch (backupError) {
        logError(portType, `Backup forward failed: ${backupError.message}`);
      }
    }
  }
}

function queueData(portType, data) {
  batchBuffers[portType].push(data);
  portStats[portType].bytesReceived += data.length;
  portStats[portType].lastActivity = Date.now();

  // Schedule batch send if not already scheduled
  if (!batchTimers[portType]) {
    batchTimers[portType] = setTimeout(() => {
      batchTimers[portType] = null;
      forwardBatch(portType);
    }, CONFIG.BATCH_INTERVAL_MS);
  }
}

// ========== TCP SERVERS ==========

function createTCPServer(port, portType) {
  const server = net.createServer((socket) => {
    const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    logInfo(portType, `Connected from ${remoteAddr}`);
    portStats[portType].connected = true;

    socket.on('data', (data) => {
      logDebug(portType, `Received ${data.length} bytes`);
      queueData(portType, data);
    });

    socket.on('end', () => {
      logInfo(portType, `Disconnected: ${remoteAddr}`);
      portStats[portType].connected = false;
    });

    socket.on('error', (err) => {
      logError(portType, `Socket error: ${err.message}`);
      portStats[portType].errors++;
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logError(portType, `Port ${port} already in use`);
    } else {
      logError(portType, `Server error: ${err.message}`);
    }
  });

  server.listen(port, () => {
    logInfo(portType, `Listening on port ${port}`);
  });

  return server;
}

// ========== HEALTH CHECK ==========

function printStatus() {
  console.log('\n--- Forwarder Status ---');
  for (const [portType, stats] of Object.entries(portStats)) {
    const lastActivity = stats.lastActivity 
      ? new Date(stats.lastActivity).toLocaleTimeString() 
      : 'Never';
    console.log(`  ${portType.toUpperCase()}: ` +
      `${stats.connected ? 'CONNECTED' : 'waiting'} | ` +
      `Recv: ${stats.bytesReceived} bytes | ` +
      `Sent: ${stats.bytesSent} bytes | ` +
      `Errors: ${stats.errors} | ` +
      `Last: ${lastActivity}`);
  }
  console.log('------------------------\n');
}

// ========== MAIN ==========

console.log('==============================================');
console.log('  FinishLynx TCP-to-HTTP Forwarder v2.0');
console.log('==============================================');
console.log(`Primary URL:   ${CONFIG.PRIMARY_URL}`);
console.log(`Backup URL:    ${CONFIG.BACKUP_URL || '(none)'}`);
console.log(`Results Port:  ${CONFIG.RESULTS_PORT}`);
console.log(`Clock Port:    ${CONFIG.CLOCK_PORT}`);
console.log(`Field Port:    ${CONFIG.FIELD_PORT}`);
console.log(`Batch Interval: ${CONFIG.BATCH_INTERVAL_MS}ms`);
console.log(`Max Retries:   ${CONFIG.MAX_RETRIES}`);
console.log('');
console.log('Waiting for FinishLynx connections...');
console.log('==============================================');
console.log('');

const resultsServer = createTCPServer(CONFIG.RESULTS_PORT, 'results');
const clockServer = createTCPServer(CONFIG.CLOCK_PORT, 'clock');
const fieldServer = createTCPServer(CONFIG.FIELD_PORT, 'field');

// Periodic status display
const statusInterval = setInterval(printStatus, CONFIG.HEALTH_CHECK_INTERVAL_MS);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  clearInterval(statusInterval);
  
  // Flush any remaining batches
  Object.keys(batchTimers).forEach(portType => {
    if (batchTimers[portType]) {
      clearTimeout(batchTimers[portType]);
      forwardBatch(portType);
    }
  });
  
  resultsServer.close();
  clockServer.close();
  fieldServer.close();
  
  printStatus();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logError(null, `Uncaught exception: ${err.message}`);
  console.error(err.stack);
});
