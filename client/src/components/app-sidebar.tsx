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
  ClipboardCheck,
  Scale,
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

export function AppSidebar() {
  const [location] = useLocation();
  const { currentMeetId, currentMeet } = useMeet();
  
  const basePath = `/control/${currentMeetId}`;

  // Quick access items — the most-used pages during a live meet
  const quickAccessItems = [
    { href: `${basePath}/schedule`, icon: Calendar, label: 'Schedule', testId: 'link-schedule', active: location === `${basePath}/schedule` || location.includes('/events/') },
    { href: `${basePath}/field-events`, icon: Target, label: 'Field Events', testId: 'link-field-events', active: location === `${basePath}/field-events` },
    { href: `${basePath}/protest-awards`, icon: Scale, label: 'Protest & Awards', testId: 'link-protest-awards', active: location === `${basePath}/protest-awards` },
  ];

  // Officiate opens in a new tab (full-screen for tablet use)
  const officiateHref = '/Officiate';

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href={basePath ? `${basePath}/schedule` : '/'}>
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-sidebar-foreground truncate">
                {currentMeet?.name || "TrackScore"}
              </h2>
              {currentMeet?.location && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {currentMeet.location}
                </p>
              )}
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Quick Access — always visible, most-used during meet */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Quick Access</SidebarGroupLabel>
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href={officiateHref} target="_blank" rel="noopener noreferrer" data-testid="link-officiate">
                    <ClipboardCheck />
                    <span>Officiate</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Rosters */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Rosters</SidebarGroupLabel>
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

        {/* Displays */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Displays</SidebarGroupLabel>
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
        </SidebarGroup>

        {/* Data & Config — grouped together to reduce clutter */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Manage</SidebarGroupLabel>
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
