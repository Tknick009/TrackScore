import { useState, useEffect } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Image, ChevronLeft } from "lucide-react";

interface Meet {
  id: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

const LAP_BUTTONS = Array.from({ length: 25 }, (_, i) => i + 1);

export default function LapCounterControl() {
  const [meets, setMeets] = useState<Meet[]>([]);
  const [meet, setMeet] = useState<Meet | null>(null);
  const [activeLap, setActiveLap] = useState<number>(0);
  const [mode, setMode] = useState<"lap" | "logo">("lap");
  const [sending, setSending] = useState(false);
  const ws = useWebSocket();

  const primary = meet?.primaryColor ?? "#0066CC";
  const secondary = meet?.secondaryColor ?? "#003366";

  useEffect(() => {
    fetch("/api/meets")
      .then((r) => r.json())
      .then((list: Meet[]) => setMeets(list))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/lap-counter")
      .then((r) => r.json())
      .then((d) => { setActiveLap(d.lap); setMode(d.mode ?? "lap"); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "lap_counter_update") {
          setActiveLap(data.lap);
          setMode(data.mode ?? "lap");
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
        body: JSON.stringify({ lap, mode: "lap" }),
      });
      setActiveLap(lap);
      setMode("lap");
    } finally {
      setSending(false);
    }
  }

  async function showLogo() {
    if (sending) return;
    setSending(true);
    try {
      await fetch("/api/lap-counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "logo" }),
      });
      setMode("logo");
    } finally {
      setSending(false);
    }
  }

  async function clearDisplay() {
    if (sending) return;
    setSending(true);
    try {
      await fetch("/api/lap-counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lap: 0, mode: "lap" }),
      });
      setActiveLap(0);
      setMode("lap");
    } finally {
      setSending(false);
    }
  }

  if (!meet) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 p-6"
        style={{ background: "#111827" }}
        data-testid="lap-counter-meet-picker"
      >
        <h1 className="text-white text-3xl font-bold tracking-wide">Lap Counter</h1>
        <p className="text-gray-400 text-lg">Select a meet to continue</p>
        <div className="w-full max-w-sm flex flex-col gap-3">
          {meets.length === 0 && (
            <p className="text-gray-500 text-center">Loading meets...</p>
          )}
          {meets.map((m) => (
            <button
              key={m.id}
              data-testid={`button-meet-${m.id}`}
              onClick={() => setMeet(m)}
              className="w-full rounded-xl px-5 py-4 text-left flex items-center gap-4 transition-transform duration-75 active:scale-95"
              style={{ background: m.secondaryColor ?? "#1e3a5f" }}
            >
              {m.logoUrl && (
                <img src={m.logoUrl} alt={m.name} className="w-10 h-10 object-contain flex-shrink-0" />
              )}
              <span className="text-white font-bold text-xl">{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const displayUrl = `${window.location.origin}/lap-counter/display?meetId=${meet.id}`;

  return (
    <div
      className="min-h-screen flex flex-col"
      data-testid="lap-counter-control"
      style={{ background: "#111827" }}
    >
      <header
        className="flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ background: secondary }}
      >
        <div className="flex items-center gap-3">
          <button
            data-testid="button-back-to-meets"
            onClick={() => setMeet(null)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          {meet.logoUrl && (
            <img src={meet.logoUrl} alt={meet.name} className="h-8 w-8 object-contain" />
          )}
          <h1 className="text-white text-xl font-bold tracking-wide">{meet.name}</h1>
        </div>
        <div className="text-right">
          <div className="text-white/60 text-xs">Current Lap</div>
          <div
            className="text-white text-3xl font-black tabular-nums w-14 text-center"
            data-testid="text-current-lap"
          >
            {mode === "logo" ? "—" : (activeLap === 0 ? "—" : activeLap)}
          </div>
        </div>
      </header>

      <main className="flex-1 p-3 flex flex-col gap-3">
        <div className="grid grid-cols-5 gap-2 flex-1">
          {LAP_BUTTONS.map((lap) => {
            const isActive = mode === "lap" && lap === activeLap;
            return (
              <button
                key={lap}
                data-testid={`button-lap-${lap}`}
                onClick={() => selectLap(lap)}
                disabled={sending}
                className="rounded-xl flex items-center justify-center font-black text-4xl select-none transition-transform duration-75 active:scale-95"
                style={{
                  minHeight: "4.5rem",
                  background: isActive ? primary : "#1f2937",
                  color: isActive ? "#ffffff" : "#d1d5db",
                  boxShadow: isActive ? `0 0 12px ${primary}66` : "none",
                  cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {lap}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            data-testid="button-show-logo"
            onClick={showLogo}
            disabled={sending || !meet.logoUrl}
            className="rounded-xl py-3 flex items-center justify-center gap-2 font-bold text-white transition-transform duration-75 active:scale-95 disabled:opacity-40"
            style={{
              background: mode === "logo" ? primary : "#374151",
              boxShadow: mode === "logo" ? `0 0 12px ${primary}66` : "none",
            }}
          >
            <Image className="w-5 h-5" />
            Meet Logo
          </button>

          <button
            data-testid="button-lap-clear"
            onClick={clearDisplay}
            disabled={sending}
            className="rounded-xl py-3 font-bold transition-transform duration-75 active:scale-95"
            style={{ background: "#374151", color: "#9ca3af" }}
          >
            Clear
          </button>
        </div>

        <div className="text-center">
          <p className="text-gray-600 text-xs">
            Display URL:{" "}
            <a href={displayUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline break-all">
              {displayUrl}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
