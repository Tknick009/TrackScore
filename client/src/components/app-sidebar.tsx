import { Timer, Trophy, Target, Activity, Monitor, Layout, Calendar, Award } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const eventCategories = [
  {
    title: "Track Events",
    icon: Timer,
    items: [
      { title: "Sprints", path: "/control/sprints" },
      { title: "Middle Distance", path: "/control/middle-distance" },
      { title: "Distance", path: "/control/distance" },
      { title: "Hurdles", path: "/control/hurdles" },
      { title: "Relays", path: "/control/relays" },
    ],
  },
  {
    title: "Field - Jumps",
    icon: Target,
    items: [
      { title: "High Jump", path: "/control/high-jump" },
      { title: "Long Jump", path: "/control/long-jump" },
      { title: "Triple Jump", path: "/control/triple-jump" },
      { title: "Pole Vault", path: "/control/pole-vault" },
    ],
  },
  {
    title: "Field - Throws",
    icon: Trophy,
    items: [
      { title: "Shot Put", path: "/control/shot-put" },
      { title: "Discus", path: "/control/discus" },
      { title: "Javelin", path: "/control/javelin" },
      { title: "Hammer", path: "/control/hammer" },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-sidebar-primary" />
          <div>
            <h2 className="text-base font-semibold text-sidebar-foreground">
              TrackField Control
            </h2>
            <p className="text-xs text-muted-foreground">Scoreboard Manager</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control"}>
                  <Link href="/control" data-testid="link-control-dashboard">
                    <Activity />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/seasons"}>
                  <Link href="/control/seasons" data-testid="link-season-manager">
                    <Calendar />
                    <span>Seasons & Meets</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/control/records"}>
                  <Link href="/control/records" data-testid="link-records">
                    <Award />
                    <span>Record Books</span>
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
                    <Monitor />
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

        {eventCategories.map((category) => (
          <SidebarGroup key={category.title}>
            <SidebarGroupLabel>{category.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {category.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.path}
                    >
                      <Link
                        href={item.path}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <category.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
