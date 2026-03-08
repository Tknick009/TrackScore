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

const MAX_ENTRIES = 50_000; // keep last 50k lines (~10-20 MB text)
const logBuffer: LogEntry[] = [];
const serverStartTime = new Date().toISOString();

// Store original console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a, null, 0);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

function push(level: LogEntry['level'], args: unknown[]) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: formatArgs(args),
  };
  logBuffer.push(entry);
  // Trim oldest entries if buffer exceeds limit
  if (logBuffer.length > MAX_ENTRIES) {
    logBuffer.splice(0, logBuffer.length - MAX_ENTRIES);
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
