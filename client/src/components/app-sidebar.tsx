import { 
  Calendar, 
  Users, 
  Monitor,
  Upload,
  Building2,
  Home,
  Settings,
  LayoutTemplate,
  Target,
  Send,
  Zap,
  ChevronDown,
  ChevronRight,
  ExternalLink,
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
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const [location] = useLocation();
  const { currentMeetId, currentMeet } = useMeet();
  const [displaysOpen, setDisplaysOpen] = useState(
    location.includes('/displays/') || location.includes('/scene-editor') || location.includes('/external-scoreboards')
  );
  
  const basePath = `/control/${currentMeetId}`;

  // Quick access items — the most-used pages during a live meet
  const quickAccessItems = [
    { href: `${basePath}/schedule`, icon: Calendar, label: 'Schedule', testId: 'link-schedule', active: location === `${basePath}/schedule` || location.includes('/events/') },
    { href: '/field-command', icon: Target, label: 'Field Events', testId: 'link-field-events', active: location === '/field-command' || location === `${basePath}/field-events` },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href={basePath ? `${basePath}/schedule` : '/'}>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                {currentMeet?.name || "TrackScore"}
              </h2>
              {currentMeet?.location && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {currentMeet.location}
                </p>
              )}
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {/* Quick Access — always visible, most-used during meet */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50 mb-0.5">Quick Access</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickAccessItems.map((item) => (
                <SidebarMenuItem key={item.testId}>
                  <SidebarMenuButton asChild isActive={item.active}>
                    <Link href={item.href} data-testid={item.testId}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-3 w-auto opacity-40" />

        {/* Rosters */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50 mb-0.5">Rosters</SidebarGroupLabel>
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

        <Separator className="mx-3 w-auto opacity-40" />

        {/* Displays — collapsible since it has sub-items */}
        <SidebarGroup>
          <Collapsible open={displaysOpen} onOpenChange={setDisplaysOpen}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50 flex items-center justify-between w-full cursor-pointer hover:text-muted-foreground transition-colors mb-0.5">
                <span>Displays</span>
                {displaysOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === `${basePath}/displays/control` || location.startsWith(`${basePath}/displays/`)}>
                      <Link href={`${basePath}/displays/control`} data-testid="link-display-control">
                        <Monitor />
                        <span>Display Control</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === `${basePath}/scene-editor`}>
                      <Link href={`${basePath}/scene-editor`} data-testid="link-scene-editor">
                        <LayoutTemplate />
                        <span>Layout Designer</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === `${basePath}/external-scoreboards`}>
                      <Link href={`${basePath}/external-scoreboards`} data-testid="link-external-scoreboards">
                        <Send />
                        <span>External Scoreboards</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <Separator className="mx-3 w-auto opacity-40" />

        {/* Data & Config — grouped together to reduce clutter */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50 mb-0.5">Manage</SidebarGroupLabel>
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === `${basePath}/setup`}>
                  <Link href={`${basePath}/setup`} data-testid="link-setup">
                    <Settings />
                    <span>Meet Setup</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
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
                <span className="flex items-center gap-1.5">
                  Open Display Board
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
