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
    mark: string;
    englishMark?: string;
    attemptNum?: number;
    attemptTotal?: number;
    attemptsDisplay?: string[];
    currentHeight?: string;
    statusLine?: string;
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

  // Use meet primary color for header, fall back to green
  const meetColor = primaryColor || "#2E7D32";
  const meetColorDark = secondaryColor || "#1b5e20";

  const fs = {
    eventName: cols === 1 ? "5cqw" : cols === 2 ? "3.8cqw" : "3cqw",
    spotName: cols === 1 ? "5.5cqw" : cols === 2 ? "4cqw" : "3.2cqw",
    spotTeam: cols === 1 ? "3.8cqw" : cols === 2 ? "3cqw" : "2.4cqw",
    spotDetail: cols === 1 ? "3.5cqw" : cols === 2 ? "2.8cqw" : "2.2cqw",
    spotMark: cols === 1 ? "5.5cqw" : cols === 2 ? "4.2cqw" : "3.2cqw",
    spotEnglish: cols === 1 ? "3.5cqw" : cols === 2 ? "2.8cqw" : "2.2cqw",
    spotXO: cols === 1 ? "4cqw" : cols === 2 ? "3cqw" : "2.4cqw",
    rowPlace: cols === 1 ? "5.5cqw" : cols === 2 ? "4.2cqw" : "3.4cqw",
    rowName: cols === 1 ? "5cqw" : cols === 2 ? "3.8cqw" : "3cqw",
    rowMark: cols === 1 ? "5.5cqw" : cols === 2 ? "4.2cqw" : "3.4cqw",
    logo: cols === 1 ? "5cqw" : cols === 2 ? "4cqw" : "3.2cqw",
    headshot: cols === 1 ? "30cqh" : cols === 2 ? "28cqh" : "26cqh",
    headshotW: cols === 1 ? "17cqw" : cols === 2 ? "13cqw" : "10cqw",
    spotLogo: cols === 1 ? "8cqw" : cols === 2 ? "6.5cqw" : "5cqw",
    placeBadge: cols === 1 ? "14cqh" : cols === 2 ? "12cqh" : "10cqh",
    placeBadgeFont: cols === 1 ? "4cqw" : cols === 2 ? "3cqw" : "2.5cqw",
    // Fixed spotlight height so all columns match
    spotHeight: cols === 1 ? "36cqh" : cols === 2 ? "34cqh" : "32cqh",
  };

  return (
    <div
      className="w-full h-full flex overflow-hidden"
      style={{
        containerType: "size",
        background: "#0a0a0a",
        fontFamily: "'Oswald', sans-serif",
      }}
    >
      {events.map((evt, colIdx) => (
        <div
          key={evt.eventNumber}
          className="flex-1 flex flex-col min-w-0 min-h-0"
          style={{
            borderRight: colIdx < cols - 1 ? "4px solid #444" : undefined,
          }}
        >
          {/* Event name header — uses meet color */}
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${meetColor} 0%, ${meetColorDark} 100%)`,
              padding: "1.2cqh 1cqw",
              borderBottom: `3px solid ${meetColor}88`,
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

          {/* Spotlight: fixed height so all columns align */}
          <div
            className="shrink-0 flex items-center overflow-hidden"
            style={{
              height: fs.spotHeight,
              background: "linear-gradient(180deg, #1a2a1a 0%, #111 100%)",
              borderBottom: `3px solid ${meetColor}`,
              padding: "1.5cqh 1.5cqw",
              gap: "1.5cqw",
            }}
          >
            {evt.currentAthlete ? (
              <>
                {/* Headshot */}
                <div
                  className="shrink-0 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center"
                  style={{
                    width: fs.headshotW,
                    height: fs.headshot,
                    border: `3px solid ${meetColor}`,
                  }}
                >
                  {evt.currentAthlete.headshotUrl ? (
                    <img src={evt.currentAthlete.headshotUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500" style={{ fontSize: "4cqw" }}>?</span>
                    </div>
                  )}
                </div>

                {/* Info block */}
                <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ gap: "0.3cqh" }}>
                  {/* Name */}
                  <span className="font-bold text-white truncate uppercase" style={{ fontSize: fs.spotName }}>
                    {evt.currentAthlete.firstName.charAt(0)}. {evt.currentAthlete.lastName}
                  </span>

                  {/* School */}
                  <span className="text-gray-300 truncate" style={{ fontSize: fs.spotTeam }}>
                    {evt.currentAthlete.team}
                  </span>

                  {/* Mark */}
                  {evt.currentAthlete.mark && (
                    <span className="font-bold text-white" style={{ fontSize: fs.spotMark }}>
                      {evt.currentAthlete.mark}
                    </span>
                  )}
                  {/* English mark on its own line */}
                  {evt.currentAthlete.englishMark && (
                    <span style={{ fontSize: fs.spotEnglish, color: "#d4a017" }}>
                      ({evt.currentAthlete.englishMark})
                    </span>
                  )}

                  {/* Place + Attempt (horizontal) or X/O (vertical) on same line */}
                  <div className="flex items-center" style={{ gap: "1.5cqw", whiteSpace: "nowrap" }}>
                    {evt.currentAthlete.place != null && (
                      <span className="font-bold text-white" style={{ fontSize: fs.spotDetail }}>
                        Place: {evt.currentAthlete.place}
                      </span>
                    )}
                    <span style={{ fontSize: fs.spotDetail, color: "#fff" }}>|</span>
                    {evt.isVertical ? (
                      evt.currentAthlete.attemptsDisplay && evt.currentAthlete.attemptsDisplay.length > 0 && (
                        <div className="flex items-center" style={{ gap: "0.3cqw" }}>
                          {evt.currentAthlete.attemptsDisplay.join('').split('').map((ch, i) => (
                            <span
                              key={i}
                              className="font-bold"
                              style={{
                                fontSize: fs.spotXO,
                                color: ch === 'O' ? "#4caf50" : ch === 'P' ? "#ffb300" : "#ef5350",
                                letterSpacing: "0.05em",
                              }}
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      )
                    ) : (
                      evt.currentAthlete.attemptNum != null && evt.currentAthlete.attemptNum > 0 && (
                        <span style={{ fontSize: fs.spotDetail, color: "#fff" }} className="font-semibold">
                          Attempt {evt.currentAthlete.attemptNum}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Team logo (where place badge was) */}
                {evt.currentAthlete.teamLogoUrl && (
                  <img
                    src={evt.currentAthlete.teamLogoUrl}
                    alt=""
                    className="shrink-0"
                    style={{
                      height: fs.placeBadge,
                      width: "auto",
                      objectFit: "contain",
                    }}
                  />
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-gray-500 font-bold" style={{ fontSize: fs.spotTeam }}>Awaiting data...</span>
              </div>
            )}
          </div>

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

          {/* Standings rows — all white, no green highlights */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {evt.standings.slice(0, maxRows).map((entry, rowIdx) => (
              <div
                key={`${entry.bibNumber}-${rowIdx}`}
                className="flex items-center"
                style={{
                  flex: "1 1 0",
                  minHeight: 0,
                  background: rowIdx % 2 === 0 ? "#151520" : "#1a1a2a",
                  borderBottom: "2px solid #2a2a3a",
                  padding: "0 1cqw",
                }}
              >
                <span
                  className="font-bold text-white shrink-0 tabular-nums"
                  style={{
                    fontSize: fs.rowPlace,
                    width: cols === 1 ? "4cqw" : cols === 2 ? "3.5cqw" : "3cqw",
                    textAlign: "center",
                  }}
                >
                  {entry.isDNS ? "--" : entry.place ?? rowIdx + 1}
                </span>

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
                      style={{ height: fs.logo, width: "auto", objectFit: "contain" }}
                    />
                  ) : (
                    <span
                      className="text-gray-500 font-bold uppercase"
                      style={{ fontSize: cols === 1 ? "1.6cqw" : cols === 2 ? "1.3cqw" : "1cqw" }}
                    >
                      {(entry.team || "").substring(0, 4)}
                    </span>
                  )}
                </div>

                <span
                  className="flex-1 font-bold text-white truncate uppercase"
                  style={{ fontSize: fs.rowName, letterSpacing: "0.02em" }}
                >
                  {entry.firstName?.charAt(0) ? `${entry.firstName.charAt(0)}. ` : ""}{entry.lastName}
                </span>

                <span
                  className="shrink-0 font-bold tabular-nums text-right"
                  style={{
                    fontSize: fs.rowMark,
                    fontFamily: "'Oswald', sans-serif",
                    minWidth: cols === 1 ? "10cqw" : cols === 2 ? "8cqw" : "7cqw",
                    color: "#e0e0e0",
                  }}
                >
                  {entry.isDNS ? "DNS" : entry.bestMark}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
