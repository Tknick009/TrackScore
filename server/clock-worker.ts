/**
 * Clock Worker Thread
 * 
 * Runs the FinishLynx clock TCP listener in a separate thread so that
 * clock ticks are never blocked by main-thread operations (DB queries,
 * HTTP request handling, track/field processing, etc.).
 * 
 * The worker:
 * 1. Creates a TCP server on the clock port
 * 2. Parses incoming JSON clock messages ({t: "12.3", c: "running"})
 * 3. Posts parsed {eventNumber, time, command} to the parent thread
 * 
 * The parent thread receives these via MessagePort and calls broadcastClockUpdate().
 */
import { parentPort, workerData } from 'worker_threads';
import * as net from 'net';

const { port: clockPort, portName } = workerData as { port: number; portName: string };

let currentEventNumber = 0;
const buffers = new Map<net.Socket, string>();

function postClockUpdate(eventNumber: number, time: string, command: string) {
  parentPort?.postMessage({ type: 'clock-update', eventNumber, time, command });
}

function processClockJson(data: any) {
  const rawTime = data.t || data.time;
  const timeValue = typeof rawTime === 'string' ? rawTime.trim() : '';
  const command = (data.c || '').trim();

  if (command === 'time_of_day') return;

  if (command === 'armed') {
    postClockUpdate(currentEventNumber, '', 'armed');
  } else if (command === 'start' || command === 'running') {
    if (timeValue) {
      postClockUpdate(currentEventNumber, timeValue, command);
    }
  } else if (command === 'stop') {
    if (timeValue) {
      postClockUpdate(currentEventNumber, timeValue, command);
    }
  } else if (timeValue) {
    postClockUpdate(currentEventNumber, timeValue, command);
  }
}

function handleData(socket: net.Socket, rawData: Buffer) {
  let buffer = buffers.get(socket) || '';
  const rawStr = rawData.toString();
  buffer += rawStr;

  // Log for diagnostics
  const preview = rawStr.replace(/[\x00-\x1f]/g, '').substring(0, 100);
  if (preview.trim()) {
    parentPort?.postMessage({ type: 'log', message: `[Lynx:Clock] Raw data on port ${clockPort}: ${preview}` });
  }

  // Try to parse JSON objects from buffer
  // Clock data comes as JSON objects like {"t":"12.3","c":"running"}
  // Multiple objects may arrive concatenated in a single TCP packet
  let startIdx = 0;
  while (startIdx < buffer.length) {
    const braceStart = buffer.indexOf('{', startIdx);
    if (braceStart === -1) {
      buffer = '';
      break;
    }

    // Find matching closing brace
    let depth = 0;
    let braceEnd = -1;
    for (let i = braceStart; i < buffer.length; i++) {
      if (buffer[i] === '{') depth++;
      else if (buffer[i] === '}') {
        depth--;
        if (depth === 0) {
          braceEnd = i;
          break;
        }
      }
    }

    if (braceEnd === -1) {
      // Incomplete JSON — keep in buffer
      buffer = buffer.substring(braceStart);
      break;
    }

    const jsonStr = buffer.substring(braceStart, braceEnd + 1);
    startIdx = braceEnd + 1;

    try {
      const data = JSON.parse(jsonStr);
      processClockJson(data);
    } catch {
      // Not valid JSON, skip
    }
  }

  if (startIdx >= buffer.length) {
    buffer = '';
  }
  buffers.set(socket, buffer);
}

// Listen for event number updates from the main thread
parentPort?.on('message', (msg) => {
  if (msg.type === 'set-event-number') {
    currentEventNumber = msg.eventNumber;
  }
});

// Create TCP server for clock port
const server = net.createServer((socket) => {
  parentPort?.postMessage({ type: 'connection', connected: true, remoteAddress: socket.remoteAddress });
  buffers.set(socket, '');

  socket.on('data', (data) => {
    handleData(socket, data);
  });

  socket.on('close', () => {
    buffers.delete(socket);
    parentPort?.postMessage({ type: 'connection', connected: false });
  });

  socket.on('error', (err) => {
    parentPort?.postMessage({ type: 'error', message: err.message });
  });
});

server.on('error', (err) => {
  parentPort?.postMessage({ type: 'error', message: `Server error on port ${clockPort}: ${err.message}` });
});

server.listen(clockPort, '0.0.0.0', () => {
  parentPort?.postMessage({ type: 'log', message: `[Lynx:Clock] Worker thread listening on port ${clockPort}` });
});
