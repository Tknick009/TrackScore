import * as fs from 'fs';
import * as path from 'path';

export interface CaptureChunk {
  timestamp: string;
  port: number;
  portName: string;
  remoteAddress: string;
  rawHex: string;
  rawAscii: string;
  rawText: string;
  byteLength: number;
}

export interface CaptureSession {
  id: string;
  startedAt: string;
  chunks: CaptureChunk[];
  active: boolean;
}

type BroadcastFn = (chunk: CaptureChunk) => void;

class CaptureManager {
  private session: CaptureSession | null = null;
  private maxChunks = 500;
  private broadcastFns: BroadcastFn[] = [];
  private logFile: fs.WriteStream | null = null;
  private captureDir = './data/captures';

  onBroadcast(fn: BroadcastFn) {
    this.broadcastFns.push(fn);
  }

  offBroadcast(fn: BroadcastFn) {
    this.broadcastFns = this.broadcastFns.filter(f => f !== fn);
  }

  start(): CaptureSession {
    if (this.logFile) {
      this.logFile.end();
      this.logFile = null;
    }

    const id = new Date().toISOString().replace(/[:.]/g, '-');
    this.session = {
      id,
      startedAt: new Date().toISOString(),
      chunks: [],
      active: true,
    };

    try {
      if (!fs.existsSync(this.captureDir)) {
        fs.mkdirSync(this.captureDir, { recursive: true });
      }
      const filePath = path.join(this.captureDir, `capture-${id}.log`);
      this.logFile = fs.createWriteStream(filePath, { flags: 'a' });
      this.logFile.write(`=== Capture started at ${this.session.startedAt} ===\n\n`);
    } catch (e) {
      console.warn('[CaptureManager] Could not open log file:', (e as any)?.message);
    }

    console.log(`[CaptureManager] Capture started: ${id}`);
    return this.session;
  }

  stop() {
    if (this.session) {
      this.session.active = false;
      console.log(`[CaptureManager] Capture stopped. ${this.session.chunks.length} chunks recorded.`);
    }
    if (this.logFile) {
      this.logFile.write(`\n=== Capture stopped at ${new Date().toISOString()} ===\n`);
      this.logFile.end();
      this.logFile = null;
    }
  }

  isActive(): boolean {
    return this.session?.active === true;
  }

  getSession(): CaptureSession | null {
    return this.session;
  }

  record(port: number, portName: string, remoteAddress: string, data: Buffer) {
    if (!this.session?.active) return;

    const rawText = data.toString('latin1');
    const rawHex = data.toString('hex').replace(/(.{2})/g, '$1 ').trim();
    const rawAscii = Array.from(data).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join('');

    const chunk: CaptureChunk = {
      timestamp: new Date().toISOString(),
      port,
      portName,
      remoteAddress: remoteAddress || 'unknown',
      rawHex,
      rawAscii,
      rawText: data.toString('utf8').replace(/\x00/g, '').trim(),
      byteLength: data.length,
    };

    if (this.session.chunks.length >= this.maxChunks) {
      this.session.chunks.shift();
    }
    this.session.chunks.push(chunk);

    if (this.logFile) {
      const line = [
        `--- ${chunk.timestamp} | port:${port} (${portName}) | from:${remoteAddress} | ${data.length} bytes ---`,
        `TEXT:  ${chunk.rawText}`,
        `HEX:   ${chunk.rawHex}`,
        `ASCII: ${chunk.rawAscii}`,
        '',
      ].join('\n');
      this.logFile.write(line);
    }

    for (const fn of this.broadcastFns) {
      try { fn(chunk); } catch {}
    }
  }

  listFiles(): { name: string; size: number; created: string }[] {
    try {
      if (!fs.existsSync(this.captureDir)) return [];
      return fs.readdirSync(this.captureDir)
        .filter(f => f.endsWith('.log'))
        .map(f => {
          const stat = fs.statSync(path.join(this.captureDir, f));
          return { name: f, size: stat.size, created: stat.birthtime.toISOString() };
        })
        .sort((a, b) => b.created.localeCompare(a.created));
    } catch {
      return [];
    }
  }

  readFile(name: string): string | null {
    try {
      const safe = path.basename(name);
      if (!safe.endsWith('.log')) return null;
      const filePath = path.join(this.captureDir, safe);
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return null;
    }
  }
}

export const captureManager = new CaptureManager();
