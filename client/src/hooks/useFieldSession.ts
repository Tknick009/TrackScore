import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/contexts/WebSocketContext";
import type {
  FieldEventSession,
  FieldEventSessionWithDetails,
  FieldEventAthlete,
  FieldEventMark,
  InsertFieldEventMark,
  FieldHeight,
  Athlete,
  Entry,
} from "@shared/schema";
import { isHeightEvent } from "@shared/schema";
import { metersToFeetInchesString, formatHeightMark as _sharedFormatHeightMark } from "@shared/formatting";

const DEVICE_NAME_KEY = "fieldDeviceName";

export type EnrichedAthlete = FieldEventAthlete & {
  entry?: Entry;
  athlete?: Athlete;
};

export function getAthleteDisplayInfo(athlete: EnrichedAthlete) {
  if (athlete.athlete) {
    return {
      name: `${athlete.athlete.firstName} ${athlete.athlete.lastName}`,
      bib: athlete.athlete.bibNumber || "-",
      team: (athlete.entry as Record<string, unknown> & { team?: { abbreviation?: string } })?.team?.abbreviation || "",
    };
  }
  if (athlete.evtFirstName || athlete.evtLastName) {
    return {
      name: `${athlete.evtFirstName || ""} ${athlete.evtLastName || ""}`.trim() || "Unknown",
      bib: athlete.evtBibNumber || "-",
      team: athlete.evtTeam || "",
    };
  }
  return { name: "Unknown Athlete", bib: "-", team: "" };
}

export function formatHeightMark(meters: number, unit: 'metric' | 'english' = 'metric'): string {
  return _sharedFormatHeightMark(meters, unit);
}

export function getAthleteHeightAttempts(athleteId: number, heightIndex: number, marks: FieldEventMark[]): FieldEventMark[] {
  return marks
    .filter(m => m.athleteId === athleteId && m.heightIndex === heightIndex)
    .sort((a, b) => (a.attemptAtHeight || 0) - (b.attemptAtHeight || 0));
}

export function getAthleteAttemptsAtHeight(athleteId: number, heightIndex: number, marks: FieldEventMark[]): string {
  const heightMarks = getAthleteHeightAttempts(athleteId, heightIndex, marks);
  let display = '';
  for (const mark of heightMarks) {
    if (mark.markType === 'cleared') {
      display += 'O';
    } else if (mark.markType === 'missed') {
      display += 'X';
    } else if (mark.markType === 'pass') {
      display += 'P';
    }
  }
  return display;
}

export function isAthleteEliminated(athleteId: number, marks: FieldEventMark[], _heights: FieldHeight[]): boolean {
  let consecutiveMisses = 0;
  const sortedMarks = [...marks]
    .filter(m => m.athleteId === athleteId)
    .sort((a, b) => a.attemptNumber - b.attemptNumber);

  for (const mark of sortedMarks) {
    if (mark.markType === 'missed') {
      consecutiveMisses++;
      if (consecutiveMisses >= 3) {
        return true;
      }
    } else if (mark.markType === 'cleared') {
      consecutiveMisses = 0;
    }
  }
  return false;
}

export function getHighestClearedHeight(athleteId: number, marks: FieldEventMark[], heights: FieldHeight[]): FieldHeight | null {
  const clearedMarks = marks.filter(m => m.athleteId === athleteId && m.markType === 'cleared');
  if (clearedMarks.length === 0) return null;

  let maxHeightIndex = -1;
  for (const mark of clearedMarks) {
    if (mark.heightIndex !== null && mark.heightIndex !== undefined && mark.heightIndex > maxHeightIndex) {
      maxHeightIndex = mark.heightIndex;
    }
  }

  if (maxHeightIndex < 0) return null;
  return heights.find(h => h.heightIndex === maxHeightIndex) || null;
}

export function countMissesAtHeight(athleteId: number, heightIndex: number, marks: FieldEventMark[]): number {
  return marks.filter(
    m => m.athleteId === athleteId && m.heightIndex === heightIndex && m.markType === 'missed'
  ).length;
}

export function countTotalMisses(athleteId: number, marks: FieldEventMark[]): number {
  return marks.filter(m => m.athleteId === athleteId && m.markType === 'missed').length;
}

export function metersToFeetInches(meters: number): string {
  return metersToFeetInchesString(meters);
}

/**
 * Main hook for field session data. Handles all data fetching,
 * WebSocket real-time updates, mutations, and derived state.
 */
export function useFieldSession(sessionId: number) {
  const { toast } = useToast();
  const ws = useWebSocket();

  const [deviceName, setDeviceName] = useState<string>(() => {
    return localStorage.getItem(DEVICE_NAME_KEY) || "";
  });

  const handleDeviceNameChange = useCallback((value: string) => {
    setDeviceName(value);
    localStorage.setItem(DEVICE_NAME_KEY, value);
  }, []);

  // ==================== DATA FETCHING ====================

  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery<FieldEventSessionWithDetails>({
    queryKey: ["/api/field-sessions", sessionId, "full"],
    refetchInterval: 30000,
  });

  const { data: athletes, isLoading: athletesLoading } = useQuery<EnrichedAthlete[]>({
    queryKey: ["/api/field-sessions", sessionId, "athletes"],
    refetchInterval: 30000,
    enabled: !!session,
  });

  const { data: marks } = useQuery<FieldEventMark[]>({
    queryKey: ["/api/field-sessions", sessionId, "marks"],
    refetchInterval: 30000,
    enabled: !!session,
  });

  const { data: heights } = useQuery<FieldHeight[]>({
    queryKey: ["/api/field-sessions", sessionId, "heights"],
    refetchInterval: 30000,
    enabled: !!session,
  });

  // ==================== WEBSOCKET REAL-TIME ====================

  useEffect(() => {
    if (!ws) return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === "field_session_update" ||
          data.type === "field_mark_update" ||
          data.type === "field_athlete_update"
        ) {
          const updateSessionId = data.sessionId || data.update?.sessionId;
          if (updateSessionId === sessionId || !updateSessionId) {
            queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
            queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "marks"] });
            queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "heights"] });
          }
        }
      } catch {
        // ignore parse errors
      }
    };
    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, sessionId]);

  // ==================== DERIVED STATE ====================

  const isVertical = session
    ? isHeightEvent(session.event?.eventType || '') ||
      (session.evtEventName?.toLowerCase().includes('high jump')) ||
      (session.evtEventName?.toLowerCase().includes('pole vault'))
    : false;

  const showBibNumbers = session?.showBibNumbers !== false;
  const eventName = session?.event?.name || session?.evtEventName || "Field Event";
  const totalFlights = Math.max(...(athletes?.map(a => a.flightNumber || 1) || [1]));
  const currentFlight = session?.currentFlightNumber || 1;
  const currentHeightIndex = session?.currentHeightIndex ?? 0;
  const currentHeight = heights?.find(h => h.heightIndex === currentHeightIndex);

  const activeAthletes = athletes?.filter(
    (a) => a.checkInStatus === "checked_in" && a.competitionStatus !== "completed" && a.competitionStatus !== "dns"
  ) || [];

  const dnsAthletes = athletes?.filter(
    (a) => a.checkInStatus === "dns" || a.competitionStatus === "dns"
  ) || [];

  const sortedAthletes = [...activeAthletes].sort((a, b) => {
    if (a.flightNumber !== b.flightNumber) {
      return (a.flightNumber || 1) - (b.flightNumber || 1);
    }
    return a.orderInFlight - b.orderInFlight;
  });

  const totalAttempts = session?.totalAttempts || 6;
  const officiateAttempts = session?.isInFinals
    ? (session?.finalsAttempts || 3)
    : (session?.prelimAttempts || 3);

  // ==================== AUTO CHECK-IN ====================

  const autoCheckInRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!athletes || athletes.length === 0) return;

    const uncheckedAthletes = athletes.filter(
      a => a.checkInStatus !== "checked_in" &&
           a.checkInStatus !== "dns" &&
           !autoCheckInRef.current.has(a.id)
    );

    if (uncheckedAthletes.length === 0) return;

    uncheckedAthletes.forEach(athlete => {
      autoCheckInRef.current.add(athlete.id);
      apiRequest("PATCH", `/api/field-athletes/${athlete.id}`, {
        checkInStatus: "checked_in",
        competitionStatus: "active",
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      }).catch(() => {
        autoCheckInRef.current.delete(athlete.id);
      });
    });
  }, [athletes, sessionId]);

  // ==================== HELPER FUNCTIONS ====================

  const getAthleteMarks = useCallback((athleteId: number) => {
    return (marks || [])
      .filter(m => m.athleteId === athleteId)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  }, [marks]);

  const getAthleteRoundMarks = useCallback((athleteId: number) => {
    const isInFinals = session?.isInFinals || false;
    return (marks || [])
      .filter(m => m.athleteId === athleteId && (m.isFinalsRound || false) === isInFinals)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  }, [marks, session?.isInFinals]);

  const getAthleteBestMark = useCallback((athleteId: number): number | null => {
    const athleteMarks = getAthleteMarks(athleteId);
    const validMarks = athleteMarks
      .filter(m => m.markType === "mark" && m.measurement)
      .map(m => m.measurement as number);
    return validMarks.length > 0 ? Math.max(...validMarks) : null;
  }, [getAthleteMarks]);

  const getLastMarkForAthlete = useCallback((athleteId: number): FieldEventMark | null => {
    const athleteMarks = (marks || [])
      .filter(m => m.athleteId === athleteId)
      .sort((a, b) => b.id - a.id);
    return athleteMarks[0] || null;
  }, [marks]);

  const getLastVerticalMarkForAthlete = useCallback((athleteId: number): FieldEventMark | null => {
    const athleteMarks = (marks || [])
      .filter(m => m.athleteId === athleteId && m.heightIndex === currentHeightIndex)
      .sort((a, b) => b.id - a.id);
    return athleteMarks[0] || null;
  }, [marks, currentHeightIndex]);

  // ==================== UP ATHLETE LOGIC ====================

  const getUpAthlete = useCallback(() => {
    if (sortedAthletes.length === 0) return null;
    const minAttempts = Math.min(...sortedAthletes.map(a => getAthleteRoundMarks(a.id).length));
    return sortedAthletes.find(a => getAthleteRoundMarks(a.id).length === minAttempts) || null;
  }, [sortedAthletes, getAthleteRoundMarks]);

  const getVerticalUpAthlete = useCallback(() => {
    if (!heights || heights.length === 0) return null;

    const eligibleAthletes = sortedAthletes.filter(athlete => {
      const eliminated = isAthleteEliminated(athlete.id, marks || [], heights);
      if (eliminated) return false;

      const startingHeight = athlete.startingHeightIndex;
      if (startingHeight !== null && startingHeight !== undefined && startingHeight > currentHeightIndex) {
        return false;
      }

      const heightAttempts = getAthleteAttemptsAtHeight(athlete.id, currentHeightIndex, marks || []);
      const hasCleared = heightAttempts.includes('O');
      if (hasCleared) return false;

      return heightAttempts.length < 3;
    });

    if (eligibleAthletes.length === 0) return null;

    const aliveGroupSize = session?.aliveGroupSize;
    const activeGroup = aliveGroupSize && aliveGroupSize > 0
      ? eligibleAthletes.slice(0, aliveGroupSize)
      : eligibleAthletes;

    if (activeGroup.length === 0) return null;
    if (activeGroup.length === 1) return activeGroup[0];

    const heightMarks = (marks || [])
      .filter(m => m.heightIndex === currentHeightIndex)
      .sort((a, b) => b.id - a.id);

    if (heightMarks.length === 0) {
      return activeGroup[0];
    }

    const lastAttemptAthleteId = heightMarks[0]?.athleteId;
    const lastAthleteOriginalIndex = sortedAthletes.findIndex(a => a.id === lastAttemptAthleteId);

    if (lastAthleteOriginalIndex === -1) {
      return activeGroup[0];
    }

    for (let offset = 1; offset <= sortedAthletes.length; offset++) {
      const nextIndex = (lastAthleteOriginalIndex + offset) % sortedAthletes.length;
      const candidate = sortedAthletes[nextIndex];
      if (activeGroup.some(a => a.id === candidate.id)) {
        return candidate;
      }
    }

    return activeGroup[0];
  }, [heights, sortedAthletes, marks, currentHeightIndex, session?.aliveGroupSize]);

  // ==================== MUTATIONS ====================

  const submitMarkMutation = useMutation({
    mutationFn: async (mark: InsertFieldEventMark) =>
      apiRequest("POST", "/api/field-marks", { ...mark, deviceName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "marks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
    },
    onError: () => {
      toast({ title: "Failed to record mark", variant: "destructive" });
    },
  });

  const deleteMarkMutation = useMutation({
    mutationFn: async (markId: number) => apiRequest("DELETE", `/api/field-marks/${markId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "marks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete mark", variant: "destructive" });
    },
  });

  const moveFlightMutation = useMutation({
    mutationFn: async ({ athleteId, newFlight }: { athleteId: number; newFlight: number }) => {
      const flightAthletes = (athletes || []).filter(a => (a.flightNumber || 1) === newFlight);
      const maxOrder = flightAthletes.reduce((max, a) => Math.max(max, a.orderInFlight || 0), 0);
      return apiRequest("PATCH", `/api/field-athletes/${athleteId}`, {
        flightNumber: newFlight,
        orderInFlight: maxOrder + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
    },
    onError: () => {
      toast({ title: "Failed to move athlete", variant: "destructive" });
    },
  });

  const forceFinalistMutation = useMutation({
    mutationFn: async ({ athleteId, isFinalist }: { athleteId: number; isFinalist: boolean }) => {
      return apiRequest("PATCH", `/api/field-athletes/${athleteId}`, { isFinalist });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
    },
    onError: () => {
      toast({ title: "Failed to update finalist status", variant: "destructive" });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ athleteId, checkInStatus, competitionStatus }: {
      athleteId: number;
      checkInStatus: string;
      competitionStatus: string;
    }) => {
      return apiRequest("PATCH", `/api/field-athletes/${athleteId}`, { checkInStatus, competitionStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
    },
    onError: () => {
      toast({ title: "Failed to update athlete status", variant: "destructive" });
    },
  });

  const advanceHeightMutation = useMutation({
    mutationFn: async (direction: 1 | -1) => {
      return apiRequest("POST", `/api/field-sessions/${sessionId}/advance-height`, { direction, deviceName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to change height", variant: "destructive" });
    },
  });

  const jumpToHeightMutation = useMutation({
    mutationFn: async (heightIndex: number) => {
      return apiRequest("PATCH", `/api/field-sessions/${sessionId}`, { currentHeightIndex: heightIndex, deviceName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to change height", variant: "destructive" });
    },
  });

  const updateAliveGroupMutation = useMutation({
    mutationFn: async (size: number | null) => {
      return apiRequest("PATCH", `/api/field-sessions/${sessionId}`, { aliveGroupSize: size, deviceName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update alive group", variant: "destructive" });
    },
  });

  const switchFlightMutation = useMutation({
    mutationFn: async (flightNumber: number) => {
      return apiRequest("PATCH", `/api/field-sessions/${sessionId}`, { currentFlightNumber: flightNumber, deviceName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to switch flight", variant: "destructive" });
    },
  });

  const exitFinalsAndSwitchFlightMutation = useMutation({
    mutationFn: async (flightNumber: number) => {
      return apiRequest("PATCH", `/api/field-sessions/${sessionId}`, {
        isInFinals: false,
        currentFlightNumber: flightNumber,
        deviceName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to switch flight", variant: "destructive" });
    },
  });

  const enterFinalsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/field-sessions/${sessionId}`, { isInFinals: true, deviceName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to enter finals", variant: "destructive" });
    },
  });

  const setOpeningHeightMutation = useMutation({
    mutationFn: async ({ athleteId, heightIndex }: { athleteId: number; heightIndex: number }) =>
      apiRequest("POST", `/api/field-athletes/${athleteId}/opening-height`, { heightIndex, deviceName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "marks"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to set opening height", variant: "destructive" });
    },
  });

  // ==================== MARK RECORDING ====================

  const recordMark = useCallback((
    selectedAthlete: EnrichedAthlete,
    markType: "mark" | "foul" | "pass",
    measurement?: string,
    wind?: number,
  ) => {
    if (session?.isInFinals && !selectedAthlete.isFinalist) {
      toast({ title: "Only finalists can record marks in finals", variant: "destructive" });
      return;
    }

    const roundMarks = getAthleteRoundMarks(selectedAthlete.id);
    const nextAttemptNumber = roundMarks.length + 1;

    const markData: InsertFieldEventMark = {
      sessionId,
      athleteId: selectedAthlete.id,
      attemptNumber: nextAttemptNumber,
      markType,
      measurement: markType === "mark" && measurement ? parseFloat(measurement) : undefined,
      wind,
      isFinalsRound: session?.isInFinals || false,
    };

    submitMarkMutation.mutate(markData);
  }, [session, sessionId, getAthleteRoundMarks, submitMarkMutation, toast]);

  const recordVerticalMark = useCallback((
    selectedAthlete: EnrichedAthlete,
    markType: "cleared" | "missed" | "pass",
  ) => {
    if (!heights) return;

    const athleteMarks = (marks || []).filter(m => m.athleteId === selectedAthlete.id);
    const heightMarksForAthlete = athleteMarks.filter(m => m.heightIndex === currentHeightIndex);
    const attemptAtHeight = heightMarksForAthlete.length + 1;
    const totalAttemptNum = athleteMarks.length + 1;

    const markData: InsertFieldEventMark = {
      sessionId,
      athleteId: selectedAthlete.id,
      attemptNumber: totalAttemptNum,
      markType,
      heightIndex: currentHeightIndex,
      attemptAtHeight,
      measurement: currentHeight?.heightMeters,
    };

    submitMarkMutation.mutate(markData);
  }, [heights, marks, currentHeightIndex, currentHeight, sessionId, submitMarkMutation]);

  const handleDeleteLastMark = useCallback((athleteId: number) => {
    const lastMark = getLastMarkForAthlete(athleteId);
    if (lastMark) {
      deleteMarkMutation.mutate(lastMark.id);
    }
  }, [getLastMarkForAthlete, deleteMarkMutation]);

  const handleDeleteLastVerticalMark = useCallback((athleteId: number) => {
    const lastMark = getLastVerticalMarkForAthlete(athleteId);
    if (lastMark) {
      deleteMarkMutation.mutate(lastMark.id);
    }
  }, [getLastVerticalMarkForAthlete, deleteMarkMutation]);

  return {
    // Loading/error state
    isLoading: sessionLoading || athletesLoading,
    sessionError,

    // Session data
    session,
    sessionId,
    isVertical,
    showBibNumbers,
    eventName,
    deviceName,
    handleDeviceNameChange,

    // Athletes
    athletes: athletes || [],
    sortedAthletes,
    activeAthletes,
    dnsAthletes,

    // Marks
    marks: marks || [],
    getAthleteMarks,
    getAthleteRoundMarks,
    getAthleteBestMark,
    getLastMarkForAthlete,
    getLastVerticalMarkForAthlete,

    // Heights (vertical)
    heights: heights || [],
    currentHeightIndex,
    currentHeight,

    // Flights (horizontal)
    totalFlights,
    currentFlight,
    totalAttempts,
    officiateAttempts,

    // Up athlete
    upAthlete: isVertical ? null : getUpAthlete(),
    verticalUpAthlete: isVertical ? getVerticalUpAthlete() : null,

    // Actions
    recordMark,
    recordVerticalMark,
    handleDeleteLastMark,
    handleDeleteLastVerticalMark,

    // Mutations (for UI state)
    submitMarkMutation,
    deleteMarkMutation,
    moveFlightMutation,
    forceFinalistMutation,
    changeStatusMutation,
    advanceHeightMutation,
    jumpToHeightMutation,
    updateAliveGroupMutation,
    switchFlightMutation,
    exitFinalsAndSwitchFlightMutation,
    enterFinalsMutation,
    setOpeningHeightMutation,
  };
}
