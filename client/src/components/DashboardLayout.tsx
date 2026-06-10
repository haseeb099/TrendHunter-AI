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
import { usePlan } from "@/_core/hooks/usePlan";
import { ALWAYS_ACCESSIBLE_TABS } from "@shared/plans";
import { toast } from "sonner";
import { CreditCard, Lock, LogOut, Settings, Shield } from "lucide-react";
import { CreditBalance } from "@/components/CreditBalance";
import { Link } from "wouter";
import { CSSProperties } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { WorkspaceQuickStats } from "@/components/workspace/WorkspaceQuickStats";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user, error, refresh } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user && error) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="surface-elevated w-full max-w-sm p-8 text-center space-y-6">
          <AppLogo size="lg" className="justify-center" />
          <div className="space-y-2">
            <h1 className="font-display text-xl font-semibold">Could not load session</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Check your connection and try again.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => refresh()} size="lg" className="w-full">
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = getLoginUrl("/dashboard");
              }}
              className="w-full"
            >
              Sign in again
            </Button>
          </div>
        </div>
      </div>
    );
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
  const { state, setOpenMobile, isMobile: sidebarIsMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const activeTab = getActiveTab(location);
  const activeMenuItem = dashboardNavGroups
    .flatMap((g) => g.items)
    .find((item) => item.id === activeTab);
  const isMobile = useIsMobile();
  const { canAccessTab, displayName, isTrial, daysLeftInTrial, role, isRestricted } = usePlan();
  const platformConfig = trpc.system.getConfig.useQuery();
  const announcement = platformConfig.data?.announcement;
  const maintenanceMode = platformConfig.data?.maintenanceMode === true;
  const maintenanceMessage =
    platformConfig.data?.maintenanceMessage ??
    "We're performing scheduled maintenance. Please check back shortly.";
  const allowDuringMaintenance =
    activeTab !== null && ALWAYS_ACCESSIBLE_TABS.includes(activeTab);
  const showMaintenanceBlock = maintenanceMode && role !== "admin" && !allowDuringMaintenance;
  const quickStatsEnabled = !showMaintenanceBlock && !isRestricted;

  const handleLogout = async () => {
    await logout();
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
                    const locked = !canAccessTab(item.id);
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => {
                            if (locked) {
                              toast.info(`${item.label} requires an upgrade`, {
                                description: "View plans to unlock this workspace.",
                              });
                              setLocation(getDashboardPath("billing"));
                              return;
                            }
                            setLocation(path);
                            if (sidebarIsMobile) setOpenMobile(false);
                          }}
                          tooltip={`${item.label} — ${item.description}${locked ? " (upgrade required)" : ""}`}
                          className={`h-9 rounded-lg px-2.5 text-[13px] text-sidebar-foreground ${isActive ? "nav-active" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"} ${locked ? "opacity-70" : ""}`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {locked ? <Lock className="h-3 w-3 shrink-0 opacity-60" /> : null}
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
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">
                <p className="font-medium text-foreground truncate">{user?.name}</p>
                <p className="truncate">{user?.email}</p>
                {role === "admin" ? (
                  <span className="inline-flex items-center gap-1 mt-1 text-primary font-medium">
                    <Shield className="h-3 w-3" />
                    Super Admin
                  </span>
                ) : null}
              </div>
              <DropdownMenuItem asChild>
                <Link href={getDashboardPath("billing")} className="cursor-pointer flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing & plans
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={getDashboardPath("account")} className="cursor-pointer flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Account settings
                </Link>
              </DropdownMenuItem>
              {user?.role === "admin" ? (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer flex items-center">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin console
                  </Link>
                </DropdownMenuItem>
              ) : null}
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
              {activeTab === "billing" || activeTab === "account" ? "Account & Billing" : "Workspace"}
            </p>
            <p className="font-display text-sm font-semibold text-foreground truncate -mt-0.5">
              {activeMenuItem?.label ?? "Dashboard"}
            </p>
            {activeMenuItem?.description ? (
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {activeMenuItem.description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setLocation(getDashboardPath("billing"))}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-muted/40 transition-colors"
          >
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium text-foreground">{displayName}</span>
            {isTrial && daysLeftInTrial !== null ? (
              <span className="text-warning tabular-nums">· {daysLeftInTrial}d</span>
            ) : null}
          </button>
          <CreditBalance />
          <WorkspaceQuickStats enabled={quickStatsEnabled} />
          <ThemeToggle />
        </header>

        <main className="workspace-canvas flex-1 overflow-y-auto">
          {announcement?.message ? (
            <div
              className={`border-b px-4 py-2.5 text-center text-sm ${
                announcement.type === "warning"
                  ? "border-warning/30 bg-warning/10 text-warning"
                  : announcement.type === "success"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-primary/25 bg-primary/5 text-foreground"
              }`}
            >
              {announcement.message}
            </div>
          ) : null}
          {user?.accountStatus === "paused" ? (
            <div className="border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-center text-sm text-warning">
              Your account is paused. You can view plans & billing — contact support if you need help.
            </div>
          ) : null}
          {user?.accountStatus === "flagged" ? (
            <div className="border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-center text-sm text-warning">
              Your account is under review — workspace access is limited to billing and account settings.
              {user.flagReason ? (
                <span className="block text-xs mt-1 text-warning/90">Reason: {user.flagReason}</span>
              ) : null}
            </div>
          ) : null}
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 fade-up">
            {showMaintenanceBlock ? (
              <div className="card-elevated max-w-lg mx-auto p-8 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <h2 className="font-display text-lg font-semibold">Under maintenance</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{maintenanceMessage}</p>
                <Button variant="outline" onClick={() => setLocation(getDashboardPath("billing"))}>
                  View billing & account
                </Button>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
