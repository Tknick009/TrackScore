import { useState, useEffect } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";

const LAP_BUTTONS = Array.from({ length: 25 }, (_, i) => i + 1);

export default function LapCounterControl() {
  const [activeLap, setActiveLap] = useState<number>(0);
  const [sending, setSending] = useState(false);
  const ws = useWebSocket();

  useEffect(() => {
    fetch("/api/lap-counter")
      .then((r) => r.json())
      .then((d) => setActiveLap(d.lap))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "lap_counter_update") {
          setActiveLap(data.lap);
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [ws]);

  async function selectLap(lap: number) {
    if (sending) return;
    setSending(true);
    try {
      await fetch("/api/lap-counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lap }),
      });
      setActiveLap(lap);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-gray-950 flex flex-col"
      data-testid="lap-counter-control"
    >
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-white text-2xl font-bold tracking-wide">Lap Counter</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">Current Lap</span>
          <span
            className="text-white text-4xl font-black w-16 text-center tabular-nums"
            data-testid="text-current-lap"
          >
            {activeLap === 0 ? "—" : activeLap}
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        <div className="grid grid-cols-5 gap-3 flex-1">
          {LAP_BUTTONS.map((lap) => {
            const isActive = lap === activeLap;
            return (
              <button
                key={lap}
                data-testid={`button-lap-${lap}`}
                onClick={() => selectLap(lap)}
                disabled={sending}
                className={[
                  "rounded-xl flex items-center justify-center font-black text-5xl select-none transition-all duration-100 active:scale-95",
                  isActive
                    ? "bg-yellow-400 text-gray-950 shadow-lg shadow-yellow-400/30"
                    : "bg-gray-800 text-white hover:bg-gray-700",
                  sending ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
                style={{ minHeight: "5rem" }}
              >
                {lap}
              </button>
            );
          })}
        </div>

        <button
          data-testid="button-lap-clear"
          onClick={() => selectLap(0)}
          disabled={sending}
          className="w-full py-4 rounded-xl bg-gray-800 text-gray-400 font-bold text-xl hover:bg-gray-700 active:scale-95 transition-all duration-100"
        >
          Clear
        </button>
      </main>
    </div>
  );
}
