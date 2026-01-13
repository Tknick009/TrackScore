/**
 * ResulTV Parser
 * 
 * Parses the binary ResulTV/LSS format from FinishLynx.
 * 
 * LSS Format Reference:
 * - Group codes: \10-\17 indicate message type
 * - Variable codes: \00-\0f indicate field type within group
 * - Field separator: \05 (ENQ) or \03\04 marks end of field
 * - Line terminator: \0a (LF) or \03\04
 * 
 * Group Codes:
 *   \10 = Initialize
 *   \11 = Time (TimeRunning, TimeStopped, TimeOfDay)
 *   \12 = Wind
 *   \13 = Results Header/Trailer (also StartList Header/Trailer)
 *   \14 = Result/StartList entry
 *   \15 = Message Header/Trailer
 *   \16 = Message
 *   \17 = Break Time
 * 
 * Variable Codes for \14 (Result/StartList):
 *   \01 = Place
 *   \02 = Lane
 *   \03 = Id (BIB)
 *   \04 = Name
 *   \05 = Affiliation
 *   \06 = Time
 *   \07 = Delta Time
 *   \08 = Cumulative Split Time
 *   \09 = Last Split Time
 *   \0a = Laps To Go
 *   \0b = License
 *   \0c = ReacTime
 *   \0d = Speed
 *   \0e = Pace
 *   \0f = Best Split Time
 */

import { EventEmitter } from 'events';

// Parsed entry from ResulTV
export interface ResulTVEntry {
  line: number;
  place?: string;
  lane?: string;
  bib?: string;
  name?: string;
  affiliation?: string;
  time?: string;
  deltaTime?: string;
  cumulativeSplit?: string;
  lastSplit?: string;
  lapsToGo?: string;
  license?: string;
  reactionTime?: string;
  speed?: string;
  pace?: string;
  bestSplit?: string;
}

// Parsed header info
export interface ResulTVHeader {
  status?: string;
  eventName?: string;
  wind?: string;
  eventNumber?: string;
  roundNumber?: string;
  heatNumber?: string;
  startType?: string;
  participantCount?: string;
}

// Layout command
export interface LayoutCommand {
  command: string;
  name?: string;
  window?: string;
  clear?: string;
}

// Complete page state for broadcasting
export interface ResulTVPage {
  mode: 'start_list' | 'running_time' | 'results' | 'idle';
  header: ResulTVHeader;
  entries: ResulTVEntry[];
  clock: string;
  clockRunning: boolean;
  wind?: string;
  timestamp: number;
}

export class ResulTVParser extends EventEmitter {
  private buffer: Buffer = Buffer.alloc(0);
  
  // Current state
  private currentMode: 'start_list' | 'running_time' | 'results' | 'idle' = 'idle';
  private currentHeader: ResulTVHeader = {};
  private currentEntries: Map<number, ResulTVEntry> = new Map();
  private currentClock: string = '0:00.00';
  private clockRunning: boolean = false;
  private currentWind: string = '';
  private currentLineIndex: number = 0;
  private currentEntry: Partial<ResulTVEntry> = {};
  
  // Debounce timer for batched broadcasts
  private broadcastTimer: NodeJS.Timeout | null = null;
  private readonly BROADCAST_DEBOUNCE_MS = 50;
  
  constructor() {
    super();
  }
  
  /**
   * Process raw bytes from FinishLynx
   */
  processRawData(data: Buffer, portType: string): void {
    this.buffer = Buffer.concat([this.buffer, data]);
    this.processBuffer(portType);
  }
  
  /**
   * Process buffer looking for complete messages
   */
  private processBuffer(portType: string): void {
    let startIndex = 0;
    
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === 0x0a) {
        const message = this.buffer.slice(startIndex, i);
        if (message.length > 0) {
          this.parseMessage(message, portType);
        }
        startIndex = i + 1;
      }
      else if (i > 0 && this.buffer[i-1] === 0x03 && this.buffer[i] === 0x04) {
        const message = this.buffer.slice(startIndex, i - 1);
        if (message.length > 0) {
          this.parseMessage(message, portType);
        }
        startIndex = i + 1;
      }
    }
    
    this.buffer = this.buffer.slice(startIndex);
  }
  
  /**
   * Parse a complete message
   */
  private parseMessage(data: Buffer, portType: string): void {
    const text = data.toString('latin1');
    
    // Check for layout commands (ASCII text starting with "Command=")
    if (text.includes('Command=')) {
      this.parseLayoutCommand(text);
      return;
    }
    
    if (data.length < 2) {
      // Try parsing as plain text clock
      if (portType === 'clock') {
        this.parseClockText(text);
      }
      return;
    }
    
    const groupCode = data[0];
    const varCode = data[1];
    
    // Debug logging for first few bytes
    if (process.env.DEBUG_LYNX) {
      const hexBytes = Array.from(data.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`[ResulTV] ${portType}: group=0x${groupCode.toString(16)} var=0x${varCode.toString(16)} bytes=[${hexBytes}] text="${text.slice(0, 30)}"`);
    }
    
    switch (groupCode) {
      case 0x10:  // Initialize
        this.resetState();
        this.emit('initialize');
        break;
        
      case 0x11:  // Time
        this.parseTimeMessage(data, varCode, portType);
        break;
        
      case 0x12:  // Wind
        this.parseWindMessage(data, varCode);
        break;
        
      case 0x13:  // Header/Trailer
        this.parseHeaderMessage(data, varCode);
        break;
        
      case 0x14:  // Result/StartList entry
        this.parseEntryMessage(data, varCode);
        break;
        
      case 0x15:  // Message Header/Trailer
        break;
        
      case 0x16:  // Message text
        break;
        
      default:
        // May be plain text data - check for time format
        if (portType === 'clock') {
          this.parseClockText(text);
        } else if (process.env.DEBUG_LYNX) {
          console.log(`[ResulTV] Unknown group code 0x${groupCode.toString(16)} from ${portType}`);
        }
    }
  }
  
  /**
   * Reset state on new layout
   */
  private resetState(): void {
    this.currentHeader = {};
    this.currentEntries.clear();
    this.currentLineIndex = 0;
    this.currentEntry = {};
  }
  
  /**
   * Parse layout command from text
   */
  private parseLayoutCommand(text: string): void {
    const cmd: LayoutCommand = { command: 'LayoutDraw' };
    
    const params = text.split(';');
    for (const param of params) {
      const [key, value] = param.split('=');
      if (!key || !value) continue;
      
      switch (key.trim()) {
        case 'Command':
          cmd.command = value.trim();
          break;
        case 'Name':
          cmd.name = value.trim();
          break;
        case 'Window':
          cmd.window = value.trim();
          break;
        case 'Clear':
          cmd.clear = value.trim();
          break;
      }
    }
    
    if (cmd.name) {
      console.log(`[ResulTV] Layout command: ${cmd.name}`);
      
      // Update mode based on layout name
      const layoutLower = cmd.name.toLowerCase();
      if (layoutLower.includes('start')) {
        this.currentMode = 'start_list';
      } else if (layoutLower.includes('running') || layoutLower.includes('time')) {
        this.currentMode = 'running_time';
      } else if (layoutLower.includes('result')) {
        this.currentMode = 'results';
      }
      
      // Clear on new layout
      if (cmd.clear === '1' || cmd.clear === '2') {
        this.resetState();
      }
      
      this.emit('layout-command', cmd.name, cmd);
      this.scheduleBroadcast();
    }
  }
  
  /**
   * Parse time message
   */
  private parseTimeMessage(data: Buffer, varCode: number, portType: string): void {
    if (varCode === 0x01) {
      const timeText = this.extractFieldValue(data, 2);
      if (timeText) {
        const time = timeText.trim();
        this.currentClock = time;
        
        // Determine if clock is running based on mode
        this.clockRunning = this.currentMode === 'running_time';
        
        this.emit('clock', time, this.clockRunning);
        this.scheduleBroadcast();
      }
    } else if (varCode === 0x02) {
      if (data.length >= 6) {
        const ms = data.readUInt32LE(2);
        const formatted = this.formatTime(ms);
        this.currentClock = formatted;
        this.clockRunning = this.currentMode === 'running_time';
        
        this.emit('clock', formatted, this.clockRunning);
        this.scheduleBroadcast();
      }
    }
  }
  
  /**
   * Parse wind message
   */
  private parseWindMessage(data: Buffer, varCode: number): void {
    if (varCode === 0x01) {
      const windText = this.extractFieldValue(data, 2);
      if (windText) {
        this.currentWind = windText.trim();
        this.emit('wind', this.currentWind);
        this.scheduleBroadcast();
      }
    }
  }
  
  /**
   * Parse header message
   */
  private parseHeaderMessage(data: Buffer, varCode: number): void {
    const value = this.extractFieldValue(data, 2);
    if (!value) return;
    
    const fieldNames: { [key: number]: keyof ResulTVHeader } = {
      0x01: 'status',
      0x02: 'eventName',
      0x03: 'wind',
      0x04: 'eventNumber',
      0x05: 'roundNumber',
      0x06: 'heatNumber',
      0x07: 'startType',
      0x08: 'participantCount',
    };
    
    const fieldName = fieldNames[varCode];
    if (fieldName) {
      this.currentHeader[fieldName] = value.trim();
      this.scheduleBroadcast();
    }
  }
  
  /**
   * Parse entry message - accumulates fields into current entry
   */
  private parseEntryMessage(data: Buffer, varCode: number): void {
    const value = this.extractFieldValue(data, 2);
    if (!value) return;
    
    const fieldNames: { [key: number]: keyof ResulTVEntry } = {
      0x01: 'place',
      0x02: 'lane',
      0x03: 'bib',
      0x04: 'name',
      0x05: 'affiliation',
      0x06: 'time',
      0x07: 'deltaTime',
      0x08: 'cumulativeSplit',
      0x09: 'lastSplit',
      0x0a: 'lapsToGo',
      0x0b: 'license',
      0x0c: 'reactionTime',
      0x0d: 'speed',
      0x0e: 'pace',
      0x0f: 'bestSplit',
    };
    
    const fieldName = fieldNames[varCode];
    if (fieldName) {
      const trimmedValue = value.trim();
      
      // If we get 'place' (first field), this starts a new entry
      if (fieldName === 'place') {
        // Save previous entry if exists
        if (Object.keys(this.currentEntry).length > 0) {
          this.saveCurrentEntry();
        }
        // Start new entry
        this.currentEntry = { line: this.currentLineIndex };
        this.currentLineIndex++;
      }
      
      (this.currentEntry as any)[fieldName] = trimmedValue;
      
      // If we get 'time' (last common field), save the entry
      if (fieldName === 'time' || fieldName === 'affiliation') {
        this.saveCurrentEntry();
      }
      
      this.scheduleBroadcast();
    }
  }
  
  /**
   * Save current entry to the entries map
   */
  private saveCurrentEntry(): void {
    if (this.currentEntry.line !== undefined) {
      this.currentEntries.set(this.currentEntry.line!, this.currentEntry as ResulTVEntry);
    }
    this.currentEntry = {};
  }
  
  /**
   * Parse plain text clock data
   */
  private parseClockText(text: string): void {
    const timeMatch = text.match(/\d{1,2}:\d{2}\.\d{2}/);
    if (timeMatch) {
      this.currentClock = timeMatch[0];
      this.clockRunning = true;
      this.emit('clock', timeMatch[0], true);
      this.scheduleBroadcast();
    }
  }
  
  /**
   * Extract field value from data
   */
  private extractFieldValue(data: Buffer, startIndex: number): string | null {
    if (startIndex >= data.length) return null;
    
    let endIndex = data.length;
    
    for (let i = startIndex; i < data.length; i++) {
      if (data[i] === 0x05 || data[i] === 0x03 || data[i] === 0x04) {
        endIndex = i;
        break;
      }
    }
    
    return data.slice(startIndex, endIndex).toString('latin1');
  }
  
  /**
   * Format milliseconds to time string
   */
  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  }
  
  /**
   * Schedule a debounced broadcast of the current page state
   */
  private scheduleBroadcast(): void {
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
    }
    
    this.broadcastTimer = setTimeout(() => {
      this.broadcastCurrentPage();
      this.broadcastTimer = null;
    }, this.BROADCAST_DEBOUNCE_MS);
  }
  
  /**
   * Broadcast the current complete page state
   */
  private broadcastCurrentPage(): void {
    // Save any pending entry
    if (Object.keys(this.currentEntry).length > 0) {
      this.saveCurrentEntry();
    }
    
    // Build entries array sorted by line number
    const entries: ResulTVEntry[] = Array.from(this.currentEntries.values())
      .sort((a, b) => (a.line || 0) - (b.line || 0));
    
    const page: ResulTVPage = {
      mode: this.currentMode,
      header: { ...this.currentHeader },
      entries,
      clock: this.currentClock,
      clockRunning: this.clockRunning,
      wind: this.currentWind || undefined,
      timestamp: Date.now(),
    };
    
    console.log(`[ResulTV] Broadcasting page: mode=${page.mode}, entries=${entries.length}, clock=${page.clock}`);
    this.emit('page', page);
  }
  
  /**
   * Get current page state (for direct access)
   */
  getCurrentPage(): ResulTVPage {
    const entries: ResulTVEntry[] = Array.from(this.currentEntries.values())
      .sort((a, b) => (a.line || 0) - (b.line || 0));
    
    return {
      mode: this.currentMode,
      header: { ...this.currentHeader },
      entries,
      clock: this.currentClock,
      clockRunning: this.clockRunning,
      wind: this.currentWind || undefined,
      timestamp: Date.now(),
    };
  }
}

// Singleton instance
let parserInstance: ResulTVParser | null = null;

export function getResulTVParser(): ResulTVParser {
  if (!parserInstance) {
    parserInstance = new ResulTVParser();
  }
  return parserInstance;
}
