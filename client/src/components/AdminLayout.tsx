import { useAuth } from "@/_core/hooks/useAuth";

import { AppLogo } from "@/components/AppLogo";

import { ThemeToggle } from "@/components/ThemeToggle";

import { Button } from "@/components/ui/button";

import { Spinner } from "@/components/ui/spinner";

import { getLoginUrl } from "@/const";

import { AdminOverviewProvider, useAdminOverview } from "@/contexts/AdminOverviewContext";

import { cn } from "@/lib/utils";

import {

  Activity,

  ArrowLeft,

  CreditCard,

  DollarSign,

  Gauge,

  Scale,

  Settings2,

  Shield,

  Ticket,

  Users,

} from "lucide-react";

import { Link, useRoute } from "wouter";



const ADMIN_TABS = [

  { id: "users", label: "Users", href: "/admin", icon: Users },

  { id: "activity", label: "Activity", href: "/admin/activity", icon: Activity },

  { id: "research", label: "Research quality", href: "/admin/research-quality", icon: Gauge },

  { id: "ranking", label: "Ranking weights", href: "/admin/ranking-config", icon: Scale },

  { id: "plans", label: "Plans", href: "/admin/plans", icon: CreditCard },

  { id: "revenue", label: "Revenue", href: "/admin/revenue", icon: DollarSign },

  { id: "coupons", label: "Coupons", href: "/admin/coupons", icon: Ticket },

  { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings2 },

] as const;



function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const overview = useAdminOverview();



  if (!user) {

    return (

      <div className="flex min-h-svh items-center justify-center admin-canvas p-6">

        <div className="surface-elevated w-full max-w-sm p-8 text-center space-y-6 fade-up">

          <div className="admin-icon-ring mx-auto">

            <Shield className="h-5 w-5 text-primary" />

          </div>

          <AppLogo size="lg" className="justify-center" />

          <p className="text-sm text-muted-foreground leading-relaxed">

            Sign in with your super-admin account to access the control console.

          </p>

          <Button className="w-full" onClick={() => { window.location.href = getLoginUrl("/admin"); }}>

            Sign in

          </Button>

        </div>

      </div>

    );

  }



  if (user.role !== "admin") {

    return (

      <div className="flex min-h-svh items-center justify-center admin-canvas p-6">

        <div className="surface-elevated w-full max-w-sm p-8 text-center space-y-5 fade-up">

          <div className="admin-empty-icon mx-auto">

            <Shield className="h-5 w-5 text-primary" />

          </div>

          <h1 className="font-display text-lg font-semibold">Admin access required</h1>

          <p className="text-sm text-muted-foreground leading-relaxed">

            Your account does not have super-admin permissions. Contact the platform owner if you need access.

          </p>

          <Link href="/dashboard">

            <Button variant="outline" className="w-full">

              Back to workspace

            </Button>

          </Link>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-svh admin-canvas flex flex-col">

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">

        <div className="mx-auto flex h-[3.75rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">

          <div className="flex items-center gap-3 min-w-0">

            <Link href="/dashboard">

              <Button variant="ghost" size="icon" className="shrink-0 rounded-lg">

                <ArrowLeft className="h-4 w-4" />

              </Button>

            </Link>

            <div className="min-w-0">

              <p className="admin-eyebrow">Control console</p>

              <p className="font-display text-sm font-semibold truncate">TrendHunter Super Admin</p>

            </div>

          </div>



          <div className="flex items-center gap-2 sm:gap-3">

            {overview.data ? (

              <div className="admin-header-stat">

                <Users className="h-3.5 w-3.5 text-muted-foreground" />

                <span className="text-muted-foreground">Users</span>

                <span className="font-semibold tabular-nums text-foreground">{overview.data.totalUsers}</span>

              </div>

            ) : null}

            {overview.data ? (

              <div className="admin-header-stat">

                <Activity className="h-3.5 w-3.5 text-muted-foreground" />

                <span className="text-muted-foreground">Active 7d</span>

                <span className="font-semibold tabular-nums text-foreground">{overview.data.activeUsers7d}</span>

              </div>

            ) : null}

            <span className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">

              <Shield className="h-3.5 w-3.5" />

              {user.email?.split("@")[0] ?? "Admin"}

            </span>

            <ThemeToggle />

          </div>

        </div>

      </header>



      <AdminTabNav />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">

        {children}

      </main>

    </div>

  );

}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center admin-canvas">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <AdminOverviewProvider>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AdminOverviewProvider>
  );
}

function AdminTabNav() {

  const [matchUsers] = useRoute("/admin");

  const [matchActivity] = useRoute("/admin/activity");

  const [matchResearch] = useRoute("/admin/research-quality");

  const [matchRanking] = useRoute("/admin/ranking-config");

  const [matchPlans] = useRoute("/admin/plans");

  const [matchRevenue] = useRoute("/admin/revenue");

  const [matchCoupons] = useRoute("/admin/coupons");

  const [matchSettings] = useRoute("/admin/settings");



  const active = (href: string) => {

    if (href === "/admin") {

      return (
        matchUsers &&
        !matchActivity &&
        !matchResearch &&
        !matchRanking &&
        !matchPlans &&
        !matchRevenue &&
        !matchCoupons &&
        !matchSettings
      );

    }

    if (href === "/admin/activity") return matchActivity;

    if (href === "/admin/research-quality") return matchResearch;

    if (href === "/admin/ranking-config") return matchRanking;

    if (href === "/admin/plans") return matchPlans;

    if (href === "/admin/revenue") return matchRevenue;

    if (href === "/admin/coupons") return matchCoupons;

    if (href === "/admin/settings") return matchSettings;

    return false;

  };



  return (

    <nav className="border-b border-border bg-card/50 backdrop-blur-sm">

      <div className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-4 py-3 sm:px-6">

        {ADMIN_TABS.map((tab) => {

          const Icon = tab.icon;

          const isActive = active(tab.href);

          return (

            <Link key={tab.id} href={tab.href}>

              <span

                className={cn(

                  "admin-tab-pill",

                  isActive ? "admin-tab-pill-active" : "admin-tab-pill-inactive"

                )}

              >

                <Icon className="h-4 w-4 shrink-0" />

                {tab.label}

              </span>

            </Link>

          );

        })}

      </div>

    </nav>

  );

}


