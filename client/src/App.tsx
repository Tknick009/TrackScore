import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import MeetsList from "@/pages/meets-list";
import MeetDetail from "@/pages/meet-detail";
import Control from "@/pages/control";
import Display from "@/pages/display";
import DisplayCustomizePage from "@/pages/DisplayCustomizePage";
import LayoutDesigner from "@/pages/layout-designer";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MeetsList} />
      <Route path="/meets/:id" component={MeetDetail} />
      <Route path="/control" component={Control} />
      <Route path="/control/displays/customize" component={DisplayCustomizePage} />
      <Route path="/control/layouts/designer" component={LayoutDesigner} />
      <Route path="/control/layouts/designer/:layoutId" component={LayoutDesigner} />
      <Route path="/display" component={Display} />
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
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <AppContent />
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
