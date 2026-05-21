/**
 * DaisyChainPanel — Purpose-built for P6 daisy chain multi-panel field event displays.
 *
 * Each instance is bound to a single FieldLynx port and reads ONLY from
 * liveEventDataByPort[port].  No SceneCanvas, no scene mappings, no shared
 * state between panels.  Port isolation is architectural, not conditional.
 *
 * Layout is designed for 288 × 144 LED panels (P6) but scales via container
 * queries so it works at any aspect-ratio-preserved size.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Meet } from "@shared/schema";

/* ── types ─────────────────────────────────────────────────────────── */

interface FieldEntry {
  place?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  affiliation?: string;
  bib?: string;
  mark?: string;
  bestMark?: string;
  markConverted?: string;
  attemptNumber?: string;
  attempts?: string;
  wind?: string;
  eventPoints?: number;
  lane?: string;
}

interface PortEventData {
  eventNumber: number;
  eventName: string;
  mode?: string;
  wind?: string;
  entries: FieldEntry[];
  isMultiEvent?: boolean;
  eventType?: string;
  gender?: string;
}

interface DaisyChainPanelProps {
  port: number;
  width: number;
  height: number;
  meetId: string | null;
  liveEventDataByPort: Record<number, any>;
}

/* ── helpers ───────────────────────────────────────────────────────── */

function initial(name?: string): string {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + ".";
}

function formatMark(entry: FieldEntry): string {
  const raw = entry.bestMark || entry.mark || "";
  if (!raw) return "--";
  return String(raw);
}

function placeLabel(p: string | undefined): string | null {
  if (!p) return null;
  const n = parseInt(p);
  if (isNaN(n) || n <= 0) return null;
  const s = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${s}`;
}

/* ── component ─────────────────────────────────────────────────────── */

export function DaisyChainPanel({ port, width, height, meetId, liveEventDataByPort }: DaisyChainPanelProps) {
  const { data: meet } = useQuery<Meet>({
    queryKey: ["/api/meets", meetId],
    enabled: !!meetId,
  });

  const portData: PortEventData | null = liveEventDataByPort[port] || null;

  // Current athlete = first entry (FieldLynx sends the active athlete first)
  const currentAthlete: FieldEntry | null = useMemo(() => {
    if (!portData?.entries?.length) return null;
    return portData.entries[0];
  }, [portData]);

  const primaryColor = meet?.primaryColor || "#0066CC";
  const secondaryColor = meet?.secondaryColor || "#003366";

  /* ── idle state: show meet logo ────────────────────────────────── */
  if (!portData || !currentAthlete) {
    return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Diagonal stripes overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.3) 6px, rgba(255,255,255,0.3) 7px)",
          }}
        />
        {meet?.logoUrl ? (
          <img
            src={meet.logoUrl}
            alt=""
            style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain", position: "relative", zIndex: 1 }}
          />
        ) : (
          <div
            style={{
              color: "#fff",
              fontSize: `${Math.round(height * 0.12)}px`,
              fontWeight: 700,
              fontFamily: "'Barlow Semi Condensed', sans-serif",
              textAlign: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: `${Math.round(height * 0.06)}px`,
                height: `${Math.round(height * 0.06)}px`,
                borderRadius: "50%",
                background: "#22c55e",
                margin: "0 auto 4px",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            Port {port}
          </div>
        )}
      </div>
    );
  }

  /* ── active state: show athlete ────────────────────────────────── */
  const firstName = currentAthlete.firstName || currentAthlete.name?.split(" ")[0] || "";
  const lastName = currentAthlete.lastName || currentAthlete.name?.split(" ").slice(1).join(" ") || currentAthlete.name || "";
  const displayName = `${initial(firstName)} ${lastName}`.trim().toUpperCase();
  const team = currentAthlete.affiliation || "";
  const mark = formatMark(currentAthlete);
  const place = placeLabel(currentAthlete.place);
  const eventName = portData.eventName || `Event ${portData.eventNumber}`;
  const isMulti = portData.isMultiEvent;
  const points = currentAthlete.eventPoints;

  // English conversion (metric → imperial) if available
  const converted = currentAthlete.markConverted || "";

  // Team logo URL
  const teamLogoUrl = team ? `/logos/NCAA/${encodeURIComponent(team)}.png` : null;

  // Font sizes scaled to panel dimensions
  const fs = {
    event: Math.round(height * 0.10),
    name: Math.round(height * 0.17),
    team: Math.round(height * 0.09),
    mark: Math.round(height * 0.22),
    converted: Math.round(height * 0.09),
    place: Math.round(height * 0.10),
    points: Math.round(height * 0.08),
    attempt: Math.round(height * 0.08),
  };

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: "#000",
        overflow: "hidden",
        position: "relative",
        fontFamily: "'Barlow Semi Condensed', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Subtle gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 120% 80% at 50% 100%, rgba(0,100,200,0.15) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Top bar: event name */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: `${Math.round(height * 0.02)}px ${Math.round(width * 0.03)}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: `${fs.event}px`,
            fontWeight: 700,
            color: "rgba(255,255,255,0.6)",
            textTransform: "uppercase",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {eventName}
        </span>
      </div>

      {/* Main content: athlete info */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `0 ${Math.round(width * 0.03)}px`,
          gap: `${Math.round(height * 0.01)}px`,
          minHeight: 0,
        }}
      >
        {/* Name row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: `${Math.round(width * 0.02)}px`,
            maxWidth: "100%",
          }}
        >
          {teamLogoUrl && (
            <img
              src={teamLogoUrl}
              alt=""
              style={{
                width: `${Math.round(height * 0.14)}px`,
                height: `${Math.round(height * 0.14)}px`,
                objectFit: "contain",
                flexShrink: 0,
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <span
            style={{
              fontSize: `${fs.name}px`,
              fontWeight: 800,
              color: "#fff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
        </div>

        {/* Team name */}
        {team && (
          <span
            style={{
              fontSize: `${fs.team}px`,
              fontWeight: 500,
              color: "rgba(255,255,255,0.55)",
              fontStyle: "italic",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "95%",
            }}
          >
            {team}
          </span>
        )}

        {/* Mark + place row */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: `${Math.round(width * 0.03)}px`,
          }}
        >
          {place && (
            <span
              style={{
                fontSize: `${fs.place}px`,
                fontWeight: 700,
                color: "#111",
                background: "#d4a843",
                padding: `${Math.round(height * 0.01)}px ${Math.round(width * 0.02)}px`,
                borderRadius: `${Math.round(height * 0.02)}px`,
                lineHeight: 1.1,
              }}
            >
              {place}
            </span>
          )}
          <span
            style={{
              fontSize: `${fs.mark}px`,
              fontWeight: 800,
              color: "#fff",
              fontFamily: "'Oswald', 'Bebas Neue', sans-serif",
              letterSpacing: "0.02em",
              textShadow: "0 0 12px rgba(0,180,255,0.4)",
            }}
          >
            {mark}
          </span>
          {converted && (
            <span
              style={{
                fontSize: `${fs.converted}px`,
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              ({converted})
            </span>
          )}
        </div>

        {/* Points for multi-event */}
        {isMulti && points != null && points > 0 && (
          <span
            style={{
              fontSize: `${fs.points}px`,
              fontWeight: 700,
              color: "#eab308",
            }}
          >
            {points} pts
          </span>
        )}

        {/* Attempt info */}
        {currentAthlete.attemptNumber && (
          <span
            style={{
              fontSize: `${fs.attempt}px`,
              fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            Attempt {currentAthlete.attemptNumber}
          </span>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(to right, transparent, rgba(0,180,255,0.4), transparent)",
          flexShrink: 0,
        }}
      />
    </div>
  );
}
