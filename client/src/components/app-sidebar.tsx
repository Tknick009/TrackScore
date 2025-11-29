import { 
  Calendar, 
  Users, 
  Trophy, 
  Monitor,
  Activity,
  Upload,
  Palette,
  Layout,
  Building2,
  Home,
  Cast
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
  const { currentMeetId, currentMeet } = useMeet();
  
  const basePath = `/control/${currentMeetId}`;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-sidebar-foreground truncate">
              {currentMeet?.name || "Meet Control"}
            </h2>
            {currentMeet?.location && (
              <p className="text-xs text-muted-foreground truncate">
                {currentMeet.location}
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
                <SidebarMenuButton asChild isActive={location === `${basePath}/schedule` || location.includes('/events/')}>
                  <Link href={`${basePath}/schedule`} data-testid="link-schedule">
                    <Calendar />
                    <span>Schedule</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === `${basePath}/scoring`}>
                  <Link href={`${basePath}/scoring`} data-testid="link-scoring">
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
                <SidebarMenuButton asChild isActive={location === `${basePath}/athletes`}>
                  <Link href={`${basePath}/athletes`} data-testid="link-athletes">
                    <Users />
                    <span>Athletes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === `${basePath}/teams`}>
                  <Link href={`${basePath}/teams`} data-testid="link-teams">
                    <Building2 />
                    <span>Teams</span>
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
                <SidebarMenuButton asChild isActive={location === `${basePath}/displays/control`}>
                  <Link href={`${basePath}/displays/control`} data-testid="link-displays-control">
                    <Cast />
                    <span>Device Control</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === `${basePath}/displays/customize`}>
                  <Link href={`${basePath}/displays/customize`} data-testid="link-displays-customize">
                    <Palette />
                    <span>Customize</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith(`${basePath}/layouts/designer`)}>
                  <Link href={`${basePath}/layouts/designer`} data-testid="link-layouts-designer">
                    <Layout />
                    <span>Layout Designer</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === `${basePath}/scene-editor`}>
                  <Link href={`${basePath}/scene-editor`} data-testid="link-scene-editor">
                    <Palette />
                    <span>Scene Editor</span>
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
                <SidebarMenuButton asChild isActive={location === `${basePath}/import`}>
                  <Link href={`${basePath}/import`} data-testid="link-import">
                    <Upload />
                    <span>Import HyTek</span>
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
              <Link href="/" data-testid="link-all-meets">
                <Home />
                <span>All Meets</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
