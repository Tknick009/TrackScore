import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";

interface Meet {
  id: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

export default function LapCounterDisplay() {
  const [lap, setLap] = useState<number>(0);
  const [mode, setMode] = useState<"lap" | "logo">("lap");
  const [meet, setMeet] = useState<Meet | null>(null);
  const meetIdRef = useRef<string | null>(null);
  const ws = useWebSocket();

  const urlMeetId = new URLSearchParams(window.location.search).get("meetId");
  const primary = meet?.primaryColor ?? "#0066CC";
  const secondary = meet?.secondaryColor ?? "#003366";

  useEffect(() => {
    document.documentElement.style.width = "128px";
    document.documentElement.style.height = "128px";
    document.documentElement.style.overflow = "hidden";
    document.body.style.width = "128px";
    document.body.style.height = "128px";
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    return () => {
      document.documentElement.style.cssText = "";
      document.body.style.cssText = "";
    };
  }, []);

  function loadMeet(id: string) {
    if (meetIdRef.current === id) return;
    meetIdRef.current = id;
    fetch(`/api/meets/${id}`)
      .then((r) => r.json())
      .then((d) => setMeet(d))
      .catch(() => {});
  }

  useEffect(() => {
    fetch("/api/lap-counter")
      .then((r) => r.json())
      .then((d) => {
        setLap(d.lap);
        setMode(d.mode ?? "lap");
        if (d.meetId) loadMeet(d.meetId);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (urlMeetId) loadMeet(urlMeetId);
  }, [urlMeetId]);

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "lap_counter_update") {
          setLap(data.lap);
          setMode(data.mode ?? "lap");
          if (data.meetId) loadMeet(data.meetId);
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [ws]);

  const numberSize = lap === 0 ? 72 : lap >= 10 ? 82 : 96;

  return (
    <div
      data-testid="lap-counter-display"
      style={{
        width: "128px",
        height: "128px",
        overflow: "hidden",
        background: `linear-gradient(160deg, ${primary}, ${secondary})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "0px",
        margin: 0,
        padding: 0,
      }}
    >
      {mode === "logo" && meet?.logoUrl ? (
        <img
          src={meet.logoUrl}
          alt={meet.name}
          data-testid="img-meet-logo-display"
          style={{ width: "110px", height: "110px", objectFit: "contain" }}
        />
      ) : (
        <>
          <span
            data-testid="text-laps-to-go-label"
            style={{
              color: "rgba(255,255,255,0.9)",
              fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              lineHeight: 1,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              userSelect: "none",
            }}
          >
            Laps To Go
          </span>
          <span
            data-testid="text-display-lap"
            style={{
              color: "#ffffff",
              fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
              fontWeight: 900,
              fontSize: `${numberSize}px`,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              userSelect: "none",
            }}
          >
            {lap === 0 ? "—" : lap}
          </span>
        </>
      )}
    </div>
  );
}
