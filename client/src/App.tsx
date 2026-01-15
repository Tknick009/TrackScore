import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MeetProvider, useMeet } from "@/contexts/MeetContext";
import { UpdateNotification } from "@/components/update-notification";
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
import DisplayCustomizePage from "@/pages/DisplayCustomizePage";
import DisplayControlPage from "@/pages/display-control";
import DisplayExamples from "@/pages/display-examples";
import LayoutDesigner from "@/pages/layout-designer";
import CompositeDisplayPage from "@/pages/composite-display";
import PrintResults from "@/pages/print-results";
import PrintMeet from "@/pages/print-meet";
import JudgePage from "@/pages/judge";
import Spectator from "@/pages/spectator";
import OverlayPage from "@/pages/overlay";
import MasterDisplayPage from "@/pages/master-display";
import VisualLayoutDesigner from "@/pages/visual-layout-designer";
import SceneEditor from "@/pages/scene-editor";
import SimpleSceneEditor from "@/pages/simple-scene-editor";
import SceneDisplay from "@/pages/scene-display";
import DisplayLauncher from "@/pages/display-launcher";
import DisplayHub from "@/pages/display-hub";
import PresetDisplay from "@/pages/preset-display";
import DisplayDevice from "@/pages/display-device";
import MeetSetup from "@/pages/meet-setup";
import FieldOfficialPage from "@/pages/field-official";
import FieldApp from "@/pages/field-app";
import FieldEventsControl from "@/pages/field-events-control";
import ExternalScoreboards from "@/pages/external-scoreboards";
import CloudSync from "@/pages/cloud-sync";
import LynxTerminal from "@/pages/lynx-terminal";
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
  
  const match = location.match(/^\/control\/([^/]+)(?:\/(.*))?$/);
  
  if (!match) {
    return <Redirect to="/" />;
  }
  
  const meetId = match[1];
  const subPath = match[2] || "";
  
  useEffect(() => {
    if (!subPath) {
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
    if (subPath === "schedule") return <Schedule />;
    if (subPath.startsWith("events/")) return <EventControl />;
    if (subPath === "scoring") return <Scoring />;
    if (subPath === "athletes") return <Athletes />;
    if (subPath === "teams") return <Teams />;
    if (subPath === "checkin") return <CheckIn />;
    if (subPath === "officials") return <Officials />;
    if (subPath === "import") return <Import />;
    if (subPath === "displays/control") return <DisplayControlPage />;
    if (subPath === "displays/customize") return <DisplayCustomizePage />;
    if (subPath === "layouts/designer" || subPath.startsWith("layouts/designer/")) return <LayoutDesigner />;
    if (subPath === "scene-editor") return <SimpleSceneEditor />;
    if (subPath === "scene-editor-advanced") return <SceneEditor />;
    if (subPath === "displays/launcher") return <DisplayLauncher />;
    if (subPath === "displays") return <DisplayHub />;
    if (subPath === "setup") return <MeetSetup />;
    if (subPath === "field-events") return <FieldEventsControl />;
    if (subPath === "external-scoreboards") return <ExternalScoreboards />;
    return <NotFound />;
  };
  
  return (
    <MeetSyncWrapper meetId={meetId}>
      {getComponent()}
    </MeetSyncWrapper>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={MeetsList} />
      <Route path="/lynx-terminal" component={LynxTerminal} />
      <Route path="/cloud-sync" component={CloudSync} />
      <Route path="/meets/:id" component={MeetDetail} />
      <Route path="/seasons" component={SeasonManager} />
      <Route path="/records" component={RecordBooks} />
      <Route path="/display-examples" component={DisplayExamples} />
      <Route path="/composite-display/:layoutId" component={CompositeDisplayPage} />
      <Route path="/print/events/:id" component={PrintResults} />
      <Route path="/print/meets/:id" component={PrintMeet} />
      <Route path="/judge" component={JudgePage} />
      <Route path="/spectator" component={Spectator} />
      <Route path="/overlay/:type" component={OverlayPage} />
      <Route path="/master-display" component={MasterDisplayPage} />
      <Route path="/visual-designer" component={VisualLayoutDesigner} />
      <Route path="/scene-display/:sceneId" component={SceneDisplay} />
      <Route path="/scene-display" component={SceneDisplay} />
      <Route path="/preset-display/:templateId" component={PresetDisplay} />
      <Route path="/display" component={DisplayDevice} />
      <Route path="/field-app" component={FieldApp} />
      <Route path="/field/:accessCode" component={FieldOfficialPage} />
      <Route path="/field" component={FieldOfficialPage} />
      <Route path="/control/:meetId/scene-editor">{() => <MeetControlRouter />}</Route>
      <Route path="/control/:meetId/events/:eventId">{() => <MeetControlRouter />}</Route>
      <Route path="/control/:meetId/layouts/designer/:layoutId">{() => <MeetControlRouter />}</Route>
      <Route path="/control/:meetId/layouts/designer">{() => <MeetControlRouter />}</Route>
      <Route path="/control/:meetId/displays/control">{() => <MeetControlRouter />}</Route>
      <Route path="/control/:meetId/displays/customize">{() => <MeetControlRouter />}</Route>
      <Route path="/control/:meetId/:subPath">{() => <MeetControlRouter />}</Route>
      <Route path="/control/:meetId">{() => <MeetControlRouter />}</Route>
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
        <main className="flex-1 overflow-auto p-4">
          <UpdateNotification />
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
