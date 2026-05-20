
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
function SecondaryMark({ athlete, evt }: { athlete: MultiFieldAthlete; evt: MultiFieldEvent }) {
  if (evt.isMultiEvent && athlete.points != null) {
    return <span style={{ color: "#fbbf24" }}>{athlete.points} pts</span>;
  }
  if (athlete.englishMark) {
    return <span style={{ color: "rgba(255,255,255,0.6)" }}>({athlete.englishMark})</span>;
  }
  return null;
}

/** Adjust color brightness */
function adjustBrightness(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.max(0, Math.round(r * factor)));
  const ng = Math.min(255, Math.max(0, Math.round(g * factor)));
  const nb = Math.min(255, Math.max(0, Math.round(b * factor)));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
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
      <div className="w-full h-full flex items-center justify-center" style={{ background: "#0d1117" }}>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "3cqw", fontWeight: 700 }}>No field events selected</span>
      </div>
    );
  }

  const accent = primaryColor || "#1e6b3a";
  const accentDark = secondaryColor || adjustBrightness(accent, 0.5);

  // Responsive font sizes based on column count
  const s = {
    headerName: cols === 1 ? "4.5cqw" : cols === 2 ? "3.2cqw" : "2.6cqw",
    spotName: cols === 1 ? "3.6cqw" : cols === 2 ? "3cqw" : "2.4cqw",
    spotTeam: cols === 1 ? "2.2cqw" : cols === 2 ? "2cqw" : "1.6cqw",
    spotMark: cols === 1 ? "5cqw" : cols === 2 ? "4.5cqw" : "3.5cqw",
    spotSub: cols === 1 ? "2.2cqw" : cols === 2 ? "2cqw" : "1.6cqw",
    spotDetail: cols === 1 ? "2cqw" : cols === 2 ? "1.8cqw" : "1.4cqw",
    spotXO: cols === 1 ? "2.8cqw" : cols === 2 ? "2.4cqw" : "2cqw",
    rowPlace: cols === 1 ? "3cqw" : cols === 2 ? "3cqw" : "2.6cqw",
    rowName: cols === 1 ? "2.6cqw" : cols === 2 ? "2.8cqw" : "2.2cqw",
    rowTeamAbbr: cols === 1 ? "1.4cqw" : cols === 2 ? "1.2cqw" : "1cqw",
    rowMark: cols === 1 ? "3cqw" : cols === 2 ? "3cqw" : "2.6cqw",
    rowHeight: cols === 1 ? "8.5cqh" : cols === 2 ? "8cqh" : "7.5cqh",
    logo: cols === 1 ? "3.5cqw" : cols === 2 ? "3.2cqw" : "2.6cqw",
    headshot: cols === 1 ? "26cqh" : cols === 2 ? "24cqh" : "22cqh",
    headshotW: cols === 1 ? "10cqw" : cols === 2 ? "10cqw" : "8cqw",
    spotLogo: cols === 1 ? "8cqw" : cols === 2 ? "6cqw" : "4.5cqw",
    spotHeight: cols === 1 ? "28cqh" : cols === 2 ? "26cqh" : "24cqh",
    meetLogo: cols === 1 ? "3.5cqw" : cols === 2 ? "2.8cqw" : "2.2cqw",
  };

  /** Render one athlete spotlight */
  function Spotlight({ athlete, evt }: { athlete: MultiFieldAthlete | null | undefined; evt: MultiFieldEvent }) {
    if (!athlete) {
      return (
        <div style={{
          height: s.spotHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
        }}>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: s.spotTeam, fontWeight: 600 }}>
            Awaiting data…
          </span>
        </div>
      );
    }

    return (
      <div style={{
        height: s.spotHeight,
        display: "flex",
        alignItems: "center",
        padding: "1cqh 1.2cqw",
        gap: "1.2cqw",
        background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Headshot */}
        <div style={{
          width: s.headshotW,
          height: s.headshot,
          borderRadius: "0.6cqw",
          overflow: "hidden",
          flexShrink: 0,
          background: "#1a1f2e",
          border: "2px solid rgba(255,255,255,0.1)",
        }}>
          {athlete.headshotUrl ? (
            <img src={athlete.headshotUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #1a2332 0%, #0f1720 100%)",
            }}>
              <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "3.5cqw", fontWeight: 700 }}>
                {athlete.firstName?.charAt(0)}{athlete.lastName?.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.2cqh" }}>
          {/* Name — no truncation, auto-fits */}
          <div style={{
            fontSize: s.spotName,
            fontWeight: 800,
            color: "#fff",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            lineHeight: 1.15,
            wordBreak: "break-word",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
          }}>
            {athlete.firstName} {athlete.lastName}
          </div>
          {/* Team */}
          <div style={{
            fontSize: s.spotTeam,
            color: "rgba(255,255,255,0.65)",
            fontWeight: 500,
            fontStyle: "italic",
          }}>
            {athlete.team}
          </div>

          {/* Mark + secondary */}
          {athlete.mark && (
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.8cqw", marginTop: "0.3cqh" }}>
              <span style={{
                fontSize: s.spotMark,
                fontWeight: 800,
                color: "#fff",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.02em",
              }}>
                {athlete.mark}
              </span>
              <span style={{ fontSize: s.spotSub }}>
                <SecondaryMark athlete={athlete} evt={evt} />
              </span>
            </div>
          )}

          {/* Place + Attempt */}
          <div style={{ display: "flex", alignItems: "center", gap: "1cqw", marginTop: "0.2cqh" }}>
            {athlete.place != null && athlete.mark && (
              <span style={{
                fontSize: s.spotDetail,
                fontWeight: 700,
                color: accent,
                background: "rgba(255,255,255,0.1)",
                padding: "0.15cqh 0.6cqw",
                borderRadius: "0.3cqh",
              }}>
                {athlete.place}{athlete.place === 1 ? "st" : athlete.place === 2 ? "nd" : athlete.place === 3 ? "rd" : "th"}
              </span>
            )}
            {evt.isVertical ? (
              athlete.attemptsDisplay && athlete.attemptsDisplay.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.2cqw" }}>
                  {athlete.attemptsDisplay.join('').split('').map((ch, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: s.spotXO,
                        fontWeight: 800,
                        color: ch === 'O' ? "#22c55e" : ch === 'P' ? "#eab308" : "#ef4444",
                      }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              )
            ) : (
              athlete.attemptNum != null && athlete.attemptNum > 0 && (
                <span style={{ fontSize: s.spotDetail, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
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
            style={{
              height: s.spotLogo,
              width: "auto",
              objectFit: "contain",
              flexShrink: 0,
              alignSelf: "center",
              opacity: 0.9,
            }}
          />
        )}
      </div>
    );
  }

  /** Render a standings row */
  function StandingsRow({ entry, rowIdx }: { entry: MultiFieldEntry; rowIdx: number }) {
    const isEven = rowIdx % 2 === 0;
    const hasMark = entry.bestMark && entry.bestMark !== '' && entry.bestMark !== 'DNS';

    return (
      <div
        style={{
          height: s.rowHeight,
          maxHeight: s.rowHeight,
          flex: "0 1 auto",
          display: "flex",
          alignItems: "center",
          background: isEven ? "rgba(255,255,255,0.02)" : "transparent",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 0.8cqw",
        }}
      >
        {/* Place */}
        <span style={{
          fontSize: s.rowPlace,
          fontWeight: 800,
          color: entry.isDNS ? "rgba(255,255,255,0.3)" : hasMark ? "#fff" : "rgba(255,255,255,0.3)",
          width: cols === 1 ? "3cqw" : cols === 2 ? "3.5cqw" : "3cqw",
          textAlign: "center",
          flexShrink: 0,
          fontFamily: "'Oswald', sans-serif",
        }}>
          {entry.isDNS ? "—" : (entry.place != null ? entry.place : "")}
        </span>

        {/* Team logo */}
        <div style={{
          width: s.logo,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "0.4cqw",
          marginRight: "0.6cqw",
        }}>
          {entry.teamLogoUrl ? (
            <img
              src={entry.teamLogoUrl}
              alt=""
              style={{ height: s.logo, width: "auto", objectFit: "contain" }}
            />
          ) : null}
        </div>

        {/* Name */}
        <span style={{
          flex: 1,
          fontSize: s.rowName,
          fontWeight: 700,
          color: entry.isDNS ? "rgba(255,255,255,0.35)" : "#fff",
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {entry.firstName?.charAt(0) ? `${entry.firstName.charAt(0)}. ` : ""}{entry.lastName}
        </span>

        {/* Mark */}
        <span style={{
          fontSize: s.rowMark,
          fontWeight: 700,
          color: entry.isDNS ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.9)",
          fontFamily: "'Oswald', sans-serif",
          flexShrink: 0,
          textAlign: "right",
          minWidth: cols === 1 ? "6cqw" : cols === 2 ? "7cqw" : "6cqw",
        }}>
          {entry.isDNS ? "DNS" : entry.bestMark}
        </span>
      </div>
    );
  }

  /** Render one event column */
  function EventColumn({ evt, colIdx }: { evt: MultiFieldEvent; colIdx: number }) {
    // Limit rows to prevent overflow: single-col shows 10 (5+5), multi-col caps at 7
    const maxVisible = cols === 1 ? 10 : Math.min(maxRows, 7);
    const standingsToShow = cols === 1
      ? evt.standings.slice(0, maxVisible)
      : evt.standings.slice(0, maxVisible);

    const leftStandings = cols === 1 ? standingsToShow.slice(0, 5) : standingsToShow;
    const rightStandings = cols === 1 ? standingsToShow.slice(5, 10) : [];

    return (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        borderRight: colIdx < cols - 1 ? "2px solid rgba(255,255,255,0.08)" : undefined,
      }}>
        {/* Event name header */}
        <div style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)`,
          padding: "1cqh 1cqw",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle pattern overlay */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
          }} />
          <span style={{
            fontSize: s.headerName,
            fontWeight: 800,
            textTransform: "uppercase",
            color: "#fff",
            letterSpacing: "0.1em",
            textShadow: "0 2px 8px rgba(0,0,0,0.4)",
            position: "relative",
            zIndex: 1,
            textAlign: "center",
          }}>
            {evt.eventName}
          </span>

          {/* Meet logo in header corner */}
          {meetLogoUrl && colIdx === 0 && (
            <img
              src={meetLogoUrl}
              alt=""
              style={{
                position: "absolute",
                right: "0.8cqw",
                top: "50%",
                transform: "translateY(-50%)",
                height: s.meetLogo,
                width: "auto",
                objectFit: "contain",
                opacity: 0.7,
                zIndex: 1,
              }}
            />
          )}
        </div>

        {/* Accent line under header */}
        <div style={{
          height: "3px",
          flexShrink: 0,
          background: `linear-gradient(90deg, ${accent}, ${adjustBrightness(accent, 1.4)}, ${accent})`,
        }} />

        {/* Spotlight */}
        <Spotlight athlete={evt.currentAthlete} evt={evt} />

        {/* Divider between spotlight and standings */}
        <div style={{
          height: "2px",
          flexShrink: 0,
          background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`,
        }} />

        {/* Standings */}
        {cols === 1 ? (
          <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              {leftStandings.map((entry, i) => (
                <StandingsRow key={`${entry.bibNumber}-${i}`} entry={entry} rowIdx={i} />
              ))}
            </div>
            <div style={{ width: "2px", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              {rightStandings.map((entry, i) => (
                <StandingsRow key={`${entry.bibNumber}-${i + 6}`} entry={entry} rowIdx={i + 6} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {leftStandings.map((entry, i) => (
              <StandingsRow key={`${entry.bibNumber}-${i}`} entry={entry} rowIdx={i} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
        containerType: "size" as any,
        background: "#0d1117",
        fontFamily: "'Oswald', 'Inter', sans-serif",
      }}
    >
      {events.map((evt, colIdx) => (
        <EventColumn key={evt.eventNumber} evt={evt} colIdx={colIdx} />
      ))}
    </div>
  );
}
