import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, Award, Clock, ShieldCheck, RotateCcw, Filter } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Event, EntryWithDetails } from "@shared/schema";
import { formatTimeValue } from "@shared/formatting";

type ProtestStatus = null | "protest" | "ready_for_awards" | "awarded";

interface EventWithEntries extends Event {
  entries: EntryWithDetails[];
}

function getStatusBadge(event: EventWithEntries) {
  if (!event.isScored) {
    return <Badge variant="outline" className="text-muted-foreground">Not Ready</Badge>;
  }
  switch (event.protestStatus as ProtestStatus) {
    case "protest":
      return <Badge variant="destructive" className="animate-pulse">Protest Period</Badge>;
    case "ready_for_awards":
      return <Badge className="bg-green-600 hover:bg-green-700">Ready for Awards</Badge>;
    case "awarded":
      return <Badge variant="secondary">Awarded</Badge>;
    default:
      return <Badge className="bg-blue-600 hover:bg-blue-700">Scored — Ready</Badge>;
  }
}

function formatMark(mark: number | null | undefined, resultType: string): string {
  if (mark == null) return "—";
  if (resultType === "time") return formatTimeValue(mark);
  if (resultType === "distance" || resultType === "height") return `${mark.toFixed(2)}m`;
  if (resultType === "points") return mark.toFixed(0);
  return mark.toString();
}

function computeQualifierTags(
  event: EventWithEntries,
): Map<string, string> {
  const tags = new Map<string, string>();
  if (!event.numRounds || event.numRounds <= 1) return tags;
  if (!event.advanceByPlace && !event.advanceByTime) return tags;

  const nonQualified: { id: string; mark: number }[] = [];

  for (const entry of event.entries) {
    const prelimPlace = entry.preliminaryPlace;
    if (!prelimPlace) continue;

    if (event.advanceByPlace && prelimPlace <= event.advanceByPlace) {
      tags.set(entry.id, "Q");
    } else if (entry.preliminaryMark != null) {
      nonQualified.push({ id: entry.id, mark: entry.preliminaryMark });
    }
  }

  if (event.advanceByTime && nonQualified.length > 0) {
    const resultType = event.entries[0]?.resultType;
    const lowerIsBetter = resultType === "time";
    nonQualified.sort((a, b) => lowerIsBetter ? a.mark - b.mark : b.mark - a.mark);
    const count = Math.min(event.advanceByTime, nonQualified.length);
    for (let i = 0; i < count; i++) {
      tags.set(nonQualified[i].id, "q");
    }
  }

  return tags;
}

function getRoundLabel(event: EventWithEntries): string {
  if (!event.numRounds || event.numRounds <= 1) return "Final";
  return "Preliminary";
}

function getResultEntries(event: EventWithEntries): Array<{
  entry: EntryWithDetails;
  place: number | null;
  mark: number | null;
  heat: number | null;
  lane: number | null;
  wind: number | null;
  qualTag: string | null;
  resultNote: string | null;
}> {
  const isFinal = !event.numRounds || event.numRounds <= 1;
  const qualTags = computeQualifierTags(event);
  
  const mapped = event.entries
    .map((entry) => {
      if (isFinal) {
        return {
          entry,
          place: entry.finalPlace,
          mark: entry.finalMark,
          heat: entry.finalHeat,
          lane: entry.finalLane,
          wind: entry.finalWind,
          qualTag: null,
          resultNote: entry.finalNote || entry.notes || null,
        };
      } else {
        return {
          entry,
          place: entry.preliminaryPlace,
          mark: entry.preliminaryMark,
          heat: entry.preliminaryHeat,
          lane: entry.preliminaryLane,
          wind: entry.preliminaryWind,
          qualTag: qualTags.get(entry.id) || null,
          resultNote: entry.preliminaryNote || entry.notes || null,
        };
      }
    })
    .filter((r) => r.place != null || r.mark != null);

  if (isFinal) {
    mapped.sort((a, b) => (a.place ?? 999) - (b.place ?? 999));
  } else {
    // Prelims: Q's first (by mark), then q's (by mark), then rest (by mark)
    const qualRank = (tag: string | null) => tag === "Q" ? 0 : tag === "q" ? 1 : 2;
    mapped.sort((a, b) => {
      const rankDiff = qualRank(a.qualTag) - qualRank(b.qualTag);
      if (rankDiff !== 0) return rankDiff;
      return (a.mark ?? 999999) - (b.mark ?? 999999);
    });
    // Assign overall place (1 through N)
    mapped.forEach((r, idx) => { r.place = idx + 1; });
  }

  return mapped;
}

function ProtestPrintView({
  event,
  meetName,
  meetLogoUrl,
  entries,
  mode,
}: {
  event: EventWithEntries;
  meetName: string;
  meetLogoUrl?: string | null;
  entries: ReturnType<typeof getResultEntries>;
  mode: "protest" | "awards";
}) {
  const isFinal = !event.numRounds || event.numRounds <= 1;
  const roundLabel = getRoundLabel(event);
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const genderLabel = event.gender === "M" || event.gender === "m" ? "Men's" : "Women's";
  const eventDisplayName = event.name.startsWith(genderLabel) ? event.name : `${genderLabel} ${event.name}`;

  return (
    <div className="print-page" style={{ fontFamily: "Arial, sans-serif", color: "#000", background: "#fff", padding: "0.5in" }}>
      {/* Header with logo */}
      <div style={{ marginBottom: "24px", borderBottom: "3px solid #000", paddingBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "12px" }}>
          {meetLogoUrl && (
            <img src={meetLogoUrl} alt="Meet logo" style={{ height: "60px", objectFit: "contain" }} />
          )}
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: "0", letterSpacing: "0.5px", textTransform: "uppercase" }}>{meetName}</h1>
          </div>
          {meetLogoUrl && (
            <img src={meetLogoUrl} alt="Meet logo" style={{ height: "60px", objectFit: "contain" }} />
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: "8px", padding: "6px 0", borderTop: "1px solid #666", borderBottom: "1px solid #666" }}>
          <div style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "2px", textTransform: "uppercase" }}>
            {mode === "protest" ? "OFFICIAL PROTEST FORM" : "OFFICIAL AWARDS FORM"}
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <div style={{ fontSize: "15px", fontWeight: "bold" }}>
            Event {event.eventNumber} — {eventDisplayName}
          </div>
          <div style={{ fontSize: "13px", color: "#333", marginTop: "2px" }}>
            {roundLabel}
          </div>
        </div>
      </div>

      {/* Time info */}
      <div style={{ marginBottom: "20px", fontSize: "13px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span><strong>Date:</strong> {dateStr}</span>
          <span><strong>Results Posted:</strong> {timeStr}</span>
        </div>
        {mode === "protest" ? (
          <div style={{ fontSize: "14px", marginTop: "12px", padding: "10px 12px", border: "2px solid #000", background: "#fafafa" }}>
            <strong>Protest Period Ends: </strong>
            <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "200px" }}>&nbsp;</span>
          </div>
        ) : (
          <div style={{ fontSize: "14px", marginTop: "12px", padding: "10px 12px", border: "2px solid #000", background: "#fafafa" }}>
            <strong>Protest Period Ended: </strong>
            <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "200px" }}>&nbsp;</span>
          </div>
        )}
      </div>

      {/* Results table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #000" }}>
            <th style={{ textAlign: "left", padding: "6px 4px", width: "40px" }}>Place</th>
            <th style={{ textAlign: "left", padding: "6px 4px" }}>Name</th>
            <th style={{ textAlign: "left", padding: "6px 4px" }}>Team</th>
            <th style={{ textAlign: "right", padding: "6px 4px", width: "80px" }}>Mark</th>
            {entries.some((e) => e.resultNote) && (
              <th style={{ textAlign: "left", padding: "6px 4px" }}>Note</th>
            )}
            {!isFinal && <th style={{ textAlign: "center", padding: "6px 4px", width: "50px" }}>Heat</th>}
            {!isFinal && <th style={{ textAlign: "center", padding: "6px 4px", width: "50px" }}>Lane</th>}
            {entries.some((e) => e.wind != null) && (
              <th style={{ textAlign: "right", padding: "6px 4px", width: "50px" }}>Wind</th>
            )}
            {!isFinal && <th style={{ textAlign: "center", padding: "6px 4px", width: "30px" }}></th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((row, idx) => {
            const athlete = row.entry.athlete;
            const team = row.entry.team;
            const isDisqualified = row.entry.isDisqualified;
            const isScratched = row.entry.isScratched;

            return (
              <tr
                key={row.entry.id}
                style={{
                  borderBottom: "1px solid #ccc",
                  backgroundColor: mode === "awards" && isFinal && idx < 3 ? "#f0f0f0" : "transparent",
                }}
              >
                <td style={{ padding: "5px 4px", fontWeight: idx < 3 && isFinal ? "bold" : "normal" }}>
                  {isDisqualified ? "DQ" : isScratched ? "SCR" : row.place ?? "—"}
                </td>
                <td style={{ padding: "5px 4px" }}>
                  {athlete ? `${athlete.lastName}, ${athlete.firstName}` : "—"}
                </td>
                <td style={{ padding: "5px 4px" }}>
                  {team?.name || team?.abbreviation || "—"}
                </td>
                <td style={{ padding: "5px 4px", textAlign: "right" }}>
                  {isDisqualified ? "DQ" : isScratched ? "SCR" : formatMark(row.mark, row.entry.resultType)}
                </td>
                {entries.some((e) => e.resultNote) && (
                  <td style={{ padding: "5px 4px", fontSize: "11px", color: "#444" }}>
                    {row.resultNote || ""}
                  </td>
                )}
                {!isFinal && (
                  <td style={{ padding: "5px 4px", textAlign: "center" }}>{row.heat ?? "—"}</td>
                )}
                {!isFinal && (
                  <td style={{ padding: "5px 4px", textAlign: "center" }}>{row.lane ?? "—"}</td>
                )}
                {entries.some((e) => e.wind != null) && (
                  <td style={{ padding: "5px 4px", textAlign: "right" }}>
                    {row.wind != null ? row.wind.toFixed(1) : ""}
                  </td>
                )}
                {!isFinal && (
                  <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: "bold" }}>
                    {row.qualTag || ""}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer for prelims */}
      {!isFinal && event.advanceByPlace && (
        <div style={{ marginTop: "16px", fontSize: "11px", color: "#666" }}>
          <strong>Q</strong> = Qualified by place (top {event.advanceByPlace} per heat)
          {event.advanceByTime ? (
            <span> &nbsp;|&nbsp; <strong>q</strong> = Qualified by time (next {event.advanceByTime} fastest)</span>
          ) : null}
        </div>
      )}

      {/* Signature line */}
      <div style={{ marginTop: "40px", borderTop: "1px solid #ccc", paddingTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "250px" }}>&nbsp;</span>
            <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>Referee Signature</div>
          </div>
          <div>
            <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "150px" }}>&nbsp;</span>
            <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>Time</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProtestAwardsPage() {
  const { currentMeetId, currentMeet } = useMeet();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: events = [], isLoading } = useQuery<EventWithEntries[]>({
    queryKey: ["/api/meets", currentMeetId, "protest-awards"],
    queryFn: async () => {
      const res = await fetch(`/api/meets/${currentMeetId}/protest-awards`);
      if (!res.ok) throw new Error("Failed to load events");
      return res.json();
    },
    enabled: !!currentMeetId,
    refetchInterval: 10000,
  });

  const updateProtestStatus = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: ProtestStatus }) => {
      return await apiRequest("PATCH", `/api/events/${eventId}/protest-status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", currentMeetId, "protest-awards"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handlePrint = (event: EventWithEntries, mode: "protest" | "awards") => {
    const entries = getResultEntries(event);
    const meetName = currentMeet?.name || "Track & Field Meet";
    const meetLogoUrl = currentMeet?.logoUrl || null;
    const isFinal = !event.numRounds || event.numRounds <= 1;
    const roundLabel = getRoundLabel(event);
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const hasWind = entries.some((e) => e.wind != null);
    const hasNotes = entries.some((e) => e.resultNote);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Popup Blocked", description: "Please allow popups to print", variant: "destructive" });
      return;
    }

    const genderLabel = event.gender === "M" || event.gender === "m" ? "Men's" : "Women's";
    const eventDisplayName = event.name.startsWith(genderLabel) ? event.name : `${genderLabel} ${event.name}`;

    const rows = entries.map((row, idx) => {
      const athlete = row.entry.athlete;
      const team = row.entry.team;
      const isDQ = row.entry.isDisqualified;
      const isSCR = row.entry.isScratched;
      const bg = mode === "awards" && isFinal && idx < 3 ? "background-color: #f0f0f0;" : "";
      const bold = idx < 3 && isFinal ? "font-weight: bold;" : "";

      let cells = `
        <td style="padding:6px 8px;${bold}">${isDQ ? "DQ" : isSCR ? "SCR" : row.place ?? "—"}</td>
        <td style="padding:6px 8px;">${athlete ? `${athlete.lastName}, ${athlete.firstName}` : "—"}</td>
        <td style="padding:6px 8px;">${team?.name || team?.abbreviation || "—"}</td>
        <td style="padding:6px 8px;text-align:right;">${isDQ ? "DQ" : isSCR ? "SCR" : formatMark(row.mark, row.entry.resultType)}</td>
      `;
      if (hasNotes) {
        cells += `<td style="padding:6px 8px;font-size:11px;color:#444;">${row.resultNote || ""}</td>`;
      }
      if (!isFinal) {
        cells += `<td style="padding:6px 8px;text-align:center;">${row.heat ?? "—"}</td>`;
        cells += `<td style="padding:6px 8px;text-align:center;">${row.lane ?? "—"}</td>`;
      }
      if (hasWind) {
        cells += `<td style="padding:6px 8px;text-align:right;">${row.wind != null ? row.wind.toFixed(1) : ""}</td>`;
      }
      if (!isFinal) {
        cells += `<td style="padding:6px 8px;text-align:center;font-weight:bold;">${row.qualTag || ""}</td>`;
      }
      return `<tr style="border-bottom:1px solid #ddd;${bg}">${cells}</tr>`;
    }).join("");

    let headerCells = `
      <th style="text-align:left;padding:8px;width:40px;">Place</th>
      <th style="text-align:left;padding:8px;">Name</th>
      <th style="text-align:left;padding:8px;">Team</th>
      <th style="text-align:right;padding:8px;width:80px;">Mark</th>
    `;
    if (hasNotes) {
      headerCells += `<th style="text-align:left;padding:8px;">Note</th>`;
    }
    if (!isFinal) {
      headerCells += `<th style="text-align:center;padding:8px;width:50px;">Heat</th>`;
      headerCells += `<th style="text-align:center;padding:8px;width:50px;">Lane</th>`;
    }
    if (hasWind) {
      headerCells += `<th style="text-align:right;padding:8px;width:50px;">Wind</th>`;
    }
    if (!isFinal) {
      headerCells += `<th style="text-align:center;padding:8px;width:30px;"></th>`;
    }

    const protestLine = mode === "protest"
      ? `<div style="font-size:14px;margin-top:12px;padding:10px 14px;border:2px solid #000;background:#fafafa;"><strong>Protest Period Ends: </strong><span style="border-bottom:1px solid #000;display:inline-block;width:200px;">&nbsp;</span></div>`
      : `<div style="font-size:14px;margin-top:12px;padding:10px 14px;border:2px solid #000;background:#fafafa;"><strong>Protest Period Ended: </strong><span style="border-bottom:1px solid #000;display:inline-block;width:200px;">&nbsp;</span></div>`;

    let qualFooter = "";
    if (!isFinal && event.advanceByPlace) {
      qualFooter = `<div style="margin-top:16px;font-size:11px;color:#666;"><strong>Q</strong> = Qualified by place (top ${event.advanceByPlace} per heat)`;
      if (event.advanceByTime) {
        qualFooter += ` &nbsp;|&nbsp; <strong>q</strong> = Qualified by time (next ${event.advanceByTime} fastest)`;
      }
      qualFooter += `</div>`;
    }

    const logoImg = meetLogoUrl
      ? `<img src="${meetLogoUrl}" alt="Meet logo" style="height:64px;object-fit:contain;" />`
      : '';
    const logoLeft = meetLogoUrl ? `<td style="width:80px;text-align:center;vertical-align:middle;">${logoImg}</td>` : '';
    const logoRight = meetLogoUrl ? `<td style="width:80px;text-align:center;vertical-align:middle;">${logoImg}</td>` : '';

    const html = `<!DOCTYPE html>
<html><head><title>${mode === "protest" ? "Protest" : "Awards"} — ${eventDisplayName}</title>
<style>
  @media print { body { margin: 0; } @page { margin: 0.5in; } }
  body { font-family: Arial, sans-serif; color: #000; padding: 0.5in; }
  .header-table { width: 100%; border-collapse: collapse; }
  .header-table td { padding: 0; }
</style></head><body>
  <div style="margin-bottom:24px;border-bottom:3px solid #000;padding-bottom:16px;">
    <table class="header-table"><tr>
      ${logoLeft}
      <td style="text-align:center;vertical-align:middle;">
        <div style="font-size:22px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;">${meetName}</div>
      </td>
      ${logoRight}
    </tr></table>
    <div style="text-align:center;margin-top:10px;padding:6px 0;border-top:1px solid #666;border-bottom:1px solid #666;">
      <span style="font-size:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${mode === "protest" ? "OFFICIAL PROTEST FORM" : "OFFICIAL AWARDS FORM"}</span>
    </div>
    <div style="text-align:center;margin-top:10px;">
      <div style="font-size:15px;font-weight:bold;">Event ${event.eventNumber} — ${eventDisplayName}</div>
      <div style="font-size:13px;color:#333;margin-top:2px;">${roundLabel}</div>
    </div>
  </div>
  <div style="margin-bottom:20px;font-size:13px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span><strong>Date:</strong> ${dateStr}</span>
      <span><strong>Results Posted:</strong> ${timeStr}</span>
    </div>
    ${protestLine}
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead><tr style="border-bottom:2px solid #000;background:#f5f5f5;">${headerCells}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${qualFooter}
  <div style="margin-top:48px;border-top:1px solid #999;padding-top:16px;">
    <div style="display:flex;justify-content:space-between;">
      <div><span style="border-bottom:1px solid #000;display:inline-block;width:250px;">&nbsp;</span>
        <div style="font-size:10px;color:#666;margin-top:4px;">Referee Signature</div></div>
      <div><span style="border-bottom:1px solid #000;display:inline-block;width:150px;">&nbsp;</span>
        <div style="font-size:10px;color:#666;margin-top:4px;">Time</div></div>
    </div>
  </div>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };

    // Update status if printing protest form for the first time
    if (mode === "protest" && !event.protestStatus) {
      updateProtestStatus.mutate({ eventId: event.id, status: "protest" });
    }
  };

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        if (search) {
          const q = search.toLowerCase();
          if (!event.name.toLowerCase().includes(q) && !String(event.eventNumber).includes(q)) {
            return false;
          }
        }
        if (genderFilter !== "all" && event.gender.toLowerCase() !== genderFilter.toLowerCase()) {
          return false;
        }
        if (statusFilter === "not_ready" && event.isScored) return false;
        if (statusFilter === "scored" && (!event.isScored || event.protestStatus)) return false;
        if (statusFilter === "protest" && event.protestStatus !== "protest") return false;
        if (statusFilter === "ready_for_awards" && event.protestStatus !== "ready_for_awards") return false;
        if (statusFilter === "awarded" && event.protestStatus !== "awarded") return false;
        return true;
      })
      .sort((a, b) => a.eventNumber - b.eventNumber);
  }, [events, search, genderFilter, statusFilter]);

  const stats = useMemo(() => {
    const scored = events.filter((e) => e.isScored).length;
    const inProtest = events.filter((e) => e.protestStatus === "protest").length;
    const readyForAwards = events.filter((e) => e.protestStatus === "ready_for_awards").length;
    const awarded = events.filter((e) => e.protestStatus === "awarded").length;
    return { total: events.length, scored, inProtest, readyForAwards, awarded };
  }, [events]);

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading events...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Protest & Awards</h1>
          <p className="text-sm text-muted-foreground">
            Manage protest periods and awards printing for scored events
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-5 gap-2">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Events</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.scored}</div>
          <div className="text-xs text-muted-foreground">Scored</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.inProtest}</div>
          <div className="text-xs text-muted-foreground">In Protest</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.readyForAwards}</div>
          <div className="text-xs text-muted-foreground">Ready for Awards</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.awarded}</div>
          <div className="text-xs text-muted-foreground">Awarded</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="m">Men</SelectItem>
            <SelectItem value="f">Women</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_ready">Not Ready</SelectItem>
            <SelectItem value="scored">Scored (No Action)</SelectItem>
            <SelectItem value="protest">In Protest</SelectItem>
            <SelectItem value="ready_for_awards">Ready for Awards</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Event list */}
      <div className="space-y-2">
        {filteredEvents.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No events match your filters
          </div>
        )}
        {filteredEvents.map((event) => {
          const status = event.protestStatus as ProtestStatus;
          const resultEntries = getResultEntries(event);
          const hasResults = resultEntries.length > 0;

          return (
            <Card key={event.id} className={!event.isScored ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Event info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-lg font-mono font-bold text-muted-foreground w-10 text-right">
                      {event.eventNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {event.name.startsWith(event.gender === "M" || event.gender === "m" ? "Men's" : "Women's") ? event.name : `${event.gender === "M" || event.gender === "m" ? "Men's" : "Women's"} ${event.name}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getRoundLabel(event)} · {hasResults ? `${resultEntries.length} results` : "No results"}
                        {event.protestPrintedAt && (
                          <span className="ml-2">
                            · Protest printed {new Date(event.protestPrintedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(event)}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    {event.isScored && hasResults && (
                      <>
                        {/* Print Protest Form */}
                        {(!status || status === "protest") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrint(event, "protest")}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Protest Form
                          </Button>
                        )}

                        {/* Mark Ready for Awards */}
                        {status === "protest" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => updateProtestStatus.mutate({ eventId: event.id, status: "ready_for_awards" })}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            Clear Protest
                          </Button>
                        )}

                        {/* Print Awards Form */}
                        {(status === "ready_for_awards" || status === "awarded") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrint(event, "awards")}
                          >
                            <Award className="h-4 w-4 mr-1" />
                            Awards Form
                          </Button>
                        )}

                        {/* Mark Awarded */}
                        {status === "ready_for_awards" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateProtestStatus.mutate({ eventId: event.id, status: "awarded" })}
                          >
                            <Award className="h-4 w-4 mr-1" />
                            Mark Awarded
                          </Button>
                        )}

                        {/* Reset */}
                        {status && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateProtestStatus.mutate({ eventId: event.id, status: null })}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
