import { useState, useEffect } from "react";

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
  currentHeight?: string;
  attempts?: string[];
  isDNS?: boolean;
  isCurrent?: boolean;
}

/** One field event column */
export interface MultiFieldEvent {
  eventNumber: number;
  eventName: string;
  eventType?: string;
  isVertical?: boolean;
  currentAthlete?: {
    firstName: string;
    lastName: string;
    team: string;
    teamLogoUrl: string | null;
    headshotUrl: string | null;
    place: number | null;
    statusLine: string;
  } | null;
  standings: MultiFieldEntry[];
}

interface MultiFieldBoardProps {
  events: MultiFieldEvent[];
  meetName: string;
  meetLogoUrl: string | null;
  meetLogoEffect?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  maxRows?: number;
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
        <span className="text-white/50 text-4xl font-bold">No field events selected</span>
      </div>
    );
  }

  const accent = "#2E7D32";

  // Font sizes scale based on column count — bigger = better
  const fs = {
    eventName: cols === 1 ? "5cqw" : cols === 2 ? "3.8cqw" : "3cqw",
    spotlightName: cols === 1 ? "6cqw" : cols === 2 ? "4.5cqw" : "3.5cqw",
    spotlightTeam: cols === 1 ? "3.5cqw" : cols === 2 ? "2.5cqw" : "2cqw",
    spotlightStatus: cols === 1 ? "3.2cqw" : cols === 2 ? "2.4cqw" : "1.8cqw",
    rowPlace: cols === 1 ? "3.8cqw" : cols === 2 ? "2.8cqw" : "2.2cqw",
    rowName: cols === 1 ? "3.2cqw" : cols === 2 ? "2.4cqw" : "1.9cqw",
    rowMark: cols === 1 ? "3.8cqw" : cols === 2 ? "2.8cqw" : "2.2cqw",
    logo: cols === 1 ? "4.5cqw" : cols === 2 ? "3.5cqw" : "2.8cqw",
    headshot: cols === 1 ? "22cqh" : cols === 2 ? "20cqh" : "18cqh",
    headshotW: cols === 1 ? "14cqw" : cols === 2 ? "11cqw" : "9cqw",
    spotlightLogo: cols === 1 ? "6cqw" : cols === 2 ? "5cqw" : "4cqw",
  };

  return (
    <div
      className="w-full h-full flex overflow-hidden"
      style={{
        containerType: "size",
        background: "#0a0a0a",
        fontFamily: "'Oswald', 'Inter', Arial, sans-serif",
      }}
    >
      {events.map((evt, colIdx) => (
        <div
          key={evt.eventNumber}
          className="flex-1 flex flex-col min-w-0 min-h-0"
          style={{
            borderRight:
              colIdx < cols - 1
                ? "4px solid #444"
                : undefined,
          }}
        >
          {/* Event name header */}
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, #1b5e20 100%)`,
              padding: "1.2cqh 1cqw",
              borderBottom: "3px solid #4caf50",
            }}
          >
            <span
              className="font-bold uppercase tracking-wider text-white text-center"
              style={{
                fontSize: fs.eventName,
                textShadow: "0 2px 6px rgba(0,0,0,0.6)",
                letterSpacing: "0.08em",
              }}
            >
              {evt.eventName}
            </span>
          </div>

          {/* Spotlight: current athlete with headshot + team logo */}
          {evt.currentAthlete && (
            <div
              className="shrink-0 flex items-center"
              style={{
                background: "linear-gradient(180deg, #1a2a1a 0%, #111 100%)",
                borderBottom: `3px solid ${accent}`,
                padding: "2cqh 2cqw",
                gap: "2cqw",
              }}
            >
              {/* Headshot */}
              <div
                className="shrink-0 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center"
                style={{
                  width: fs.headshotW,
                  height: fs.headshot,
                  border: `3px solid ${accent}`,
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
                    <span className="text-gray-500" style={{ fontSize: "4cqw" }}>?</span>
                  </div>
                )}
              </div>

              {/* Name + team logo + status */}
              <div className="flex-1 min-w-0 flex flex-col" style={{ gap: "0.4cqh" }}>
                <div className="flex items-center" style={{ gap: "1cqw" }}>
                  <span
                    className="font-bold text-white truncate uppercase"
                    style={{ fontSize: fs.spotlightName }}
                  >
                    {evt.currentAthlete.firstName.charAt(0)}. {evt.currentAthlete.lastName}
                  </span>
                  {evt.currentAthlete.teamLogoUrl && (
                    <img
                      src={evt.currentAthlete.teamLogoUrl}
                      alt=""
                      className="shrink-0"
                      style={{
                        height: fs.spotlightLogo,
                        width: "auto",
                        objectFit: "contain",
                      }}
                    />
                  )}
                </div>
                <span
                  className="text-gray-300 truncate"
                  style={{ fontSize: fs.spotlightTeam }}
                >
                  {evt.currentAthlete.team}
                </span>
                <span
                  className="font-semibold truncate"
                  style={{
                    fontSize: fs.spotlightStatus,
                    color: "#4caf50",
                  }}
                >
                  {evt.currentAthlete.statusLine}
                </span>
              </div>

              {/* Place badge */}
              {evt.currentAthlete.place != null && (
                <div
                  className="shrink-0 flex items-center justify-center font-bold text-white"
                  style={{
                    width: cols === 1 ? "8cqw" : cols === 2 ? "6.5cqw" : "5cqw",
                    height: cols === 1 ? "8cqw" : cols === 2 ? "6.5cqw" : "5cqw",
                    borderRadius: "50%",
                    background: accent,
                    fontSize: cols === 1 ? "4.5cqw" : cols === 2 ? "3.5cqw" : "2.8cqw",
                    boxShadow: "0 3px 12px rgba(0,0,0,0.6)",
                  }}
                >
                  {evt.currentAthlete.place}
                </div>
              )}
            </div>
          )}

          {/* Standings header row */}
          <div
            className="shrink-0 flex items-center"
            style={{
              background: "#1a1a2e",
              padding: "0.6cqh 1cqw",
              borderBottom: "2px solid #333",
            }}
          >
            <span
              className="uppercase text-gray-400 font-bold"
              style={{
                fontSize: cols === 1 ? "1.8cqw" : cols === 2 ? "1.4cqw" : "1.1cqw",
                width: cols === 1 ? "4cqw" : cols === 2 ? "3.5cqw" : "3cqw",
                textAlign: "center",
                letterSpacing: "0.1em",
              }}
            >
              PL
            </span>
            <span
              className="uppercase text-gray-400 font-bold"
              style={{
                fontSize: cols === 1 ? "1.8cqw" : cols === 2 ? "1.4cqw" : "1.1cqw",
                width: fs.logo,
                textAlign: "center",
                marginLeft: "0.5cqw",
                marginRight: "0.5cqw",
              }}
            />
            <span
              className="flex-1 uppercase text-gray-400 font-bold"
              style={{
                fontSize: cols === 1 ? "1.8cqw" : cols === 2 ? "1.4cqw" : "1.1cqw",
                letterSpacing: "0.1em",
              }}
            >
              ATHLETE
            </span>
            <span
              className="uppercase text-gray-400 font-bold text-right"
              style={{
                fontSize: cols === 1 ? "1.8cqw" : cols === 2 ? "1.4cqw" : "1.1cqw",
                minWidth: cols === 1 ? "10cqw" : cols === 2 ? "8cqw" : "7cqw",
                letterSpacing: "0.1em",
              }}
            >
              MARK
            </span>
          </div>

          {/* Standings rows — fill remaining space */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {evt.standings.slice(0, maxRows).map((entry, rowIdx) => {
              const isCurrentRow = entry.isCurrent;
              return (
                <div
                  key={`${entry.bibNumber}-${rowIdx}`}
                  className="flex items-center"
                  style={{
                    flex: "1 1 0",
                    minHeight: 0,
                    background: isCurrentRow
                      ? `${accent}30`
                      : rowIdx % 2 === 0
                      ? "#151520"
                      : "#1a1a2a",
                    borderBottom: "2px solid #2a2a3a",
                    borderLeft: isCurrentRow ? `4px solid ${accent}` : "4px solid transparent",
                    padding: "0 1cqw",
                  }}
                >
                  {/* Place */}
                  <span
                    className="font-bold text-white shrink-0 tabular-nums"
                    style={{
                      fontSize: fs.rowPlace,
                      width: cols === 1 ? "4cqw" : cols === 2 ? "3.5cqw" : "3cqw",
                      textAlign: "center",
                      color: isCurrentRow ? "#4caf50" : "#fff",
                    }}
                  >
                    {entry.isDNS ? "--" : entry.place ?? rowIdx + 1}
                  </span>

                  {/* Team logo */}
                  <div
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: fs.logo,
                      marginLeft: "0.5cqw",
                      marginRight: "0.8cqw",
                    }}
                  >
                    {entry.teamLogoUrl ? (
                      <img
                        src={entry.teamLogoUrl}
                        alt=""
                        style={{
                          height: fs.logo,
                          width: "auto",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <span
                        className="text-gray-500 font-bold uppercase"
                        style={{
                          fontSize: cols === 1 ? "1.6cqw" : cols === 2 ? "1.3cqw" : "1cqw",
                        }}
                      >
                        {(entry.team || "").substring(0, 4)}
                      </span>
                    )}
                  </div>

                  {/* Athlete name */}
                  <span
                    className="flex-1 font-bold text-white truncate uppercase"
                    style={{
                      fontSize: fs.rowName,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {entry.lastName}
                  </span>

                  {/* Best mark */}
                  <span
                    className="shrink-0 font-bold text-white tabular-nums text-right"
                    style={{
                      fontSize: fs.rowMark,
                      fontFamily: "'Oswald', 'Inter', sans-serif",
                      minWidth: cols === 1 ? "10cqw" : cols === 2 ? "8cqw" : "7cqw",
                      color: isCurrentRow ? "#4caf50" : "#e0e0e0",
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
  );
}
