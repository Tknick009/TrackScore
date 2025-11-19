import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MeetProvider } from "@/contexts/MeetContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import MeetsList from "@/pages/meets-list";
import MeetDetail from "@/pages/meet-detail";
import Control from "@/pages/control";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={MeetsList} />
      <Route path="/meets/:id" component={MeetDetail} />
      <Route path="/control" component={Control} />
      <Route path="/control/seasons" component={SeasonManager} />
      <Route path="/control/records" component={RecordBooks} />
      <Route path="/control/displays/customize" component={DisplayCustomizePage} />
      <Route path="/control/layouts/designer" component={LayoutDesigner} />
      <Route path="/control/layouts/designer/:layoutId" component={LayoutDesigner} />
      <Route path="/display" component={Display} />
      <Route path="/display-examples" component={DisplayExamples} />
      <Route path="/composite-display/:layoutId" component={CompositeDisplayPage} />
      <Route path="/print/events/:id" component={PrintResults} />
      <Route path="/print/meets/:id" component={PrintMeet} />
      <Route path="/judge" component={JudgePage} />
      <Route path="/spectator" component={Spectator} />
      <Route path="/overlay/:type" component={OverlayPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const showSidebar = location.startsWith("/control");

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
