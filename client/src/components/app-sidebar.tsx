import { 
  Play, 
  Calendar, 
  Users, 
  ClipboardCheck, 
  Trophy, 
  Database, 
  Monitor, 
  Settings,
  Activity,
  Upload,
  FileDown,
  Award,
  UserCheck,
  Wind,
  Timer,
  Shield,
  Palette,
  Layout,
  BookOpen,
  Building2
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useMeet } from "@/contexts/MeetContext";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const [location] = useLocation();
  const { currentMeet } = useMeet();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-sidebar-foreground truncate">
              TrackField Control
            </h2>
            {currentMeet && (
              <p className="text-xs text-muted-foreground truncate">
                {currentMeet.name}
              </p>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Meet Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control"}>
                  <Link href="/control" data-testid="link-run-event">
                    <Play className="text-green-600" />
                    <span>Run Event</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/schedule"}>
                  <Link href="/control/schedule" data-testid="link-schedule">
                    <Calendar />
                    <span>Schedule</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/scoring"}>
                  <Link href="/control/scoring" data-testid="link-scoring">
                    <Trophy />
                    <span>Team Scoring</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Rosters</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/athletes"}>
                  <Link href="/control/athletes" data-testid="link-athletes">
                    <Users />
                    <span>Athletes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/teams"}>
                  <Link href="/control/teams" data-testid="link-teams">
                    <Building2 />
                    <span>Teams</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Officials</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/checkin"}>
                  <Link href="/control/checkin" data-testid="link-checkin">
                    <UserCheck />
                    <span>Check-In</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/officials"}>
                  <Link href="/control/officials" data-testid="link-officials-tools">
                    <ClipboardCheck />
                    <span>Field Officials</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Displays</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/displays/customize"}>
                  <Link href="/control/displays/customize" data-testid="link-displays-customize">
                    <Palette />
                    <span>Customize</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/control/layouts/designer")}>
                  <Link href="/control/layouts/designer" data-testid="link-layouts-designer">
                    <Layout />
                    <span>Layout Designer</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/import"}>
                  <Link href="/control/import" data-testid="link-import">
                    <Upload />
                    <span>Import HyTek</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/seasons"}>
                  <Link href="/control/seasons" data-testid="link-season-manager">
                    <Database />
                    <span>Seasons & Meets</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/records"}>
                  <Link href="/control/records" data-testid="link-records">
                    <BookOpen />
                    <span>Record Books</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/display" target="_blank" data-testid="link-open-display">
                <Monitor />
                <span>Open Display Board</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
