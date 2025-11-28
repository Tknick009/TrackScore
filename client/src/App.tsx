import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MeetProvider, useMeet } from "@/contexts/MeetContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { useEffect } from "react";
import MeetsList from "@/pages/meets-list";
import MeetDetail from "@/pages/meet-detail";
import Schedule from "@/pages/schedule";
import EventControl from "@/pages/event-control";
import Scoring from "@/pages/scoring";
import Athletes from "@/pages/athletes";
import Teams from "@/pages/teams";
import CheckIn from "@/pages/checkin";
import Officials from "@/pages/officials";
import Import from "@/pages/import";
import SeasonManager from "@/pages/season-manager";
import RecordBooks from "@/pages/record-books";
import Display from "@/pages/display";
import DisplayCustomizePage from "@/pages/DisplayCustomizePage";
import DisplayExamples from "@/pages/display-examples";
import LayoutDesigner from "@/pages/layout-designer";
import CompositeDisplayPage from "@/pages/composite-display";
import PrintResults from "@/pages/print-results";
import PrintMeet from "@/pages/print-meet";
import JudgePage from "@/pages/judge";
import Spectator from "@/pages/spectator";
import OverlayPage from "@/pages/overlay";
import NotFound from "@/pages/not-found";

function MeetSyncWrapper({ meetId, children }: { meetId: string; children: React.ReactNode }) {
  const { setCurrentMeetId, currentMeetId, currentMeet, isLoading } = useMeet();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (meetId !== currentMeetId) {
      setCurrentMeetId(meetId);
    }
  }, [meetId, currentMeetId, setCurrentMeetId]);

  useEffect(() => {
    if (!isLoading && currentMeetId === meetId && !currentMeet) {
      console.log("MeetSyncWrapper - redirecting to / because meet not found");
      setLocation("/");
    }
  }, [isLoading, currentMeetId, currentMeet, meetId, setLocation]);

  if (currentMeetId !== meetId || isLoading || !currentMeet) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return <>{children}</>;
}

function MeetControlRouter() {
  const [location, setLocation] = useLocation();
  
  console.log("MeetControlRouter - location:", location);
  
  const match = location.match(/^\/control\/([^/]+)(?:\/(.*))?$/);
  console.log("MeetControlRouter - match:", match);
  
  if (!match) {
    console.log("MeetControlRouter - no match, redirecting to /");
    return <Redirect to="/" />;
  }
  
  const meetId = match[1];
  const subPath = match[2] || "";
  
  console.log("MeetControlRouter - meetId:", meetId, "subPath:", subPath);
  
  useEffect(() => {
    if (!subPath) {
      console.log("MeetControlRouter - no subPath, redirecting to schedule");
      setLocation(`/control/${meetId}/schedule`, { replace: true });
    }
  }, [meetId, subPath, setLocation]);
  
  if (!subPath) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  const getComponent = () => {
    console.log("MeetControlRouter - getComponent for subPath:", subPath);
    if (subPath === "schedule") return <Schedule />;
    if (subPath.startsWith("events/")) return <EventControl />;
    if (subPath === "scoring") return <Scoring />;
    if (subPath === "athletes") return <Athletes />;
    if (subPath === "teams") return <Teams />;
    if (subPath === "checkin") return <CheckIn />;
    if (subPath === "officials") return <Officials />;
    if (subPath === "import") return <Import />;
    if (subPath === "displays/customize") return <DisplayCustomizePage />;
    if (subPath === "layouts/designer" || subPath.startsWith("layouts/designer/")) return <LayoutDesigner />;
    console.log("MeetControlRouter - no match for subPath, returning NotFound");
    return <NotFound />;
  };
  
  return (
    <MeetSyncWrapper meetId={meetId}>
      {getComponent()}
    </MeetSyncWrapper>
  );
}

function Router() {
  const [location] = useLocation();
  console.log("Router - location:", location);
  
  return (
    <Switch>
      <Route path="/" component={MeetsList} />
      <Route path="/meets/:id" component={MeetDetail} />
      <Route path="/seasons" component={SeasonManager} />
      <Route path="/records" component={RecordBooks} />
      <Route path="/display" component={Display} />
      <Route path="/display-examples" component={DisplayExamples} />
      <Route path="/composite-display/:layoutId" component={CompositeDisplayPage} />
      <Route path="/print/events/:id" component={PrintResults} />
      <Route path="/print/meets/:id" component={PrintMeet} />
      <Route path="/judge" component={JudgePage} />
      <Route path="/spectator" component={Spectator} />
      <Route path="/overlay/:type" component={OverlayPage} />
      <Route path="/control/:meetId/events/:eventId">{() => <MeetControlRouter />}</Route>
      <Route path="/control/:meetId/layouts/designer/:layoutId">{() => <MeetControlRouter />}</Route>
      <Route path="/control/:meetId/:subPath">{() => <MeetControlRouter />}</Route>
      <Route path="/control/:meetId">{() => <MeetControlRouter />}</Route>
      <Route>{() => { console.log("Router - fallback NotFound matched"); return <NotFound />; }}</Route>
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  console.log("AppContent - location:", location);
  const showSidebar = location.match(/^\/control\/[^/]+/);
  console.log("AppContent - showSidebar:", showSidebar);

  if (!showSidebar) {
    console.log("AppContent - rendering Router without sidebar");
    return <Router />;
  }

  console.log("AppContent - rendering Router with sidebar");
  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between p-2 border-b">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
        </header>
        <main className="flex-1 overflow-auto">
          <Router />
        </main>
      </div>
    </div>
  );
}

function App() {
  const sidebarStyle = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WebSocketProvider>
          <MeetProvider>
            <SidebarProvider style={sidebarStyle as React.CSSProperties}>
              <AppContent />
            </SidebarProvider>
            <Toaster />
          </MeetProvider>
        </WebSocketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
