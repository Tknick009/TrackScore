import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface SpectatorContextType {
  currentMeetId: string | null;
  meetName: string | null;
}

const SpectatorContext = createContext<SpectatorContextType | null>(null);

export function SpectatorProvider({ children }: { children: ReactNode }) {
  const [currentMeetId, setCurrentMeetId] = useState<string | null>(null);
  const [meetName, setMeetName] = useState<string | null>(null);
  
  const { data: currentMeet } = useQuery<any>({
    queryKey: ["/api/public/current-meet"],
    refetchInterval: 30000
  });
  
  useEffect(() => {
    if (currentMeet) {
      setCurrentMeetId(currentMeet.id);
      setMeetName(currentMeet.name);
    }
  }, [currentMeet]);
  
  return (
    <SpectatorContext.Provider value={{ currentMeetId, meetName }}>
      {children}
    </SpectatorContext.Provider>
  );
}

export function useSpectator() {
  const context = useContext(SpectatorContext);
  if (!context) {
    throw new Error("useSpectator must be used within SpectatorProvider");
  }
  return context;
}
