import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Image, ChevronLeft, Maximize } from "lucide-react";

interface Meet {
  id: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

const LAP_BUTTONS = Array.from({ length: 25 }, (_, i) => i + 1);

export default function LapCounterControl() {
  const [meets, setMeets] = useState<Meet[] | null>(null);
  const [meet, setMeet] = useState<Meet | null>(null);
  const [activeLap, setActiveLap] = useState<number>(0);
  const [mode, setMode] = useState<"lap" | "logo">("lap");
  const [sending, setSending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const ws = useWebSocket();

  const primary = meet?.primaryColor ?? "#0066CC";
  const secondary = meet?.secondaryColor ?? "#003366";

  useEffect(() => {
    fetch("/api/meets")
      .then((r) => r.json())
      .then((list: Meet[]) => {
        setMeets(list);
        if (list.length === 1) setMeet(list[0]);
      })
      .catch(() => setMeets([]));
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

  function requestFullscreen() {
    const el = rootRef.current ?? document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen();
    }
  }

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
        ref={rootRef}
        className="h-screen overflow-hidden flex flex-col items-center justify-center gap-6 p-6"
        style={{ background: "#111827" }}
        data-testid="lap-counter-meet-picker"
      >
        <h1 className="text-white text-4xl font-black tracking-wide">Lap Counter</h1>
        <p className="text-gray-400 text-lg">Select a meet</p>

        <div className="w-full max-w-sm flex flex-col gap-3">
          {meets === null && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {meets !== null && meets.length === 0 && (
            <p className="text-gray-500 text-center py-8">No meets found</p>
          )}
          {meets !== null && meets.map((m) => (
            <button
              key={m.id}
              data-testid={`button-meet-${m.id}`}
              onClick={() => setMeet(m)}
              className="w-full rounded-2xl px-5 py-5 text-left flex items-center gap-4 active:scale-95 transition-transform duration-75"
              style={{ background: m.secondaryColor ?? "#1e3a5f" }}
            >
              {m.logoUrl && (
                <img
                  src={m.logoUrl}
                  alt={m.name}
                  className="w-12 h-12 object-contain flex-shrink-0"
                />
              )}
              <span className="text-white font-bold text-2xl">{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const displayUrl = `${window.location.origin}/lap-counter/display?meetId=${meet.id}`;

  return (
    <div
      ref={rootRef}
      className="h-screen overflow-hidden flex flex-col"
      data-testid="lap-counter-control"
      style={{ background: "#111827" }}
    >
      <header
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ background: secondary }}
      >
        <div className="flex items-center gap-3">
          <button
            data-testid="button-back-to-meets"
            onClick={() => setMeet(null)}
            className="text-white/70 active:text-white p-1"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          {meet.logoUrl && (
            <img src={meet.logoUrl} alt={meet.name} className="h-9 w-9 object-contain" />
          )}
          <span className="text-white text-lg font-bold truncate max-w-[140px]">{meet.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white/60 text-xs">Laps To Go</div>
            <div
              className="text-white text-3xl font-black tabular-nums w-12 text-center"
              data-testid="text-current-lap"
            >
              {mode === "logo" ? "—" : (activeLap === 0 ? "—" : activeLap)}
            </div>
          </div>
          <button
            data-testid="button-fullscreen"
            onClick={requestFullscreen}
            className="text-white/60 active:text-white p-1"
            title="Full screen"
          >
            <Maximize className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="grid grid-cols-5 gap-2 flex-1 content-stretch">
          {LAP_BUTTONS.map((lap) => {
            const isActive = mode === "lap" && lap === activeLap;
            return (
              <button
                key={lap}
                data-testid={`button-lap-${lap}`}
                onClick={() => selectLap(lap)}
                disabled={sending}
                className="rounded-xl flex items-center justify-center font-black text-4xl select-none transition-transform duration-75 active:scale-95 w-full h-full"
                style={{
                  background: isActive ? primary : "#1f2937",
                  color: isActive ? "#ffffff" : "#d1d5db",
                  boxShadow: isActive ? `0 0 14px ${primary}88` : "none",
                  cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.7 : 1,
                  minHeight: 0,
                }}
              >
                {lap}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          <button
            data-testid="button-show-logo"
            onClick={showLogo}
            disabled={sending || !meet.logoUrl}
            className="rounded-xl py-3 flex items-center justify-center gap-2 font-bold text-white active:scale-95 transition-transform duration-75 disabled:opacity-40"
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
            className="rounded-xl py-3 font-bold active:scale-95 transition-transform duration-75"
            style={{ background: "#374151", color: "#9ca3af" }}
          >
            Clear
          </button>
        </div>

        <div className="text-center flex-shrink-0">
          <p className="text-gray-600 text-xs">
            Display:{" "}
            <a
              href={displayUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 underline break-all"
            >
              {displayUrl}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
