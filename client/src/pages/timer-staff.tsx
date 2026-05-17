import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, Award, ShieldCheck, RotateCcw, Filter, Lock, Unlock, MessageSquare, X, AlertTriangle, Clock, Edit2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Event, EntryWithDetails } from "@shared/schema";
import { formatTimeValue } from "@shared/formatting";

type ProtestStatus = null | "protest" | "ready_for_awards" | "awarded";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

interface EventWithEntries extends Event {
  entries: EntryWithDetails[];
}

function getStatusBadge(event: EventWithEntries) {
  if (event.timingLocked) {
    return <Badge className="bg-orange-600 hover:bg-orange-700 text-sm px-3 py-1">Locked</Badge>;
  }
  if (!event.isScored) {
    return <Badge variant="outline" className="text-muted-foreground text-sm px-3 py-1">Not Ready</Badge>;
  }
  switch (event.protestStatus as ProtestStatus) {
    case "protest":
      if (event.protestFiled) {
        return <Badge variant="destructive" className="animate-pulse text-sm px-3 py-1 bg-red-700">⚠ Protest Filed</Badge>;
      }
      return <Badge variant="destructive" className="animate-pulse text-sm px-3 py-1">Protest Period</Badge>;
    case "ready_for_awards":
      return <Badge className="bg-green-600 hover:bg-green-700 text-sm px-3 py-1">Ready for Awards</Badge>;
    case "awarded":
      return <Badge variant="secondary" className="text-sm px-3 py-1">Awarded</Badge>;
    default:
      if (event.hytekStatus === "done") {
        return <Badge className="bg-yellow-600 hover:bg-yellow-700 text-sm px-3 py-1">Done — Ready</Badge>;
      }
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1">Scored — Ready</Badge>;
  }
}

function formatMark(mark: number | null | undefined, resultType: string): string {
  if (mark == null) return "—";
  if (resultType === "time") return formatTimeValue(mark);
  if (resultType === "distance" || resultType === "height") return `${mark.toFixed(2)}m`;
  if (resultType === "points") return mark.toFixed(0);
  return mark.toString();
}

function computeQualifierTags(event: EventWithEntries): Map<string, string> {
  const tags = new Map<string, string>();
  if (!event.numRounds || event.numRounds <= 1) return tags;
  if (!event.advanceByPlace && !event.advanceByTime) return tags;

  const resultType = event.entries[0]?.resultType;
  const lowerIsBetter = resultType === "time";

  // Group entries by heat and compute per-heat placement
  // Q = qualified by place within each heat (top N per heat)
  // q = qualified by next best time across all heats
  const heatGroups = new Map<number, { id: string; mark: number }[]>();
  for (const entry of event.entries) {
    if (entry.preliminaryMark == null || entry.preliminaryHeat == null) continue;
    const heat = entry.preliminaryHeat;
    if (!heatGroups.has(heat)) heatGroups.set(heat, []);
    heatGroups.get(heat)!.push({ id: entry.id, mark: entry.preliminaryMark });
  }

  // Sort each heat by mark and assign Q to top N
  const nonQualified: { id: string; mark: number }[] = [];
  for (const [, heatEntries] of heatGroups) {
    heatEntries.sort((a, b) => lowerIsBetter ? a.mark - b.mark : b.mark - a.mark);
    for (let i = 0; i < heatEntries.length; i++) {
      if (event.advanceByPlace && i < event.advanceByPlace) {
        tags.set(heatEntries[i].id, "Q");
      } else {
        nonQualified.push(heatEntries[i]);
      }
    }
  }

  // Assign q to next best times across all non-Q athletes
  if (event.advanceByTime && nonQualified.length > 0) {
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
    const qualRank = (tag: string | null) => tag === "Q" ? 0 : tag === "q" ? 1 : 2;
    const resultType = event.entries[0]?.resultType;
    const lowerIsBetter = resultType === "time";
    mapped.sort((a, b) => {
      const rankDiff = qualRank(a.qualTag) - qualRank(b.qualTag);
      if (rankDiff !== 0) return rankDiff;
      if (lowerIsBetter) return (a.mark ?? 999999) - (b.mark ?? 999999);
      return (b.mark ?? -999999) - (a.mark ?? -999999);
    });
    mapped.forEach((r, idx) => { r.place = idx + 1; });
  }

  return mapped;
}

function handlePrint(
  event: EventWithEntries,
  mode: "protest" | "awards",
  meetName: string,
  meetLogoUrl: string | null,
  toast: any,
) {
  const entries = getResultEntries(event);
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
      <td style="padding:6px 8px;">${athlete ? escapeHtml(`${athlete.lastName}, ${athlete.firstName}`) : "—"}</td>
      <td style="padding:6px 8px;">${escapeHtml(team?.name || team?.abbreviation || "—")}</td>
      <td style="padding:6px 8px;text-align:right;">${isDQ ? "DQ" : isSCR ? "SCR" : formatMark(row.mark, row.entry.resultType)}</td>
    `;
    if (hasNotes) {
      cells += `<td style="padding:6px 8px;font-size:11px;color:#444;">${row.resultNote ? escapeHtml(row.resultNote) : ""}</td>`;
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

  // Pre-fill protest end time if available, otherwise show blank line
  const protestEndStr = event.protestEndAt
    ? new Date(event.protestEndAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : (() => {
        const end = new Date(now.getTime() + 15 * 60 * 1000);
        return end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      })();
  const protestLine = mode === "protest"
    ? `<div style="font-size:14px;margin-top:12px;padding:10px 14px;border:2px solid #000;background:#fafafa;"><strong>Protest Period Ends: </strong>${escapeHtml(protestEndStr)}</div>`
    : `<div style="font-size:14px;margin-top:12px;padding:10px 14px;border:2px solid #000;background:#fafafa;"><strong>Protest Period Ended: </strong><span style="border-bottom:1px solid #000;display:inline-block;width:200px;">&nbsp;</span></div>`;

  let qualFooter = "";
  if (!isFinal && event.advanceByPlace) {
    qualFooter = `<div style="margin-top:16px;font-size:11px;color:#666;"><strong>Q</strong> = Qualified by place (top ${event.advanceByPlace} per heat)`;
    if (event.advanceByTime) {
      qualFooter += ` &nbsp;|&nbsp; <strong>q</strong> = Qualified by time (next ${event.advanceByTime} fastest)`;
    }
    qualFooter += `</div>`;
  }

  let notesSection = "";
  if (event.protestNotes) {
    notesSection = `<div style="margin-top:16px;padding:10px 14px;border:1px solid #999;background:#fffde7;font-size:12px;"><strong>Notes:</strong> ${escapeHtml(event.protestNotes)}</div>`;
  }

  const logoImg = meetLogoUrl
    ? `<img src="${meetLogoUrl}" alt="Meet logo" style="height:64px;object-fit:contain;" />`
    : '';
  const logoCell = meetLogoUrl ? `<td style="width:80px;text-align:center;vertical-align:middle;">${logoImg}</td>` : '';

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
      ${logoCell}
      <td style="text-align:center;vertical-align:middle;">
        <div style="font-size:22px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;">${escapeHtml(meetName)}</div>
      </td>
    </tr></table>
    <div style="text-align:center;margin-top:10px;padding:6px 0;border-top:1px solid #666;border-bottom:1px solid #666;">
      <span style="font-size:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${mode === "protest" ? "OFFICIAL PROTEST FORM" : "OFFICIAL AWARDS FORM"}</span>
    </div>
    <div style="text-align:center;margin-top:10px;">
      <div style="font-size:15px;font-weight:bold;">Event ${event.eventNumber} — ${escapeHtml(eventDisplayName)}</div>
      <div style="font-size:13px;color:#333;margin-top:2px;">${roundLabel}</div>
    </div>
  </div>
  <div style="margin-bottom:20px;font-size:15px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:15px;"><strong>Date:</strong> ${dateStr}</span>
      <span style="font-size:16px;font-weight:bold;"><strong>Results Posted:</strong> ${timeStr}</span>
    </div>
    ${protestLine}
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead><tr style="border-bottom:2px solid #000;background:#f5f5f5;">${headerCells}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${qualFooter}
  ${notesSection}
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
}

export default function TimerStaffPage() {
  const { currentMeetId, currentMeet } = useMeet();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [notesEventId, setNotesEventId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  const { data: events = [], isLoading } = useQuery<EventWithEntries[]>({
    queryKey: ["/api/meets", currentMeetId, "protest-awards"],
    queryFn: async () => {
      const res = await fetch(`/api/meets/${currentMeetId}/protest-awards`);
      if (!res.ok) throw new Error("Failed to load events");
      return res.json();
    },
    enabled: !!currentMeetId,
    refetchInterval: 5000,
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

  const toggleLock = useMutation({
    mutationFn: async ({ eventId, locked }: { eventId: string; locked: boolean }) => {
      return await apiRequest("PATCH", `/api/events/${eventId}/timing-lock`, { locked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", currentMeetId, "protest-awards"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ eventId, notes }: { eventId: string; notes: string | null }) => {
      return await apiRequest("PATCH", `/api/events/${eventId}/protest-notes`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", currentMeetId, "protest-awards"] });
      setNotesEventId(null);
      setNotesText("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProtestFiled = useMutation({
    mutationFn: async ({ eventId, filed }: { eventId: string; filed: boolean }) => {
      return await apiRequest("PATCH", `/api/events/${eventId}/protest-filed`, { filed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", currentMeetId, "protest-awards"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProtestEndTime = useMutation({
    mutationFn: async ({ eventId, endAt, reset }: { eventId: string; endAt?: string; reset?: boolean }) => {
      return await apiRequest("PATCH", `/api/events/${eventId}/protest-end-time`, { endAt, reset });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", currentMeetId, "protest-awards"] });
      setEditingEndTimeEventId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const [editingEndTimeEventId, setEditingEndTimeEventId] = useState<string | null>(null);
  const [editEndTimeValue, setEditEndTimeValue] = useState("");

  const onPrint = (event: EventWithEntries, mode: "protest" | "awards") => {
    const meetName = currentMeet?.name || "Track & Field Meet";
    const meetLogoUrl = currentMeet?.logoUrl || null;
    handlePrint(event, mode, meetName, meetLogoUrl, toast);

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
        if (statusFilter === "locked" && !event.timingLocked) return false;
        if (statusFilter === "unlocked" && event.timingLocked) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by scheduled day, then time, then event number
        const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
        const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        const timeA = a.eventTime || '';
        const timeB = b.eventTime || '';
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        return a.eventNumber - b.eventNumber;
      });
  }, [events, search, genderFilter, statusFilter]);

  const stats = useMemo(() => {
    const scored = events.filter((e) => e.isScored && !e.protestStatus).length;
    const inProtest = events.filter((e) => e.protestStatus === "protest").length;
    const readyForAwards = events.filter((e) => e.protestStatus === "ready_for_awards").length;
    const awarded = events.filter((e) => e.protestStatus === "awarded").length;
    const locked = events.filter((e) => e.timingLocked).length;
    return { total: events.length, scored, inProtest, readyForAwards, awarded, locked };
  }, [events]);

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading events...</div>;
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timer Staff</h1>
          <p className="text-sm text-muted-foreground">
            Lock events, manage protest periods, print forms, and add notes
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.scored}</div>
          <div className="text-xs text-muted-foreground">Ready</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.inProtest}</div>
          <div className="text-xs text-muted-foreground">In Protest</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.readyForAwards}</div>
          <div className="text-xs text-muted-foreground">Awards Ready</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.awarded}</div>
          <div className="text-xs text-muted-foreground">Awarded</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.locked}</div>
          <div className="text-xs text-muted-foreground">Locked</div>
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
            <SelectItem value="scored">Ready (No Action)</SelectItem>
            <SelectItem value="protest">In Protest</SelectItem>
            <SelectItem value="ready_for_awards">Ready for Awards</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
            <SelectItem value="unlocked">Unlocked</SelectItem>
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
          const isLocked = event.timingLocked;

          const genderLabel = event.gender === "M" || event.gender === "m" ? "Men's" : "Women's";
          const eventDisplayName = event.name.startsWith(genderLabel) ? event.name : `${genderLabel} ${event.name}`;

          return (
            <Card key={event.id} className={!event.isScored && !isLocked ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Event info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-lg font-mono font-bold text-muted-foreground w-12 text-right">
                      {event.eventNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base truncate">
                        {eventDisplayName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getRoundLabel(event)} · {hasResults ? `${resultEntries.length} results` : "No results"}
                      </div>
                      {/* Protest timer display */}
                      {status === "protest" && event.protestPrintedAt && (
                        <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>
                            Started: {new Date(event.protestPrintedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </span>
                          {event.protestEndAt && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              {editingEndTimeEventId === event.id ? (
                                <span className="flex items-center gap-1">
                                  <span>Ends:</span>
                                  <input
                                    type="time"
                                    className="border rounded px-1 py-0.5 text-xs w-24"
                                    value={editEndTimeValue}
                                    onChange={(e) => setEditEndTimeValue(e.target.value)}
                                  />
                                  <Button size="sm" variant="ghost" className="h-5 px-1 text-xs" onClick={() => {
                                    if (editEndTimeValue) {
                                      const today = new Date();
                                      const [h, m] = editEndTimeValue.split(':').map(Number);
                                      today.setHours(h, m, 0, 0);
                                      updateProtestEndTime.mutate({ eventId: event.id, endAt: today.toISOString() });
                                    }
                                  }}>Save</Button>
                                  <Button size="sm" variant="ghost" className="h-5 px-1 text-xs" onClick={() => setEditingEndTimeEventId(null)}>Cancel</Button>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <span className={new Date(event.protestEndAt) < new Date() ? "text-red-600 font-semibold" : "font-semibold"}>
                                    Ends: {new Date(event.protestEndAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                  </span>
                                  <Button size="sm" variant="ghost" className="h-5 px-1" onClick={() => {
                                    const d = new Date(event.protestEndAt!);
                                    setEditEndTimeValue(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
                                    setEditingEndTimeEventId(event.id);
                                  }}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </span>
                              )}
                              <Button size="sm" variant="ghost" className="h-5 px-1 text-xs text-muted-foreground" onClick={() => {
                                updateProtestEndTime.mutate({ eventId: event.id, reset: true });
                              }}>
                                <RotateCcw className="h-3 w-3 mr-0.5" />Reset
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                      {event.protestNotes && (
                        <div className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-0.5 mt-1 inline-block">
                          <MessageSquare className="h-3 w-3 inline mr-1" />{event.protestNotes}
                        </div>
                      )}
                    </div>
                    {getStatusBadge(event)}
                  </div>

                  {/* Action buttons — bigger */}
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {/* Lock/Unlock — always available for scored events */}
                    {event.isScored && (
                      <Button
                        size="lg"
                        variant={isLocked ? "default" : "outline"}
                        className={`text-base px-5 py-3 ${isLocked ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                        onClick={() => toggleLock.mutate({ eventId: event.id, locked: !isLocked })}
                      >
                        {isLocked ? <Unlock className="h-5 w-5 mr-2" /> : <Lock className="h-5 w-5 mr-2" />}
                        {isLocked ? "Unlock" : "Lock"}
                      </Button>
                    )}

                    {event.isScored && hasResults && !isLocked && (
                      <>
                        {(!status || status === "protest") && (
                          <Button
                            size="lg"
                            variant="outline"
                            className="text-base px-5 py-3"
                            onClick={() => onPrint(event, "protest")}
                          >
                            <Printer className="h-5 w-5 mr-2" />
                            Protest Form
                          </Button>
                        )}

                        {status === "protest" && !event.protestFiled && (
                          <Button
                            size="lg"
                            variant="destructive"
                            className="text-base px-5 py-3"
                            onClick={() => updateProtestFiled.mutate({ eventId: event.id, filed: true })}
                          >
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            Protest Received
                          </Button>
                        )}

                        {status === "protest" && event.protestFiled && (
                          <Button
                            size="lg"
                            variant="outline"
                            className="text-base px-5 py-3 border-green-600 text-green-700"
                            onClick={() => updateProtestFiled.mutate({ eventId: event.id, filed: false })}
                          >
                            <ShieldCheck className="h-5 w-5 mr-2" />
                            Resolve Protest
                          </Button>
                        )}

                        {status === "protest" && !event.protestFiled && (
                          <Button
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-base px-5 py-3"
                            onClick={() => updateProtestStatus.mutate({ eventId: event.id, status: "ready_for_awards" })}
                          >
                            <ShieldCheck className="h-5 w-5 mr-2" />
                            Clear Protest
                          </Button>
                        )}

                        {/* Timer staff can force-print awards even when protest is filed */}
                        {(status === "ready_for_awards" || status === "awarded" || (status === "protest" && event.protestFiled)) && (
                          <Button
                            size="lg"
                            variant="outline"
                            className="text-base px-5 py-3"
                            onClick={() => onPrint(event, "awards")}
                          >
                            <Award className="h-5 w-5 mr-2" />
                            {event.protestFiled ? "Force Print Awards" : "Awards Form"}
                          </Button>
                        )}

                        {status === "ready_for_awards" && (
                          <Button
                            size="lg"
                            className="text-base px-5 py-3"
                            onClick={() => updateProtestStatus.mutate({ eventId: event.id, status: "awarded" })}
                          >
                            <Award className="h-5 w-5 mr-2" />
                            Mark Awarded
                          </Button>
                        )}

                        {/* Notes button */}
                        <Button
                          size="lg"
                          variant="ghost"
                          className="px-3 py-3"
                          onClick={() => {
                            setNotesEventId(event.id);
                            setNotesText(event.protestNotes || "");
                          }}
                        >
                          <MessageSquare className="h-5 w-5" />
                        </Button>

                        {status && (
                          <Button
                            size="lg"
                            variant="ghost"
                            className="px-3 py-3"
                            onClick={() => updateProtestStatus.mutate({ eventId: event.id, status: null })}
                          >
                            <RotateCcw className="h-5 w-5" />
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

      {/* Notes modal */}
      {notesEventId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setNotesEventId(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Event Notes</h3>
              <Button variant="ghost" size="sm" onClick={() => setNotesEventId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <textarea
              className="w-full border rounded p-3 text-sm min-h-[100px] mb-4"
              placeholder="e.g., DQ - Lane violation Rule 163.3"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              {notesText && (
                <Button variant="outline" onClick={() => {
                  updateNotes.mutate({ eventId: notesEventId, notes: null });
                }}>
                  Clear Notes
                </Button>
              )}
              <Button onClick={() => {
                updateNotes.mutate({ eventId: notesEventId, notes: notesText || null });
              }}>
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
