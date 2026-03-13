/**
 * Server-side log capture utility.
 * Intercepts console.log / console.warn / console.error and stores entries
 * in a ring buffer so they can be exported as a text file from the UI.
 */

interface LogEntry {
  timestamp: string;
  level: 'LOG' | 'WARN' | 'ERROR';
  message: string;
}

const MAX_ENTRIES = 5_000; // keep last 5k lines (~1-2 MB text)
const MAX_MESSAGE_LENGTH = 500; // truncate long messages to prevent memory bloat
const logBuffer: LogEntry[] = [];
const serverStartTime = new Date().toISOString();

// Store original console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function formatArgs(args: unknown[]): string {
  const result = args
    .map((a) => {
      if (typeof a === 'string') return a;
      try {
        // Limit stringified object size to prevent memory bloat
        const s = JSON.stringify(a, null, 0);
        return s.length > MAX_MESSAGE_LENGTH ? s.slice(0, MAX_MESSAGE_LENGTH) + '...' : s;
      } catch {
        return String(a);
      }
    })
    .join(' ');
  // Truncate the final message
  return result.length > MAX_MESSAGE_LENGTH * 2 ? result.slice(0, MAX_MESSAGE_LENGTH * 2) + '...' : result;
}

function push(level: LogEntry['level'], args: unknown[]) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: formatArgs(args),
  };
  logBuffer.push(entry);
  // Trim oldest entries if buffer exceeds limit — use shift for lower GC pressure
  while (logBuffer.length > MAX_ENTRIES) {
    logBuffer.shift();
  }
}

/** Install the capture hooks. Call once at server startup. */
export function installLogCapture() {
  console.log = (...args: unknown[]) => {
    push('LOG', args);
    originalLog.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    push('WARN', args);
    originalWarn.apply(console, args);
  };
  console.error = (...args: unknown[]) => {
    push('ERROR', args);
    originalError.apply(console, args);
  };
  originalLog('[LogCapture] Installed — buffering up to', MAX_ENTRIES, 'entries');
}

/** Return all captured log entries as a single text blob. */
export function exportLogs(): string {
  const header = [
    '========================================',
    `  TrackScore Server Logs`,
    `  Server started: ${serverStartTime}`,
    `  Exported at:    ${new Date().toISOString()}`,
    `  Total entries:  ${logBuffer.length}`,
    '========================================',
    '',
  ].join('\n');

  const lines = logBuffer.map(
    (e) => `[${e.timestamp}] [${e.level}] ${e.message}`
  );

  return header + lines.join('\n') + '\n';
}

/** Clear the log buffer. */
export function clearLogs() {
  logBuffer.length = 0;
}

/** Return the current entry count (useful for a badge / status). */
export function logCount(): number {
  return logBuffer.length;
}
