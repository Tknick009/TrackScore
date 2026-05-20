
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

/** Athlete spotlight data */
export interface MultiFieldAthlete {
  firstName: string;
  lastName: string;
  team: string;
  teamLogoUrl: string | null;
  headshotUrl: string | null;
  place: number | null;
  mark: string;
  englishMark?: string;
  points?: number | null;
  attemptNum?: number;
  attemptTotal?: number;
  attemptsDisplay?: string[];
  currentHeight?: string;
  statusLine?: string;
}

/** One field event column */
export interface MultiFieldEvent {
  eventNumber: number;
  eventName: string;
  eventType?: string;
  isVertical?: boolean;
  isMultiEvent?: boolean;
  currentAthlete?: MultiFieldAthlete | null;
  previousAthlete?: MultiFieldAthlete | null;
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

/** Helper: render the secondary mark line (English or points for multi-events) */
function SecondaryMark({ athlete, evt, fontSize }: { athlete: MultiFieldAthlete; evt: MultiFieldEvent; fontSize: string }) {
  if (evt.isMultiEvent && athlete.points != null) {
    return <span style={{ fontSize, color: "#d4a017" }}>{athlete.points} pts</span>;
  }
  if (athlete.englishMark) {
    return <span style={{ fontSize, color: "#d4a017" }}>({athlete.englishMark})</span>;
  }
  return null;
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

  // For 1-column, use 12 rows in 2 columns (6 per column)
  const effectiveMaxRows = cols === 1 ? 12 : maxRows;

  const fs = {
    eventName: cols === 1 ? "5cqw" : cols === 2 ? "3.8cqw" : "3cqw",
    spotName: cols === 1 ? "4.2cqw" : cols === 2 ? "4cqw" : "3.2cqw",
    spotTeam: cols === 1 ? "2.8cqw" : cols === 2 ? "3cqw" : "2.4cqw",
    spotDetail: cols === 1 ? "2.8cqw" : cols === 2 ? "2.8cqw" : "2.2cqw",
    spotMark: cols === 1 ? "4.2cqw" : cols === 2 ? "4.2cqw" : "3.2cqw",
    spotEnglish: cols === 1 ? "2.8cqw" : cols === 2 ? "2.8cqw" : "2.2cqw",
    spotXO: cols === 1 ? "3cqw" : cols === 2 ? "3cqw" : "2.4cqw",
    rowPlace: cols === 1 ? "4cqw" : cols === 2 ? "4.2cqw" : "3.4cqw",
    rowName: cols === 1 ? "3.5cqw" : cols === 2 ? "3.8cqw" : "3cqw",
    rowMark: cols === 1 ? "4cqw" : cols === 2 ? "4.2cqw" : "3.4cqw",
    logo: cols === 1 ? "4.2cqw" : cols === 2 ? "4cqw" : "3.2cqw",
    headshot: cols === 1 ? "30cqh" : cols === 2 ? "28cqh" : "26cqh",
    headshotW: cols === 1 ? "12cqw" : cols === 2 ? "13cqw" : "10cqw",
    spotLogo: cols === 1 ? "12cqw" : cols === 2 ? "6.5cqw" : "5cqw",
    placeBadge: cols === 1 ? "12cqh" : cols === 2 ? "11cqh" : "10cqh",
    placeBadgeFont: cols === 1 ? "3.8cqw" : cols === 2 ? "3cqw" : "2.5cqw",
    spotHeight: cols === 1 ? "38cqh" : cols === 2 ? "34cqh" : "32cqh",
    badgeFont: cols === 1 ? "3.8cqw" : "2.5cqw",
  };

  /** Render one athlete spotlight half (used in 1-col split and 2/3-col) */
  function renderSpotlightAthlete(athlete: MultiFieldAthlete | null | undefined, evt: MultiFieldEvent, badge?: { text: string; color: string }) {
    if (!athlete) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-500 font-bold" style={{ fontSize: fs.spotTeam }}>Awaiting data...</span>
        </div>
      );
    }
    return (
      <>
        {/* Badge (absolute positioned top-right) */}
        {badge && (
          <span
            className="font-bold uppercase"
            style={{
              position: "absolute",
              right: "1.2cqw",
              top: "1cqh",
              fontSize: fs.badgeFont,
              background: badge.color,
              color: "#fff",
              padding: "0.2cqh 0.8cqw",
              borderRadius: "0.4cqh",
              letterSpacing: "0.1em",
            }}
          >
            {badge.text}
          </span>
        )}

        {/* Headshot */}
        <div
          className="shrink-0 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center"
          style={{
            width: fs.headshotW,
            height: fs.headshot,
            border: "none",
          }}
        >
          {athlete.headshotUrl ? (
            <img src={athlete.headshotUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500" style={{ fontSize: "4cqw" }}>?</span>
            </div>
          )}
        </div>

        {/* Info block */}
        <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ gap: "0.3cqh" }}>
          <span className="font-bold text-white truncate uppercase" style={{ fontSize: fs.spotName }}>
            {athlete.firstName.charAt(0)}. {athlete.lastName}
          </span>
          <span className="text-gray-300 truncate" style={{ fontSize: fs.spotTeam }}>
            {athlete.team}
          </span>
          {athlete.mark && (
            <span className="font-bold text-white" style={{ fontSize: fs.spotMark }}>
              {athlete.mark}
            </span>
          )}
          <SecondaryMark athlete={athlete} evt={evt} fontSize={fs.spotEnglish} />

          {/* Place + Attempt/X-O */}
          <div className="flex items-center" style={{ gap: "1.5cqw", whiteSpace: "nowrap" }}>
            {athlete.place != null && (
              <span className="font-bold text-white" style={{ fontSize: fs.spotDetail }}>
                Place: {athlete.place}
              </span>
            )}
            <span style={{ fontSize: fs.spotDetail, color: "#fff" }}>|</span>
            {evt.isVertical ? (
              athlete.attemptsDisplay && athlete.attemptsDisplay.length > 0 && (
                <div className="flex items-center" style={{ gap: "0.3cqw" }}>
                  {athlete.attemptsDisplay.join('').split('').map((ch, i) => (
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
              athlete.attemptNum != null && athlete.attemptNum > 0 && (
                <span style={{ fontSize: fs.spotDetail, color: "#fff" }} className="font-semibold">
                  Attempt {athlete.attemptNum}
                </span>
              )
            )}
          </div>
        </div>

        {/* Team logo */}
        {athlete.teamLogoUrl && (
          <img
            src={athlete.teamLogoUrl}
            alt=""
            className="shrink-0"
            style={{
              height: fs.spotLogo,
              width: "auto",
              objectFit: "contain",
              alignSelf: "flex-end",
            }}
          />
        )}
      </>
    );
  }

  /** Render a standings row */
  function renderStandingsRow(entry: MultiFieldEntry, rowIdx: number) {
    return (
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
            width: cols === 1 ? "3cqw" : cols === 2 ? "3.5cqw" : "3cqw",
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
            minWidth: cols === 1 ? "7cqw" : cols === 2 ? "8cqw" : "7cqw",
            color: "#e0e0e0",
          }}
        >
          {entry.isDNS ? "DNS" : entry.bestMark}
        </span>
      </div>
    );
  }

  // ─── 1-Column Layout: Split spotlight + 2-column standings ───
  if (cols === 1) {
    const evt = events[0];
    const leftStandings = evt.standings.slice(0, 6);
    const rightStandings = evt.standings.slice(6, 12);

    return (
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{
          containerType: "size",
          background: "#0a0a0a",
          fontFamily: "'Oswald', sans-serif",
        }}
      >
        {/* Event name header */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${meetColor} 0%, ${meetColorDark} 100%)`,
            padding: "1.2cqh 1cqw",
            borderBottom: `3px solid ${meetColor}`,
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

        {/* Split spotlight: Current (left) + Previous (right) */}
        <div className="shrink-0 flex" style={{ height: fs.spotHeight, borderBottom: "3px solid #333" }}>
          {/* Current athlete */}
          <div
            className="flex-1 flex items-center overflow-hidden relative"
            style={{
              padding: "1.5cqh 1.2cqw",
              gap: "1.2cqw",
              background: "linear-gradient(180deg, #1a1a2e 0%, #111 100%)",
            }}
          >
            {renderSpotlightAthlete(evt.currentAthlete, evt, { text: "Current", color: "#2e7d32" })}
          </div>

          {/* Divider */}
          <div style={{ width: "4px", background: "#444" }} />

          {/* Previous athlete */}
          <div
            className="flex-1 flex items-center overflow-hidden relative"
            style={{
              padding: "1.5cqh 1.2cqw",
              gap: "1.2cqw",
              background: "linear-gradient(180deg, #1a1a2e 0%, #111 100%)",
              opacity: 0.85,
            }}
          >
            {renderSpotlightAthlete(evt.previousAthlete, evt, { text: "Previous", color: "#b8860b" })}
          </div>
        </div>

        {/* Standings label */}
        <div
          className="shrink-0 flex items-center"
          style={{ background: "#1a1a2e", padding: "0.4cqh 1cqw", borderBottom: "2px solid #333" }}
        >
          <span className="uppercase text-gray-500 font-bold" style={{ fontSize: "1.2cqw", letterSpacing: "0.15em" }}>
            STANDINGS
          </span>
        </div>

        {/* Two-column standings */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left column: places 1-6 */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {leftStandings.map((entry, rowIdx) => renderStandingsRow(entry, rowIdx))}
          </div>
          {/* Divider */}
          <div style={{ width: "4px", background: "#333" }} />
          {/* Right column: places 7-12 */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {rightStandings.map((entry, rowIdx) => renderStandingsRow(entry, rowIdx + 6))}
          </div>
        </div>
      </div>
    );
  }

  // ─── 2/3-Column Layout ───
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
          {/* Event name header */}
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${meetColor} 0%, ${meetColorDark} 100%)`,
              padding: "1.2cqh 1cqw",
              borderBottom: `3px solid ${meetColor}`,
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

          {/* Spotlight */}
          <div
            className="shrink-0 flex items-center overflow-hidden relative"
            style={{
              height: fs.spotHeight,
              padding: "1.5cqh 1.5cqw",
              gap: "1.5cqw",
              background: "linear-gradient(180deg, #1a1a2e 0%, #111 100%)",
            }}
          >
            {renderSpotlightAthlete(evt.currentAthlete, evt)}
          </div>

          {/* Standings rows */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {evt.standings.slice(0, maxRows).map((entry, rowIdx) => renderStandingsRow(entry, rowIdx))}
          </div>
        </div>
      ))}
    </div>
  );
}
