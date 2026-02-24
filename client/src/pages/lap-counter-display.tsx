import { useState, useEffect } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";

export default function LapCounterDisplay() {
  const [lap, setLap] = useState<number>(0);
  const ws = useWebSocket();

  useEffect(() => {
    fetch("/api/lap-counter")
      .then((r) => r.json())
      .then((d) => setLap(d.lap))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "lap_counter_update") {
          setLap(data.lap);
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [ws]);

  return (
    <div
      className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden"
      data-testid="lap-counter-display"
    >
      <span
        data-testid="text-display-lap"
        className="text-white font-black leading-none select-none"
        style={{
          fontSize: lap === 0 ? "48px" : lap >= 10 ? "80px" : "100px",
          fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        {lap === 0 ? "—" : lap}
      </span>
    </div>
  );
}
