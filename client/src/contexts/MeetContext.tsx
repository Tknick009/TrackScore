import { createContext, useState, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Meet } from "@shared/schema";

type MeetContextType = {
  currentMeetId: string | null;
  setCurrentMeetId: (id: string | null) => void;
  currentMeet: Meet | null;
  isLoading: boolean;
};

const MeetContext = createContext<MeetContextType | undefined>(undefined);

export function MeetProvider({ children }: { children: React.ReactNode }) {
  const [currentMeetId, setCurrentMeetId] = useState<string | null>(() => {
    // Try to restore from localStorage
    return localStorage.getItem("currentMeetId");
  });

  // Fetch current meet details
  const { data: currentMeet = null, isLoading } = useQuery<Meet>({
    queryKey: ["/api/meets", currentMeetId],
    enabled: currentMeetId !== null,
  });

  // Save currentMeetId to localStorage whenever it changes
  useEffect(() => {
    if (currentMeetId) {
      localStorage.setItem("currentMeetId", currentMeetId);
    } else {
      localStorage.removeItem("currentMeetId");
    }
  }, [currentMeetId]);

  return (
    <MeetContext.Provider
      value={{
        currentMeetId,
        setCurrentMeetId,
        currentMeet,
        isLoading,
      }}
    >
      {children}
    </MeetContext.Provider>
  );
}

export function useMeet() {
  const context = useContext(MeetContext);
  if (context === undefined) {
    throw new Error("useMeet must be used within a MeetProvider");
  }
  return context;
}
