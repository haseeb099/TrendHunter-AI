import { useAuth } from "@/_core/hooks/useAuth";
import { AppLogo } from "@/components/AppLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  dashboardNavGroups,
  getActiveTab,
  getDashboardPath,
} from "@/config/dashboardNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LogOut } from "lucide-react";
import { CSSProperties } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="surface-elevated w-full max-w-sm p-8 text-center space-y-6">
          <AppLogo size="lg" className="justify-center" />
          <div className="space-y-2">
            <h1 className="font-display text-xl font-semibold">Sign in required</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Access your research workspace, watchlist, and product pipeline.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl("/dashboard");
            }}
            size="lg"
            className="w-full"
          >
            Continue to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      className="h-svh overflow-hidden"
      style={
        {
          "--sidebar-width": "16.25rem",
        } as CSSProperties
      }
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const activeTab = getActiveTab(location);
  const activeMenuItem = dashboardNavGroups
    .flatMap((g) => g.items)
    .find((item) => item.id === activeTab);
  const isMobile = useIsMobile();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
        <SidebarHeader className="h-[3.75rem] border-b border-sidebar-border px-3">
          <div className="flex h-full items-center justify-between gap-2">
            <AppLogo size="sm" showText={!isCollapsed} />
            {!isMobile && !isCollapsed ? (
              <SidebarTrigger className="h-8 w-8 shrink-0 text-muted-foreground" />
            ) : null}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0.5 py-4">
          {dashboardNavGroups.map((group) => (
            <SidebarGroup key={group.label} className="px-2">
              {!isCollapsed ? (
                <SidebarGroupLabel className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </SidebarGroupLabel>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const path = getDashboardPath(item.id);
                    const isActive = activeTab === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(path)}
                          tooltip={item.label}
                          className={`h-9 rounded-lg px-2.5 text-[13px] text-sidebar-foreground ${isActive ? "nav-active" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/35">
                <Avatar className="h-8 w-8 border border-border shrink-0">
                  <AvatarFallback className="text-xs font-medium bg-muted text-foreground">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate leading-none">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {user?.email || ""}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <header className="sticky top-0 z-30 flex h-[3.75rem] shrink-0 items-center gap-3 border-b border-border bg-background/92 px-4 backdrop-blur-xl sm:px-6">
          {isMobile ? <SidebarTrigger className="h-8 w-8" /> : null}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Workspace
            </p>
            <p className="font-display text-sm font-semibold text-foreground truncate -mt-0.5">
              {activeMenuItem?.label ?? "Dashboard"}
            </p>
          </div>
          <ThemeToggle />
        </header>

        <main className="workspace-canvas flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 fade-up">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
