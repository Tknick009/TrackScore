import { useMeet } from "@/contexts/MeetContext";
import { MeetSelector } from "@/components/meet-selector";
import { SplitRecorderPanel } from "@/components/split-recorder-panel";
import { WindRecorderPanel } from "@/components/wind-recorder-panel";
import { JudgeTokenManager } from "@/components/judge-token-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Timer, Wind, Shield } from "lucide-react";

export default function Officials() {
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
              Choose a meet to access officials tools
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
          <h1 className="text-xl font-semibold">Field Officials Tools</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="splits" className="max-w-4xl mx-auto">
          <TabsList className="mb-4">
            <TabsTrigger value="splits" data-testid="tab-splits">
              <Timer className="w-4 h-4 mr-2" />
              Split Times
            </TabsTrigger>
            <TabsTrigger value="wind" data-testid="tab-wind">
              <Wind className="w-4 h-4 mr-2" />
              Wind Readings
            </TabsTrigger>
            <TabsTrigger value="judges" data-testid="tab-judges">
              <Shield className="w-4 h-4 mr-2" />
              Judge Access
            </TabsTrigger>
          </TabsList>

          <TabsContent value="splits">
            <SplitRecorderPanel />
          </TabsContent>

          <TabsContent value="wind">
            <WindRecorderPanel />
          </TabsContent>

          <TabsContent value="judges">
            <JudgeTokenManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
