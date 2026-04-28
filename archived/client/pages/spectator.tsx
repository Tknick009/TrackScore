import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Route, Switch, useRoute, useLocation } from "wouter";
import { SpectatorProvider, useSpectator } from "@/contexts/SpectatorContext";
import { SpectatorSchedule } from "@/components/spectator-schedule";
import { SpectatorResults } from "@/components/spectator-results";
import { SpectatorStandings } from "@/components/spectator-standings";
import { SpectatorAthletes } from "@/components/spectator-athletes";
import { Calendar, Trophy, Users, Medal } from "lucide-react";

interface SpectatorContentProps {
  initialTab?: string;
  initialEventId?: string;
  initialAthleteId?: string;
}

function SpectatorContent({ initialTab = "schedule", initialEventId, initialAthleteId }: SpectatorContentProps) {
  const { meetName } = useSpectator();
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Update active tab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-bold" data-testid="text-meet-name">
            {meetName || "Track & Field Results"}
          </h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-4 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="schedule">
            <SpectatorSchedule />
          </TabsContent>
          
          <TabsContent value="results">
            <SpectatorResults />
          </TabsContent>
          
          <TabsContent value="standings">
            <SpectatorStandings />
          </TabsContent>
          
          <TabsContent value="athletes">
            <SpectatorAthletes />
          </TabsContent>
        </Tabs>
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full h-16 rounded-none">
            <TabsTrigger 
              value="schedule" 
              className="flex flex-col gap-1"
              data-testid="nav-schedule"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Schedule</span>
            </TabsTrigger>
            <TabsTrigger 
              value="results" 
              className="flex flex-col gap-1"
              data-testid="nav-results"
            >
              <Trophy className="h-5 w-5" />
              <span className="text-xs">Results</span>
            </TabsTrigger>
            <TabsTrigger 
              value="standings" 
              className="flex flex-col gap-1"
              data-testid="nav-standings"
            >
              <Medal className="h-5 w-5" />
              <span className="text-xs">Standings</span>
            </TabsTrigger>
            <TabsTrigger 
              value="athletes" 
              className="flex flex-col gap-1"
              data-testid="nav-athletes"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">Athletes</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </nav>
    </div>
  );
}

// Route handlers for deep links
function EventDetailRoute() {
  const [, params] = useRoute("/spectator/events/:id");
  return (
    <SpectatorProvider>
      <SpectatorContent initialTab="results" initialEventId={params?.id} />
    </SpectatorProvider>
  );
}

function AthleteDetailRoute() {
  const [, params] = useRoute("/spectator/athletes/:id");
  return (
    <SpectatorProvider>
      <SpectatorContent initialTab="athletes" initialAthleteId={params?.id} />
    </SpectatorProvider>
  );
}

function StandingsRoute() {
  return (
    <SpectatorProvider>
      <SpectatorContent initialTab="standings" />
    </SpectatorProvider>
  );
}

function DefaultSpectatorRoute() {
  return (
    <SpectatorProvider>
      <SpectatorContent />
    </SpectatorProvider>
  );
}

export default function Spectator() {
  return (
    <Switch>
      <Route path="/spectator/events/:id" component={EventDetailRoute} />
      <Route path="/spectator/athletes/:id" component={AthleteDetailRoute} />
      <Route path="/spectator/standings" component={StandingsRoute} />
      <Route path="/spectator" component={DefaultSpectatorRoute} />
    </Switch>
  );
}
