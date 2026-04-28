import { useMeet } from "@/contexts/MeetContext";
import { MeetSelector } from "@/components/meet-selector";
import { AthleteCheckInPanel } from "@/components/athlete-check-in-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, UserCheck } from "lucide-react";

export default function CheckIn() {
  const { currentMeetId } = useMeet();

  if (!currentMeetId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              Select a Meet
            </CardTitle>
            <CardDescription>
              Choose a meet to manage athlete check-ins
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <MeetSelector />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <MeetSelector />
          <h1 className="text-xl font-semibold">Athlete Check-In</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <AthleteCheckInPanel />
      </div>
    </div>
  );
}
