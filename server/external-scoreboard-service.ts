import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from './storage';
import type { ExternalScoreboard, FieldEventSessionWithDetails, FieldEventAthlete, FieldEventMark } from '@shared/schema';

interface ScoreboardConnection {
  socket: net.Socket | null;
  scoreboard: ExternalScoreboard;
  reconnectTimer: NodeJS.Timeout | null;
  isConnecting: boolean;
}

interface FieldScoreboardPayload {
  currentAthlete: {
    id: number;
    firstName: string;
    lastName: string;
    teamCode: string;
    bibNumber: string;
    position: number;
  } | null;
  lastMark: {
    athleteId: number;
    value: number | null;
    display: string;
    attemptNumber: number;
    isFoul: boolean;
    isPass: boolean;
    wind: number | null;
  } | null;
  eventName: string;
  eventType: string;
  sessionId: number;
}

class ExternalScoreboardService {
  private connections: Map<number, ScoreboardConnection> = new Map();
  private readonly RECONNECT_DELAY = 5000;

  async startScoreboard(scoreboardId: number): Promise<boolean> {
    const scoreboard = await storage.getExternalScoreboard(scoreboardId);
    if (!scoreboard) {
      console.error(`[ExtScoreboard] Scoreboard ${scoreboardId} not found`);
      return false;
    }

    if (this.connections.has(scoreboardId)) {
      await this.stopScoreboard(scoreboardId);
    }

    const connection: ScoreboardConnection = {
      socket: null,
      scoreboard,
      reconnectTimer: null,
      isConnecting: false,
    };

    this.connections.set(scoreboardId, connection);
    await this.connect(scoreboardId);

    await storage.updateExternalScoreboard(scoreboardId, {
      isActive: true,
      lastStatus: JSON.stringify({ status: 'starting', timestamp: new Date().toISOString() }),
    });

    console.log(`[ExtScoreboard] Started scoreboard ${scoreboard.name} (${scoreboard.targetIp}:${scoreboard.targetPort})`);
    return true;
  }

  async stopScoreboard(scoreboardId: number): Promise<boolean> {
    const connection = this.connections.get(scoreboardId);
    if (!connection) {
      return false;
    }

    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer);
    }

    if (connection.socket) {
      connection.socket.destroy();
    }

    this.connections.delete(scoreboardId);

    await storage.updateExternalScoreboard(scoreboardId, {
      isActive: false,
      lastStatus: JSON.stringify({ status: 'stopped', timestamp: new Date().toISOString() }),
    });

    console.log(`[ExtScoreboard] Stopped scoreboard ${scoreboardId}`);
    return true;
  }

  private async connect(scoreboardId: number): Promise<void> {
    const connection = this.connections.get(scoreboardId);
    if (!connection || connection.isConnecting) return;

    connection.isConnecting = true;
    const { scoreboard } = connection;

    const socket = new net.Socket();

    socket.on('connect', async () => {
      connection.socket = socket;
      connection.isConnecting = false;
      console.log(`[ExtScoreboard] Connected to ${scoreboard.name} (${scoreboard.targetIp}:${scoreboard.targetPort})`);

      await storage.updateExternalScoreboard(scoreboardId, {
        lastStatus: JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() }),
      });
    });

    socket.on('error', async (err) => {
      console.error(`[ExtScoreboard] Error on ${scoreboard.name}:`, err.message);
      connection.isConnecting = false;

      await storage.updateExternalScoreboard(scoreboardId, {
        lastStatus: JSON.stringify({ status: 'error', error: err.message, timestamp: new Date().toISOString() }),
      });
    });

    socket.on('close', () => {
      connection.socket = null;
      connection.isConnecting = false;

      if (this.connections.has(scoreboardId)) {
        connection.reconnectTimer = setTimeout(() => {
          this.connect(scoreboardId);
        }, this.RECONNECT_DELAY);
      }
    });

    socket.connect(scoreboard.targetPort, scoreboard.targetIp);
  }

  async sendToSession(sessionId: number, payload: FieldScoreboardPayload): Promise<void> {
    const scoreboards = await storage.getExternalScoreboards();
    const sessionScoreboards = scoreboards.filter(
      (sb) => sb.sessionId === sessionId && sb.isActive
    );

    for (const scoreboard of sessionScoreboards) {
      const connection = this.connections.get(scoreboard.id);
      if (connection) {
        await this.sendPayload(connection, payload);
      }
    }
  }

  private async sendPayload(connection: ScoreboardConnection, payload: FieldScoreboardPayload): Promise<void> {
    const { scoreboard } = connection;

    const lssMessage = this.formatLSSMessage(payload);

    if (scoreboard.lssDirectory) {
      try {
        const dir = scoreboard.lssDirectory;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const filename = `field_event_${payload.sessionId}.lss`;
        const filepath = path.join(dir, filename);
        fs.writeFileSync(filepath, lssMessage);
      } catch (err) {
        console.error(`[ExtScoreboard] Failed to write LSS file for ${scoreboard.name}:`, err);
      }
    }

    if (connection.socket && connection.socket.writable) {
      try {
        connection.socket.write(lssMessage + '\r\n');
        await storage.updateExternalScoreboard(scoreboard.id, {
          lastSentAt: new Date(),
          lastStatus: JSON.stringify({ status: 'sent', timestamp: new Date().toISOString() }),
        });
        console.log(`[ExtScoreboard] Sent update to ${scoreboard.name}`);
      } catch (err) {
        console.error(`[ExtScoreboard] Failed to send to ${scoreboard.name}:`, err);
      }
    }
  }

  private formatLSSMessage(payload: FieldScoreboardPayload): string {
    const lines: string[] = [];

    lines.push(`EV=${payload.eventName.toUpperCase()}`);
    lines.push(`ET=${payload.eventType.toUpperCase()}`);

    if (payload.currentAthlete) {
      const { firstName, lastName, teamCode, bibNumber, position } = payload.currentAthlete;
      lines.push(`CA=${lastName.toUpperCase()}, ${firstName.toUpperCase()}`);
      lines.push(`CT=${teamCode.toUpperCase()}`);
      lines.push(`CB=${bibNumber}`);
      lines.push(`CP=${position}`);
    } else {
      lines.push(`CA=`);
      lines.push(`CT=`);
      lines.push(`CB=`);
      lines.push(`CP=`);
    }

    if (payload.lastMark) {
      const { display, attemptNumber, isFoul, isPass, wind } = payload.lastMark;
      lines.push(`LM=${display}`);
      lines.push(`LA=${attemptNumber}`);
      lines.push(`LF=${isFoul ? '1' : '0'}`);
      lines.push(`LP=${isPass ? '1' : '0'}`);
      if (wind !== null && wind !== undefined) {
        const windSign = wind >= 0 ? '+' : '';
        lines.push(`LW=${windSign}${wind.toFixed(1)}`);
      } else {
        lines.push(`LW=`);
      }
    } else {
      lines.push(`LM=`);
      lines.push(`LA=`);
      lines.push(`LF=`);
      lines.push(`LP=`);
      lines.push(`LW=`);
    }

    return lines.join('\r\n');
  }

  getActiveConnections(): Map<number, ScoreboardConnection> {
    return this.connections;
  }

  isActive(scoreboardId: number): boolean {
    return this.connections.has(scoreboardId);
  }
}

export const externalScoreboardService = new ExternalScoreboardService();

export function buildFieldScoreboardPayload(
  session: FieldEventSessionWithDetails,
  currentAthleteId: number | null,
  lastMark: FieldEventMark | null
): FieldScoreboardPayload {
  let currentAthlete: FieldScoreboardPayload['currentAthlete'] = null;

  if (currentAthleteId && session.athletes) {
    const athlete = session.athletes.find((a) => a.id === currentAthleteId);
    if (athlete) {
      const position = session.athletes
        .filter((a) => a.checkInStatus === 'checked_in')
        .findIndex((a) => a.id === currentAthleteId) + 1;

      const firstName = athlete.athlete?.firstName || athlete.evtFirstName || '';
      const lastName = athlete.athlete?.lastName || athlete.evtLastName || '';
      const teamCode = athlete.evtTeam || '';
      const bibNumber = athlete.athlete?.bibNumber || athlete.evtBibNumber || '';

      currentAthlete = {
        id: athlete.id,
        firstName,
        lastName,
        teamCode,
        bibNumber,
        position,
      };
    }
  }

  let lastMarkPayload: FieldScoreboardPayload['lastMark'] = null;

  if (lastMark) {
    const isFoul = lastMark.measurement === null && lastMark.markType === 'foul';
    const isPass = lastMark.markType === 'pass';

    let display = '';
    if (lastMark.markType === 'cleared') {
      display = 'O';
    } else if (lastMark.markType === 'missed') {
      display = 'X';
    } else if (lastMark.markType === 'pass') {
      display = 'P';
    } else if (lastMark.measurement !== null) {
      display = lastMark.measurement.toFixed(2);
    } else {
      display = 'FOUL';
    }

    lastMarkPayload = {
      athleteId: lastMark.athleteId,
      value: lastMark.measurement,
      display,
      attemptNumber: lastMark.attemptNumber,
      isFoul,
      isPass,
      wind: lastMark.wind ?? null,
    };
  }

  const eventType = session.event?.eventType || 'horizontal';

  return {
    currentAthlete,
    lastMark: lastMarkPayload,
    eventName: session.event?.name || 'Unknown Event',
    eventType,
    sessionId: session.id,
  };
}
