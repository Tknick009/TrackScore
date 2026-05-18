import { useState, useEffect, useRef } from "react";
import { getLogoEffectStyle } from "@/lib/logoEffects";

/** One athlete row in a field event standings list */
export interface MultiFieldEntry {
  place: number | null;
  bibNumber: number;
  firstName: string;
  lastName: string;
  team: string;
  teamLogoUrl: string | null;
  headshotUrl: string | null;
  bestMark: string;
  /** For vertical events, current height display */
  currentHeight?: string;
  /** Attempt-by-attempt data for display (e.g. "O", "XXO", "X") */
  attempts?: string[];
  isDNS?: boolean;
  isCurrent?: boolean;
}

/** One field event column */
export interface MultiFieldEvent {
  eventNumber: number;
  eventName: string;
  /** e.g. "Weight Throw", "Pole Vault", "Long Jump" */
  eventType?: string;
  isVertical?: boolean;
  /** The athlete currently competing */
  currentAthlete?: {
    firstName: string;
    lastName: string;
    team: string;
    teamLogoUrl: string | null;
    headshotUrl: string | null;
    place: number | null;
    /** "Attempt #3" or "Height: 5.56" */
    statusLine: string;
  } | null;
  /** Sorted standings from LFF */
  standings: MultiFieldEntry[];
}

interface MultiFieldBoardProps {
  events: MultiFieldEvent[];
  meetName: string;
  meetLogoUrl: string | null;
  meetLogoEffect?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  /** Max rows to show in each column */
  maxRows?: number;
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span>
      {time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()}
    </span>
  );
}

export function MultiFieldBoard({
  events,
  meetName,
  meetLogoUrl,
  meetLogoEffect,
  primaryColor,
  secondaryColor,
  maxRows = 6,
}: MultiFieldBoardProps) {
  const cols = events.length;
  if (cols === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <span className="text-white/50 text-2xl">No field events selected</span>
      </div>
    );
  }

  const primary = primaryColor || "#8B0000";
  const secondary = secondaryColor || "#FFFFFF";
  const accent = "#2E7D32"; // green header bar color (like the Harvard board)

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        containerType: "size",
        background: "#111",
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* Event columns */}
      <div className="flex-1 flex min-h-0">
        {events.map((evt, colIdx) => (
          <div
            key={evt.eventNumber}
            className="flex-1 flex flex-col min-w-0"
            style={{
              borderRight: colIdx < cols - 1 ? "2px solid #333" : undefined,
            }}
          >
            {/* Green header bar with event name */}
            <div
              className="shrink-0 flex items-center justify-center text-center"
              style={{
                background: accent,
                padding: "0.6cqh 0.5cqw",
                minHeight: "4cqh",
              }}
            >
              <span
                className="font-bold uppercase tracking-wide text-white"
                style={{
                  fontSize: cols === 1 ? "3.5cqw" : cols === 2 ? "2.8cqw" : "2.2cqw",
                  textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                }}
              >
                {evt.eventName}
              </span>
            </div>

            {/* Spotlight: current athlete with headshot */}
            {evt.currentAthlete && (
              <div
                className="shrink-0 flex items-center gap-[1cqw] px-[1cqw]"
                style={{
                  background: "#1a1a1a",
                  borderBottom: `2px solid ${accent}`,
                  padding: "1cqh 1.5cqw",
                }}
              >
                {/* Headshot */}
                <div
                  className="shrink-0 rounded overflow-hidden bg-gray-800 flex items-center justify-center"
                  style={{
                    width: cols === 1 ? "10cqw" : cols === 2 ? "8cqw" : "7cqw",
                    height: cols === 1 ? "12cqh" : cols === 2 ? "10cqh" : "9cqh",
                  }}
                >
                  {evt.currentAthlete.headshotUrl ? (
                    <img
                      src={evt.currentAthlete.headshotUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400" style={{ fontSize: "3cqw" }}>?</span>
                    </div>
                  )}
                </div>

                {/* Name + team + status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[0.5cqw]">
                    <span
                      className="font-bold text-white truncate"
                      style={{
                        fontSize: cols === 1 ? "3cqw" : cols === 2 ? "2.4cqw" : "1.8cqw",
                      }}
                    >
                      {evt.currentAthlete.lastName}
                    </span>
                    {evt.currentAthlete.teamLogoUrl && (
                      <img
                        src={evt.currentAthlete.teamLogoUrl}
                        alt=""
                        className="shrink-0"
                        style={{
                          height: cols === 1 ? "3.5cqw" : cols === 2 ? "2.8cqw" : "2.2cqw",
                          width: "auto",
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </div>
                  <div
                    className="text-gray-300"
                    style={{
                      fontSize: cols === 1 ? "2cqw" : cols === 2 ? "1.6cqw" : "1.3cqw",
                    }}
                  >
                    {evt.currentAthlete.team}
                  </div>
                  {evt.currentAthlete.place != null && (
                    <div
                      className="text-gray-400"
                      style={{
                        fontSize: cols === 1 ? "1.8cqw" : cols === 2 ? "1.4cqw" : "1.1cqw",
                      }}
                    >
                      Place: {evt.currentAthlete.place}
                    </div>
                  )}
                  <div
                    className="text-white font-semibold"
                    style={{
                      fontSize: cols === 1 ? "2cqw" : cols === 2 ? "1.6cqw" : "1.3cqw",
                    }}
                  >
                    {evt.currentAthlete.statusLine}
                  </div>
                </div>
              </div>
            )}

            {/* Standings table */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {evt.standings.slice(0, maxRows).map((entry, rowIdx) => {
                const isCurrentRow = entry.isCurrent;
                return (
                  <div
                    key={`${entry.bibNumber}-${rowIdx}`}
                    className="flex items-center"
                    style={{
                      background: isCurrentRow
                        ? `${accent}33`
                        : rowIdx % 2 === 0
                        ? "#1a1a1a"
                        : "#111",
                      borderBottom: "1px solid #2a2a2a",
                      padding: "0.4cqh 0.8cqw",
                      flex: "1 1 0",
                      minHeight: 0,
                    }}
                  >
                    {/* Place number */}
                    <span
                      className="font-bold text-white shrink-0"
                      style={{
                        fontSize: cols === 1 ? "2.8cqw" : cols === 2 ? "2.2cqw" : "1.7cqw",
                        width: cols === 1 ? "3.5cqw" : cols === 2 ? "3cqw" : "2.5cqw",
                        textAlign: "center",
                      }}
                    >
                      {entry.isDNS ? "--" : entry.place ?? rowIdx + 1}
                    </span>

                    {/* Team logo */}
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{
                        width: cols === 1 ? "3.5cqw" : cols === 2 ? "3cqw" : "2.5cqw",
                        marginLeft: "0.5cqw",
                        marginRight: "0.5cqw",
                      }}
                    >
                      {entry.teamLogoUrl ? (
                        <img
                          src={entry.teamLogoUrl}
                          alt=""
                          style={{
                            height: cols === 1 ? "3cqw" : cols === 2 ? "2.5cqw" : "2cqw",
                            width: "auto",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <span
                          className="text-gray-500 font-bold uppercase"
                          style={{
                            fontSize: cols === 1 ? "1.4cqw" : cols === 2 ? "1.1cqw" : "0.9cqw",
                          }}
                        >
                          {(entry.team || "").substring(0, 4)}
                        </span>
                      )}
                    </div>

                    {/* Athlete name */}
                    <span
                      className="flex-1 font-semibold text-white truncate"
                      style={{
                        fontSize: cols === 1 ? "2.5cqw" : cols === 2 ? "2cqw" : "1.5cqw",
                      }}
                    >
                      {entry.lastName}
                    </span>

                    {/* Best mark */}
                    <span
                      className="shrink-0 font-bold text-white tabular-nums text-right"
                      style={{
                        fontSize: cols === 1 ? "2.8cqw" : cols === 2 ? "2.2cqw" : "1.7cqw",
                        fontFamily: "'Oswald', 'Inter', sans-serif",
                        minWidth: cols === 1 ? "8cqw" : cols === 2 ? "7cqw" : "6cqw",
                      }}
                    >
                      {entry.isDNS ? "DNS" : entry.bestMark}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom banner: meet branding + clock */}
      <div
        className="shrink-0 flex items-center justify-between px-[2cqw]"
        style={{
          background: primary,
          height: "8cqh",
          borderTop: `2px solid ${secondary}44`,
        }}
      >
        <div className="flex items-center gap-[1.5cqw]">
          {meetLogoUrl && (
            <img
              src={meetLogoUrl}
              alt=""
              className="h-[5cqh] w-auto object-contain"
              style={getLogoEffectStyle(meetLogoEffect)}
            />
          )}
          <span
            className="font-bold uppercase tracking-wide text-white"
            style={{
              fontSize: "2.8cqw",
              textShadow: "0 1px 4px rgba(0,0,0,0.5)",
            }}
          >
            {meetName}
          </span>
        </div>
        <span
          className="font-bold text-white tabular-nums"
          style={{
            fontSize: "3.5cqw",
            fontFamily: "'Oswald', 'Inter', sans-serif",
          }}
        >
          <Clock />
        </span>
      </div>
    </div>
  );
}
