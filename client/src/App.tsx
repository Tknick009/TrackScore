import { Switch, Route, useLocation, useRoute, Redirect } from "wouter";
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
    if (!isLoading && currentMeetId && !currentMeet) {
      setLocation("/");
    }
  }, [isLoading, currentMeetId, currentMeet, setLocation]);

  if (isLoading || !currentMeet) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return <>{children}</>;
}

function MeetControlRouter() {
  const [, params] = useRoute("/control/:meetId/:rest*");
  const [isControlRoot, rootParams] = useRoute("/control/:meetId");
  const meetId = params?.meetId || rootParams?.meetId;
  
  if (!meetId) {
    return <Redirect to="/" />;
  }

  if (isControlRoot) {
    return <Redirect to={`/control/${meetId}/schedule`} />;
  }
  
  return (
    <MeetSyncWrapper meetId={meetId}>
      <Switch>
        <Route path="/control/:meetId/schedule" component={Schedule} />
        <Route path="/control/:meetId/events/:eventId" component={EventControl} />
        <Route path="/control/:meetId/scoring" component={Scoring} />
        <Route path="/control/:meetId/athletes" component={Athletes} />
        <Route path="/control/:meetId/teams" component={Teams} />
        <Route path="/control/:meetId/checkin" component={CheckIn} />
        <Route path="/control/:meetId/officials" component={Officials} />
        <Route path="/control/:meetId/import" component={Import} />
        <Route path="/control/:meetId/displays/customize" component={DisplayCustomizePage} />
        <Route path="/control/:meetId/layouts/designer" component={LayoutDesigner} />
        <Route path="/control/:meetId/layouts/designer/:layoutId" component={LayoutDesigner} />
        <Route component={NotFound} />
      </Switch>
    </MeetSyncWrapper>
  );
}

function Router() {
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
      <Route path="/control/:rest*" component={MeetControlRouter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const showSidebar = location.match(/^\/control\/[^/]+/);

  if (!showSidebar) {
    return <Router />;
  }

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
