import { useState, useEffect } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Image } from "lucide-react";

interface Meet {
  id: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

const LAP_BUTTONS = Array.from({ length: 25 }, (_, i) => i + 1);

export default function LapCounterControl() {
  const [activeLap, setActiveLap] = useState<number>(0);
  const [mode, setMode] = useState<"lap" | "logo">("lap");
  const [meet, setMeet] = useState<Meet | null>(null);
  const [meets, setMeets] = useState<Meet[]>([]);
  const [meetId, setMeetId] = useState<string>(() => new URLSearchParams(window.location.search).get("meetId") ?? "");
  const [sending, setSending] = useState(false);
  const ws = useWebSocket();

  const primary = meet?.primaryColor ?? "#0066CC";
  const secondary = meet?.secondaryColor ?? "#003366";

  useEffect(() => {
    fetch("/api/meets")
      .then((r) => r.json())
      .then((list: Meet[]) => {
        setMeets(list);
        if (!meetId && list.length === 1) {
          setMeetId(list[0].id);
        }
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
    fetch("/api/lap-counter")
      .then((r) => r.json())
      .then((d) => {
        setActiveLap(d.lap);
        setMode(d.mode ?? "lap");
      })
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

  const displayUrl = meetId
    ? `${window.location.origin}/lap-counter/display?meetId=${meetId}`
    : `${window.location.origin}/lap-counter/display`;

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
          {meet?.logoUrl && (
            <img src={meet.logoUrl} alt={meet.name} className="h-8 w-8 object-contain" />
          )}
          <h1 className="text-white text-xl font-bold tracking-wide">Lap Counter</h1>
        </div>
        <div className="flex items-center gap-3">
          {meets.length > 1 && (
            <select
              data-testid="select-meet"
              value={meetId}
              onChange={(e) => setMeetId(e.target.value)}
              className="rounded-md px-2 py-1 text-sm text-white border border-white/20"
              style={{ background: primary }}
            >
              <option value="">— Select Meet —</option>
              {meets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          <div className="text-right">
            <div className="text-white/60 text-xs">Current</div>
            <div
              className="text-white text-3xl font-black tabular-nums w-12 text-center"
              data-testid="text-current-lap"
            >
              {mode === "logo" ? <Image className="w-6 h-6 mx-auto" /> : (activeLap === 0 ? "—" : activeLap)}
            </div>
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
            disabled={sending || !meet?.logoUrl}
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
