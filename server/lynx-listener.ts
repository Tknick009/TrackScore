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
  bestMark?: string;
  orderOfDraw?: string;
  orderOfDrawName?: string;
  attemptMarks?: string[];
}

// Clean event name by removing common suffixes like "Run" and "Dash" from FinishLynx
function cleanEventName(name: string | undefined): string | undefined {
  if (!name) return name;
  // Replace "Meter" or "Meters" with "M" (e.g., "Men 3000 Meter Steeplechase" -> "Men 3000M Steeplechase")
  let cleaned = name.replace(/(\d)\s*Meters?\b/gi, '$1M');
  // Remove trailing "Run" or "Dash" (case-insensitive, with optional leading space)
  cleaned = cleaned.replace(/\s*(Run|Dash)\s*$/i, '').trim();
  return cleaned;
}

interface AggregatedEvent {
  eventNumber: number;
  heat: number;
  round: number;
  distance?: string;
  eventName?: string;
  status?: string;
  wind?: string;
  entries: Array<LynxStartListEntry | LynxTrackResult | LynxFieldResult>;
  lastUpdate: number;
  firstUpdate: number; // Track when aggregation started for max wait time
  emitScheduled?: boolean; // Prevent scheduling multiple emits
  type: 'S' | 'T' | 'F';
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
  
  private aggregatedEvents: Map<string, AggregatedEvent> = new Map();
  private aggregationTimeout: number = 250;
  
  // Persist event names by event number so results can use start list's event name
  private eventNamesByNumber: Map<number, string> = new Map();

  constructor() {
    super();
  }
  
  private getAggregationKey(eventNum: number, heat: number, type: string, round: number = 1, port?: string): string {
    return `${type}-${eventNum}-${round}-${heat}${port ? `-${port}` : ''}`;
  }
  
  private scheduleAggregationEmit(key: string) {
    const event = this.aggregatedEvents.get(key);
    if (!event) return;
    
    // Only schedule one emit per aggregation period
    if (event.emitScheduled) return;
    event.emitScheduled = true;
    
    // Use a max wait time from first message (500ms) to ensure we emit
    // even when messages are streaming continuously
    const maxWaitTime = 500;
    const waitTime = Math.max(50, maxWaitTime - (Date.now() - event.firstUpdate));
    
    setTimeout(() => {
      const currentEvent = this.aggregatedEvents.get(key);
      if (currentEvent) {
        this.emitAggregatedEvent(key, currentEvent);
        this.aggregatedEvents.delete(key);
      }
    }, waitTime);
  }
  
  private emitAggregatedEvent(key: string, event: AggregatedEvent) {
    // Sort entries before emitting: by lane for start list, by place for results
    const sortedEntries = [...event.entries].sort((a: any, b: any) => {
      if (event.type === 'S') {
        // Start list: sort by lane number
        const laneA = parseInt(a.lane) || 999;
        const laneB = parseInt(b.lane) || 999;
        return laneA - laneB;
      } else if (event.type === 'T') {
        // Track results: sort by place if available, otherwise by lane
        const hasPlaceA = a.place && a.place !== '';
        const hasPlaceB = b.place && b.place !== '';
        if (hasPlaceA && hasPlaceB) {
          // Both have places - sort by place
          const placeA = parseInt(a.place) || 999;
          const placeB = parseInt(b.place) || 999;
          return placeA - placeB;
        } else {
          // Running mode - sort by lane
          const laneA = parseInt(a.lane) || 999;
          const laneB = parseInt(b.lane) || 999;
          return laneA - laneB;
        }
      }
      return 0;
    });
    
    switch (event.type) {
      case 'S':
        // Suppress start_list mode change when race is already running
        // FinishLynx sends S packets even after race starts - ignore them during running mode
        if (this.isRunning) {
          console.log(`[Lynx] Suppressing start_list emission - race is running (event ${event.eventNumber})`);
          return;
        }
        this.emit('start-list', event.eventNumber, event.heat, sortedEntries as LynxStartListEntry[]);
        this.emit('track-mode-change', event.eventNumber, 'start_list', {
          eventNumber: event.eventNumber,
          heat: event.heat,
          distance: event.distance,
          eventName: event.eventName,
          entries: sortedEntries,
        });
        break;
      case 'T':
        if (sortedEntries.some(e => (e as LynxTrackResult).place && (e as LynxTrackResult).time)) {
          this.emit('track-mode-change', event.eventNumber, 'results', {
            eventNumber: event.eventNumber,
            heat: event.heat,
            distance: event.distance,
            wind: event.wind,
            eventName: event.eventName,
            entries: sortedEntries,
          });
        }
        break;
      case 'F':
        this.emit('field-mode-change', event.eventNumber, 'standings', {
          eventNumber: event.eventNumber,
          flight: event.heat,
          eventName: event.eventName,
          results: sortedEntries,
        });
        break;
    }
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

  /**
   * Process data that was forwarded via HTTP from a remote TCP forwarder.
   * This allows the Lynx listener to work when FinishLynx/FieldLynx are on
   * a different network and can't connect directly via TCP.
   */
  processForwardedData(data: string, portType: LynxPortType, portName: string = 'HTTP Forward') {
    const config: PortConfig = {
      port: 0,
      portType,
      name: portName,
    };
    
    // Process each line of data
    const lines = data.split(/\r?\n/).filter(l => l.trim());
    // Log non-clock data for debugging (skip frequent clock updates)
    if (lines.length > 0 && !data.includes('"t":') && !data.includes('"time":')) {
      console.log(`[Lynx:Forward] ${portType}: ${lines[0].substring(0, 150)}`);
    }
    for (const line of lines) {
      this.parseLine(line, config);
    }
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
    
    const { objects, remaining } = this.extractJsonObjects(buffer);
    this.buffers.set(socket, remaining);
    
    for (const obj of objects) {
      if (obj.trim()) {
        this.parseLine(obj, config);
      }
    }
  }
  
  private extractJsonObjects(buffer: string): { objects: string[]; remaining: string } {
    const objects: string[] = [];
    let remaining = buffer;
    
    while (remaining.length > 0) {
      const startIdx = remaining.indexOf('{');
      if (startIdx === -1) {
        if (remaining.includes('\n')) {
          const lines = remaining.split(/\r?\n/).filter(l => l.trim());
          for (const line of lines) {
            if (!line.startsWith('{')) {
              objects.push(line);
            }
          }
          remaining = '';
        }
        break;
      }
      
      if (startIdx > 0) {
        const preContent = remaining.slice(0, startIdx).trim();
        if (preContent) {
          const lines = preContent.split(/\r?\n/).filter(l => l.trim());
          for (const line of lines) {
            objects.push(line);
          }
        }
        remaining = remaining.slice(startIdx);
      }
      
      let braceDepth = 0;
      let endIdx = -1;
      let inString = false;
      let escape = false;
      
      for (let i = 0; i < remaining.length; i++) {
        const char = remaining[i];
        
        if (escape) {
          escape = false;
          continue;
        }
        
        if (char === '\\' && inString) {
          escape = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            braceDepth++;
          } else if (char === '}') {
            braceDepth--;
            if (braceDepth === 0) {
              endIdx = i;
              break;
            }
          }
        }
      }
      
      if (endIdx !== -1) {
        const jsonStr = remaining.slice(0, endIdx + 1);
        objects.push(jsonStr);
        remaining = remaining.slice(endIdx + 1).replace(/^[\r\n]+/, '');
      } else {
        break;
      }
    }
    
    return { objects, remaining };
  }

  private sanitizeForJson(input: string): string {
    let result = '';
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      if (code === 0x09 || code === 0x0A || code === 0x0D || code >= 0x20) {
        result += input[i];
      }
    }
    return result;
  }
  
  private parseLine(line: string, config: PortConfig) {
    const sanitized = this.sanitizeForJson(line);
    const packet: LynxPacket = {
      sourcePort: config.port,
      portType: config.portType,
      raw: sanitized,
      timestamp: Date.now(),
    };

    try {
      if (sanitized.trim().startsWith('{')) {
        this.parseJsonLine(sanitized, packet, config);
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

      // Handle clock data without a type field (e.g., {t: "0:12.34"} or {time: "0:12.34"})
      if (!msgType && config.portType === 'clock') {
        const timeValue = data.t || data.time;
        const command = data.c;
        
        if (command === 'armed') {
          this.isRunning = false;
          this.lastClockTime = '0:00.00';
          this.emit('track-mode-change', this.currentEventNumber, 'start_list', { armed: true });
          this.emit('clock-update', this.currentEventNumber, '0:00.00', false);
        } else if (timeValue) {
          const wasRunning = this.isRunning;
          const isZero = timeValue === '0:00.00' || timeValue === '0.00' || timeValue === '00.00';
          
          if (!isZero && timeValue !== this.lastClockTime) {
            this.isRunning = true;
          } else if (isZero) {
            this.isRunning = false;
          }
          
          // Emit track-mode-change when transitioning to running
          if (this.isRunning && !wasRunning) {
            this.emit('track-mode-change', this.currentEventNumber, 'running', { time: timeValue });
          }
          
          this.lastClockTime = timeValue;
          this.emit('clock-update', this.currentEventNumber, timeValue, this.isRunning);
        }
        return;
      }

      switch (msgType) {
        case 'S':
          this.handleStartListMessage(msgData, packet, config.name);
          break;
        case 'T':
          this.handleTrackMessage(msgData, packet, config.name);
          break;
        case 'F':
          this.handleFieldMessage(msgData, packet, config.name);
          break;
        default:
          if (msgType) {
            console.log(`[Lynx] Unknown message type: ${msgType}`);
          }
      }
    } catch (err) {
      console.error(`[Lynx] JSON parse error:`, err);
    }
  }

  private handleStartListMessage(data: any, packet: LynxPacket, portName?: string) {
    const eventNum = parseInt(data.EN) || this.currentEventNumber;
    const heat = parseInt(data.H) || 1;
    const round = parseInt(data.R) || 1;
    const status = data.S || '';
    const distance = data.DS || '';
    const eventName = cleanEventName(data.DN || '');
    
    // Persist event name by event number so results can use it
    if (eventName) {
      this.eventNamesByNumber.set(eventNum, eventName);
    }
    
    this.isRunning = false;
    
    const key = this.getAggregationKey(eventNum, heat, 'S', round, portName);
    let aggregated = this.aggregatedEvents.get(key);
    
    // Use persisted event name if DN not in this message
    const resolvedEventName = eventName || this.eventNamesByNumber.get(eventNum);
    
    if (!aggregated) {
      const now = Date.now();
      aggregated = {
        eventNumber: eventNum,
        heat,
        round,
        distance,
        eventName: resolvedEventName,
        status,
        entries: [],
        lastUpdate: now,
        firstUpdate: now,
        type: 'S',
      };
      this.aggregatedEvents.set(key, aggregated);
    } else if (resolvedEventName && !aggregated.eventName) {
      aggregated.eventName = resolvedEventName;
    }
    
    if (data.L || data.N || data.BIB) {
      const entry: LynxStartListEntry = {
        place: data.P,
        lane: data.L,
        bib: data.BIB,
        name: data.N,
        affiliation: data.AF,
        firstName: data.FN,
        lastName: data.LN,
      };
      
      const existingIdx = aggregated.entries.findIndex(
        e => (e as LynxStartListEntry).lane === entry.lane || 
             (e as LynxStartListEntry).bib === entry.bib
      );
      
      if (existingIdx >= 0) {
        aggregated.entries[existingIdx] = entry;
      } else {
        aggregated.entries.push(entry);
      }
      
      aggregated.lastUpdate = Date.now();
    }
    
    this.scheduleAggregationEmit(key);
  }

  private handleTrackMessage(data: any, packet: LynxPacket, portName?: string) {
    const eventNum = parseInt(data.EN) || this.currentEventNumber;
    const heat = parseInt(data.H) || 1;
    const round = parseInt(data.R) || 1;
    const status = data.S || '';
    const wind = data.W || '';
    const distance = data.DS || '';
    const eventName = cleanEventName(data.DN || '');
    const time = data.T;
    const place = data.P;
    const lane = data.L;
    
    // Persist event name by event number so it's available for results
    if (eventName) {
      this.eventNamesByNumber.set(eventNum, eventName);
    }
    
    packet.eventNumber = eventNum;
    if (time) packet.time = time;
    if (place) packet.place = parseInt(place);
    if (lane) packet.laneNumber = parseInt(lane);
    
    const wasRunning = this.isRunning;
    
    if (status === 'ARMED') {
      this.isRunning = false;
      this.emit('track-mode-change', eventNum, 'start_list', { armed: true, heat });
      return;
    }
    
    if (status === 'RUNNING' || (time && !place)) {
      this.isRunning = true;
      if (!wasRunning) {
        this.emit('track-mode-change', eventNum, 'running', { heat, time });
      }
      if (time) {
        this.emit('clock-update', eventNum, time, true);
      }
      // Don't return - continue to aggregate athlete entries with running times
    }
    
    if (lane || data.N || data.BIB) {
      const key = this.getAggregationKey(eventNum, heat, 'T', round, portName);
      let aggregated = this.aggregatedEvents.get(key);
      
      // Use persisted event name if DN not in this message
      const resolvedEventName = eventName || this.eventNamesByNumber.get(eventNum);
      
      if (!aggregated) {
        const now = Date.now();
        aggregated = {
          eventNumber: eventNum,
          heat,
          round,
          distance,
          eventName: resolvedEventName,
          status,
          wind,
          entries: [],
          lastUpdate: now,
          firstUpdate: now,
          type: 'T',
        };
        this.aggregatedEvents.set(key, aggregated);
      } else if (resolvedEventName && !aggregated.eventName) {
        // Update eventName if we have it now and didn't before
        aggregated.eventName = resolvedEventName;
      }
      
      const athleteName = data.N || (data.FN && data.LN ? `${data.FN} ${data.LN}` : undefined);
      
      const entry: LynxTrackResult = {
        place: place,
        lane: lane,
        bib: data.BIB,
        name: athleteName,
        affiliation: data.AF,
        time: time,
        reactionTime: data.RT,
        lapsToGo: data.L2G,
        cumulativeSplit: data.CS,
        lastSplit: data.LS,
        firstName: data.FN,
        lastName: data.LN,
      };
      
      const existingIdx = aggregated.entries.findIndex(
        e => (e as LynxTrackResult).lane === entry.lane || 
             (e as LynxTrackResult).bib === entry.bib
      );
      
      if (existingIdx >= 0) {
        aggregated.entries[existingIdx] = entry;
      } else {
        aggregated.entries.push(entry);
      }
      
      aggregated.lastUpdate = Date.now();
      
      if (place && time) {
        this.isRunning = false;
        this.emit('result', 
          eventNum, 
          lane ? parseInt(lane) : 0, 
          parseInt(place), 
          time, 
          athleteName
        );
      }
      
      this.scheduleAggregationEmit(key);
    }
  }

  private handleFieldMessage(data: any, packet: LynxPacket, portName?: string) {
    const eventNum = parseInt(data.EN) || this.currentEventNumber;
    const flight = parseInt(data.F) || 1;
    const round = parseInt(data.R) || 1;
    const place = data.P;
    // M is mark field, DS is distance/standing field - use either one if valid (not "0" or empty)
    const rawMark = data.M || data.DS;
    const mark = (rawMark && rawMark !== '0' && rawMark !== '') ? rawMark : undefined;
    const attemptNum = parseInt(data.AN) || 1;
    const attempts = data.A;
    const name = data.N;
    const wind = data.W || '';
    const officialStatus = data.U || '';
    const eventName = cleanEventName(data.DN || '');
    
    // Persist event name by event number so it's available for results
    if (eventName) {
      this.eventNamesByNumber.set(eventNum, eventName);
    }
    
    packet.eventNumber = eventNum;
    if (place) packet.place = parseInt(place);
    if (mark) packet.fieldMark = mark;
    if (attemptNum) packet.attemptNumber = attemptNum;
    if (name) packet.athleteName = name;
    
    if (name || data.BIB) {
      const key = this.getAggregationKey(eventNum, flight, 'F', round, portName);
      let aggregated = this.aggregatedEvents.get(key);
      
      // Use persisted event name if DN not in this message
      const resolvedEventName = eventName || this.eventNamesByNumber.get(eventNum);
      
      if (!aggregated) {
        const now = Date.now();
        aggregated = {
          eventNumber: eventNum,
          heat: flight,
          round,
          status: officialStatus,
          wind,
          eventName: resolvedEventName,
          entries: [],
          lastUpdate: now,
          firstUpdate: now,
          type: 'F',
        };
        this.aggregatedEvents.set(key, aggregated);
      } else if (resolvedEventName && !aggregated.eventName) {
        aggregated.eventName = resolvedEventName;
      }
      
      const attemptMarks: string[] = [];
      for (let i = 1; i <= 6; i++) {
        const attemptKey = `M${i}`;
        if (data[attemptKey]) {
          attemptMarks.push(data[attemptKey]);
        }
      }
      
      const entry: LynxFieldResult = {
        place: place,
        name: name,
        affiliation: data.AF,
        bib: data.BIB,
        mark: mark,
        attemptNumber: data.AN,
        attempts: attempts,
        wind: wind,
        markConverted: data.MC,
        bestMark: data.FSM,
        orderOfDraw: data.OD,
        orderOfDrawName: data.ODN,
        attemptMarks: attemptMarks.length > 0 ? attemptMarks : undefined,
      };
      
      const existingIdx = aggregated.entries.findIndex(
        e => (e as LynxFieldResult).bib === entry.bib || 
             (e as LynxFieldResult).name === entry.name
      );
      
      if (existingIdx >= 0) {
        aggregated.entries[existingIdx] = entry;
      } else {
        aggregated.entries.push(entry);
      }
      
      aggregated.lastUpdate = Date.now();
      
      this.emit('field-athlete-up', eventNum, name || '', attemptNum, mark);
      
      if (name && mark) {
        this.emit('field-result', eventNum, name, place ? parseInt(place) : 0, mark, attemptNum, attempts);
      }
      
      this.scheduleAggregationEmit(key);
    } else {
      this.emit('field-mode-change', eventNum, 'athlete_up', {
        eventNumber: eventNum,
        flight,
        officialStatus,
      });
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
