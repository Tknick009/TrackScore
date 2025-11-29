import * as net from 'net';
import { EventEmitter } from 'events';
import type { LynxPacket, LynxPortType, TrackDisplayMode, FieldDisplayMode } from '@shared/schema';

interface PortConfig {
  port: number;
  portType: LynxPortType;
  name: string;
}

interface LynxListenerEvents {
  'packet': (packet: LynxPacket) => void;
  'track-mode-change': (eventNumber: number, mode: TrackDisplayMode, data: any) => void;
  'field-mode-change': (eventNumber: number, mode: FieldDisplayMode, data: any) => void;
  'clock-update': (eventNumber: number, time: string, isRunning: boolean) => void;
  'result': (eventNumber: number, lane: number, place: number, time: string, athleteName?: string) => void;
  'field-result': (eventNumber: number, athleteName: string, place: number, mark: string, attemptNumber: number, attempts?: string) => void;
  'field-athlete-up': (eventNumber: number, athleteName: string, attemptNumber: number, mark?: string) => void;
  'start-list': (eventNumber: number, heat: number, entries: LynxStartListEntry[]) => void;
  'connection': (portType: LynxPortType, connected: boolean) => void;
  'error': (error: Error, portType: LynxPortType) => void;
}

interface LynxStartListEntry {
  place?: string;
  lane?: string;
  bib?: string;
  name?: string;
  affiliation?: string;
  firstName?: string;
  lastName?: string;
}

interface LynxTrackResult {
  place?: string;
  lane?: string;
  bib?: string;
  name?: string;
  affiliation?: string;
  time?: string;
  reactionTime?: string;
  lapsToGo?: string;
  cumulativeSplit?: string;
  lastSplit?: string;
  firstName?: string;
  lastName?: string;
}

interface LynxFieldResult {
  place?: string;
  name?: string;
  affiliation?: string;
  bib?: string;
  mark?: string;
  attemptNumber?: string;
  attempts?: string;
  wind?: string;
  markConverted?: string;
}

export class LynxListener extends EventEmitter {
  private servers: Map<LynxPortType, net.Server> = new Map();
  private clients: Map<LynxPortType, Set<net.Socket>> = new Map();
  private buffers: Map<net.Socket, string> = new Map();
  private configs: PortConfig[] = [];
  private currentEventNumber: number = 0;
  private currentHeatNumber: number = 1;
  private isRunning: boolean = false;
  private lastClockTime: string = '0:00.00';

  constructor() {
    super();
  }

  emit<K extends keyof LynxListenerEvents>(event: K, ...args: Parameters<LynxListenerEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof LynxListenerEvents>(event: K, listener: LynxListenerEvents[K]): this {
    return super.on(event, listener);
  }

  configure(configs: PortConfig[]) {
    this.configs = configs;
  }

  start() {
    for (const config of this.configs) {
      this.startListener(config);
    }
    console.log(`[Lynx] Started ${this.configs.length} listeners`);
  }

  private startListener(config: PortConfig) {
    const server = net.createServer((socket) => {
      console.log(`[Lynx:${config.name}] Client connected from ${socket.remoteAddress}`);
      
      let clients = this.clients.get(config.portType);
      if (!clients) {
        clients = new Set();
        this.clients.set(config.portType, clients);
      }
      clients.add(socket);
      this.buffers.set(socket, '');
      
      this.emit('connection', config.portType, true);

      socket.on('data', (data) => {
        this.handleData(socket, data, config);
      });

      socket.on('close', () => {
        console.log(`[Lynx:${config.name}] Client disconnected`);
        clients?.delete(socket);
        this.buffers.delete(socket);
        if (clients?.size === 0) {
          this.emit('connection', config.portType, false);
        }
      });

      socket.on('error', (err) => {
        console.error(`[Lynx:${config.name}] Socket error:`, err.message);
        this.emit('error', err, config.portType);
      });
    });

    server.on('error', (err) => {
      console.error(`[Lynx:${config.name}] Server error on port ${config.port}:`, err.message);
      this.emit('error', err, config.portType);
    });

    server.listen(config.port, '0.0.0.0', () => {
      console.log(`[Lynx:${config.name}] Listening on port ${config.port}`);
    });

    this.servers.set(config.portType, server);
  }

  private handleData(socket: net.Socket, data: Buffer, config: PortConfig) {
    let buffer = this.buffers.get(socket) || '';
    buffer += data.toString();
    
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    this.buffers.set(socket, buffer);

    for (const line of lines) {
      if (line.trim()) {
        this.parseLine(line, config);
      }
    }
  }

  private parseLine(line: string, config: PortConfig) {
    const packet: LynxPacket = {
      sourcePort: config.port,
      portType: config.portType,
      raw: line,
      timestamp: Date.now(),
    };

    try {
      if (line.trim().startsWith('{')) {
        this.parseJsonLine(line, packet, config);
      } else {
        switch (config.portType) {
          case 'clock':
            this.parseClockLine(line, packet);
            break;
          case 'results':
            this.parseLegacyResultsLine(line, packet);
            break;
          case 'field':
            this.parseLegacyFieldLine(line, packet);
            break;
          case 'start_list':
            this.parseStartListLine(line, packet);
            break;
        }
      }

      this.emit('packet', packet);
    } catch (err) {
      console.error(`[Lynx] Parse error for line: ${line}`, err);
    }
  }

  private parseJsonLine(line: string, packet: LynxPacket, config: PortConfig) {
    try {
      const data = JSON.parse(line);
      const msgType = data.T;
      const msgData = data.D || data;
      
      if (msgData.EN) {
        const eventNum = parseInt(msgData.EN);
        if (!isNaN(eventNum) && eventNum > 0) {
          packet.eventNumber = eventNum;
          if (eventNum !== this.currentEventNumber) {
            this.currentEventNumber = eventNum;
            this.currentHeatNumber = parseInt(msgData.H) || 1;
          }
        }
      }

      switch (msgType) {
        case 'S':
          this.handleStartListMessage(msgData, packet);
          break;
        case 'T':
          this.handleTrackMessage(msgData, packet);
          break;
        case 'F':
          this.handleFieldMessage(msgData, packet);
          break;
        default:
          console.log(`[Lynx] Unknown message type: ${msgType}`);
      }
    } catch (err) {
      console.error(`[Lynx] JSON parse error:`, err);
    }
  }

  private handleStartListMessage(data: any, packet: LynxPacket) {
    const eventNum = parseInt(data.EN) || this.currentEventNumber;
    const heat = parseInt(data.H) || 1;
    const status = data.S || '';
    
    this.isRunning = false;
    this.emit('track-mode-change', eventNum, 'start_list', { 
      eventNumber: eventNum,
      heat,
      status,
      distance: data.DS,
    });

    const entries: LynxStartListEntry[] = [];
    for (const key in data) {
      if (key.startsWith('P') || key === 'L' || key === 'BIB' || key === 'N' || key === 'AF') {
        continue;
      }
    }
    
    if (data.P || data.L || data.N) {
      entries.push({
        place: data.P,
        lane: data.L,
        bib: data.BIB,
        name: data.N,
        affiliation: data.AF,
        firstName: data.FN,
        lastName: data.LN,
      });
      
      this.emit('start-list', eventNum, heat, entries);
    }
  }

  private handleTrackMessage(data: any, packet: LynxPacket) {
    const eventNum = parseInt(data.EN) || this.currentEventNumber;
    const heat = parseInt(data.H) || 1;
    const status = data.S || '';
    const time = data.T;
    const place = data.P;
    const lane = data.L;
    
    packet.eventNumber = eventNum;
    if (time) packet.time = time;
    if (place) packet.place = parseInt(place);
    if (lane) packet.laneNumber = parseInt(lane);
    
    const wasRunning = this.isRunning;
    
    if (status === 'ARMED') {
      this.isRunning = false;
      this.emit('track-mode-change', eventNum, 'start_list', { armed: true, heat });
    } else if (status === 'RUNNING' || (time && !place)) {
      this.isRunning = true;
      if (!wasRunning) {
        this.emit('track-mode-change', eventNum, 'running', { heat, time });
      }
      if (time) {
        this.emit('clock-update', eventNum, time, true);
      }
    } else if (place && time) {
      this.isRunning = false;
      this.emit('track-mode-change', eventNum, 'results', { 
        heat,
        place: parseInt(place),
        time,
        lane: lane ? parseInt(lane) : undefined,
        wind: data.W,
      });
      
      const athleteName = data.N || (data.FN && data.LN ? `${data.FN} ${data.LN}` : undefined);
      this.emit('result', 
        eventNum, 
        lane ? parseInt(lane) : 0, 
        parseInt(place), 
        time, 
        athleteName
      );
    }
  }

  private handleFieldMessage(data: any, packet: LynxPacket) {
    const eventNum = parseInt(data.EN) || this.currentEventNumber;
    const flight = parseInt(data.F) || 1;
    const place = data.P;
    const mark = data.M;
    const attemptNum = parseInt(data.AN) || 1;
    const attempts = data.A;
    const name = data.N;
    
    packet.eventNumber = eventNum;
    if (place) packet.place = parseInt(place);
    if (mark) packet.fieldMark = mark;
    if (attemptNum) packet.attemptNumber = attemptNum;
    if (name) packet.athleteName = name;
    
    this.emit('field-mode-change', eventNum, 'athlete_up', {
      eventNumber: eventNum,
      flight,
      place: place ? parseInt(place) : undefined,
      athleteName: name,
      attemptNumber: attemptNum,
      mark,
      attempts,
      wind: data.W,
    });
    
    if (name) {
      this.emit('field-athlete-up', eventNum, name, attemptNum, mark);
    }
    
    if (name && place && mark) {
      this.emit('field-result', eventNum, name, parseInt(place), mark, attemptNum, attempts);
    }
  }

  private parseClockLine(line: string, packet: LynxPacket) {
    const parts = line.split(/\s+/).filter(Boolean);
    
    if (parts.length >= 1) {
      const eventNum = parseInt(parts[0]);
      if (!isNaN(eventNum) && eventNum > 0) {
        packet.eventNumber = eventNum;
        if (eventNum !== this.currentEventNumber) {
          this.currentEventNumber = eventNum;
          this.isRunning = false;
          this.emit('track-mode-change', eventNum, 'start_list', { eventNumber: eventNum });
        }
      }
    }

    const timeMatch = line.match(/(\d{1,2}:)?\d{1,2}\.\d{2,3}/);
    if (timeMatch) {
      packet.time = timeMatch[0];
      const previousTime = this.lastClockTime;
      const wasRunning = this.isRunning;
      
      const isZero = packet.time === '0:00.00' || packet.time === '0.00' || packet.time === '00.00';
      
      if (!isZero && packet.time !== previousTime) {
        this.isRunning = true;
      } else if (isZero) {
        this.isRunning = false;
      }
      
      if (this.isRunning && !wasRunning) {
        this.emit('track-mode-change', this.currentEventNumber, 'running', { time: packet.time });
      }
      
      this.lastClockTime = packet.time;
      this.emit('clock-update', this.currentEventNumber, packet.time, this.isRunning);
    }

    if (line.includes('ARM') || line.toLowerCase().includes('armed')) {
      packet.status = 'armed';
      this.isRunning = false;
      this.emit('track-mode-change', this.currentEventNumber, 'start_list', { armed: true });
    }

    if (line.includes('RESET') || line.includes('CLR')) {
      this.isRunning = false;
      this.emit('track-mode-change', this.currentEventNumber, 'start_list', { reset: true });
    }
  }

  private parseLegacyResultsLine(line: string, packet: LynxPacket) {
    const parts = line.split(/\s+/).filter(Boolean);
    
    if (parts.length >= 1) {
      const eventNum = parseInt(parts[0]);
      if (!isNaN(eventNum) && eventNum > 0) {
        packet.eventNumber = eventNum;
        if (eventNum !== this.currentEventNumber) {
          this.currentEventNumber = eventNum;
        }
      }
    }

    const placeMatch = line.match(/\b(\d{1,2})(st|nd|rd|th)?\b/i);
    if (placeMatch) {
      packet.place = parseInt(placeMatch[1]);
    }

    const laneMatch = line.match(/\bL(?:ane)?[\s:]*(\d{1,2})\b/i) || line.match(/^\s*(\d{1,2})\s+/);
    if (laneMatch) {
      packet.laneNumber = parseInt(laneMatch[1]);
    }

    const timeMatch = line.match(/(\d{1,2}:)?\d{1,2}\.\d{2,3}/);
    if (timeMatch) {
      packet.time = timeMatch[0];
    }

    const nameMatch = line.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/);
    if (nameMatch) {
      packet.athleteName = nameMatch[0];
    }

    if (packet.place && packet.time) {
      this.isRunning = false;
      this.emit('track-mode-change', this.currentEventNumber, 'results', { 
        place: packet.place, 
        time: packet.time,
        lane: packet.laneNumber 
      });
      
      this.emit('result', 
        this.currentEventNumber, 
        packet.laneNumber || 0, 
        packet.place, 
        packet.time, 
        packet.athleteName
      );
    }
  }

  private parseLegacyFieldLine(line: string, packet: LynxPacket) {
    const parts = line.split(/\s+/).filter(Boolean);
    
    if (parts.length >= 1) {
      const eventNum = parseInt(parts[0]);
      if (!isNaN(eventNum) && eventNum > 0) {
        packet.eventNumber = eventNum;
        if (eventNum !== this.currentEventNumber) {
          this.currentEventNumber = eventNum;
          this.emit('field-mode-change', eventNum, 'athlete_up', { eventNumber: eventNum });
        }
      }
    }

    const attemptMatch = line.match(/\b(Att|Attempt|Try)[\s:#]*(\d+)\b/i);
    if (attemptMatch) {
      packet.attemptNumber = parseInt(attemptMatch[2]);
    }

    const heightMatch = line.match(/(\d+\.\d{2})\s*m/i);
    if (heightMatch) {
      packet.fieldMark = heightMatch[1];
    }

    const distanceMatch = line.match(/(\d+-\d{1,2}(?:\.\d+)?)/);
    if (distanceMatch) {
      packet.fieldMark = distanceMatch[1];
    }

    const xoMatch = line.match(/\b([XOP-])\b/);
    if (xoMatch) {
      const result = xoMatch[1].toUpperCase();
      if (result === 'X' || result === 'O' || result === 'P' || result === '-') {
        packet.attemptResult = result as 'X' | 'O' | 'P' | '-';
      }
    }

    const nameMatch = line.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/);
    if (nameMatch) {
      packet.athleteName = nameMatch[0];
    }

    if (packet.athleteName || packet.attemptNumber) {
      this.emit('field-mode-change', this.currentEventNumber, 'athlete_up', {
        athlete: packet.athleteName,
        attempt: packet.attemptNumber,
        mark: packet.fieldMark,
        result: packet.attemptResult,
      });
      
      if (packet.athleteName) {
        this.emit('field-athlete-up', 
          this.currentEventNumber,
          packet.athleteName,
          packet.attemptNumber || 1,
          packet.fieldMark
        );
      }
    }

    if (packet.attemptResult) {
      this.emit('field-mode-change', this.currentEventNumber, 'result_posted', {
        result: packet.attemptResult,
        mark: packet.fieldMark,
      });
    }
  }

  private parseStartListLine(line: string, packet: LynxPacket) {
    const parts = line.split(/\s+/).filter(Boolean);
    
    if (parts.length >= 1) {
      const eventNum = parseInt(parts[0]);
      if (!isNaN(eventNum) && eventNum > 0) {
        packet.eventNumber = eventNum;
        if (eventNum !== this.currentEventNumber) {
          this.currentEventNumber = eventNum;
          this.emit('track-mode-change', eventNum, 'start_list', { eventNumber: eventNum });
        }
      }
    }

    const heatMatch = line.match(/\b[Hh]eat[\s:]*(\d+)\b/);
    if (heatMatch) {
      packet.heatNumber = parseInt(heatMatch[1]);
      this.currentHeatNumber = packet.heatNumber;
    }

    const laneMatch = line.match(/\bL(?:ane)?[\s:]*(\d{1,2})\b/i);
    if (laneMatch) {
      packet.laneNumber = parseInt(laneMatch[1]);
    }

    const nameMatch = line.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/);
    if (nameMatch) {
      packet.athleteName = nameMatch[0];
    }
  }

  stop() {
    Array.from(this.servers.entries()).forEach(([portType, server]) => {
      server.close(() => {
        console.log(`[Lynx] Stopped listener for ${portType}`);
      });
      
      const clients = this.clients.get(portType);
      if (clients) {
        Array.from(clients).forEach(client => {
          client.destroy();
        });
        clients.clear();
      }
    });
    this.servers.clear();
  }

  getStatus(): { portType: LynxPortType; connected: boolean; clientCount: number }[] {
    return this.configs.map(config => ({
      portType: config.portType,
      connected: (this.clients.get(config.portType)?.size || 0) > 0,
      clientCount: this.clients.get(config.portType)?.size || 0,
    }));
  }

  getCurrentEventNumber(): number {
    return this.currentEventNumber;
  }

  getCurrentHeatNumber(): number {
    return this.currentHeatNumber;
  }

  isClockRunning(): boolean {
    return this.isRunning;
  }

  getLastClockTime(): string {
    return this.lastClockTime;
  }
}

export const lynxListener = new LynxListener();
