import { useEffect } from "react";
import { useParams } from "wouter";
import { useMeet } from "@/contexts/MeetContext";
import ProtestAwardsPage from "./protest-awards";

function StandaloneInner({ meetId }: { meetId: string }) {
  const { setCurrentMeetId, currentMeetId, currentMeet, isLoading } = useMeet();

  useEffect(() => {
    if (meetId !== currentMeetId) {
      setCurrentMeetId(meetId);
    }
  }, [meetId, currentMeetId, setCurrentMeetId]);

  if (currentMeetId !== meetId || isLoading || !currentMeet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <ProtestAwardsPage standalone />;
}

export default function ProtestAwardsStandalone() {
  const params = useParams<{ meetId: string }>();
  const meetId = params.meetId || "";

  if (!meetId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-muted-foreground">No meet selected</p>
      </div>
    );
  }

  return <StandaloneInner meetId={meetId} />;
}
