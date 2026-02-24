import { useState, useEffect } from "react";
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
  const ws = useWebSocket();

  const params = new URLSearchParams(window.location.search);
  const meetId = params.get("meetId");

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
      document.documentElement.style.width = "";
      document.documentElement.style.height = "";
      document.documentElement.style.overflow = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.overflow = "";
      document.body.style.margin = "";
      document.body.style.padding = "";
    };
  }, []);

  useEffect(() => {
    fetch("/api/lap-counter")
      .then((r) => r.json())
      .then((d) => {
        setLap(d.lap);
        setMode(d.mode ?? "lap");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!meetId) return;
    fetch(`/api/meets/${meetId}`)
      .then((r) => r.json())
      .then((d) => setMeet(d))
      .catch(() => {});
  }, [meetId]);

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "lap_counter_update") {
          setLap(data.lap);
          setMode(data.mode ?? "lap");
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [ws]);

  const fontSize = lap === 0 ? 48 : lap >= 10 ? 72 : 96;

  return (
    <div
      data-testid="lap-counter-display"
      style={{
        width: "128px",
        height: "128px",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        margin: 0,
        padding: 0,
      }}
    >
      {mode === "logo" && meet?.logoUrl ? (
        <img
          src={meet.logoUrl}
          alt={meet.name}
          data-testid="img-meet-logo-display"
          style={{
            width: "112px",
            height: "112px",
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : (
        <span
          data-testid="text-display-lap"
          style={{
            color: "#ffffff",
            fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
            fontWeight: 900,
            fontSize: `${fontSize}px`,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            userSelect: "none",
          }}
        >
          {lap === 0 ? "—" : lap}
        </span>
      )}
    </div>
  );
}
