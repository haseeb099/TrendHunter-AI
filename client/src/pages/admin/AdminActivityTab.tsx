import { useState } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Activity, BarChart3, Brain, ClipboardList, Search, Ticket, UserPlus, Users } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-info/15 text-info border-info/25",
  starter: "bg-muted text-foreground border-border",
  pro: "bg-primary/10 text-primary border-primary/25",
  business: "bg-success/10 text-success border-success/25",
  agency: "bg-warning/10 text-warning border-warning/25",
};

export default function AdminActivityTab() {
  const [auditPage, setAuditPage] = useState(1);
  const analytics = trpc.admin.getPlatformAnalytics.useQuery();
  const audit = trpc.admin.getActivityLog.useQuery({ page: auditPage, pageSize: 25 });

  if (analytics.isLoading) return <AdminLoading label="Loading platform insights…" />;
  if (analytics.isError) {
    return (
      <AdminEmptyState
        title="Could not load platform analytics"
        description={analytics.error.message}
      />
    );
  }

  const data = analytics.data;
  const maxSignup = Math.max(1, ...(data?.signupsByDay.map((d) => d.count) ?? [1]));
  const auditPages = Math.max(1, Math.ceil((audit.data?.total ?? 0) / 25));
  const totalPlans = data?.planDistribution.reduce((s, p) => s + p.count, 0) || 1;

  return (
    <div className="space-y-8 admin-stagger">
      <AdminPageHeader
        title="Activity & insights"
        description="Real-time platform health — sign-ups, usage, plan mix, and the full admin audit trail."
        icon={BarChart3}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <AdminMetricCard label="Active 7d" value={data?.activeUsers7d ?? 0} icon={Users} />
        <AdminMetricCard label="Signups today" value={data?.newSignupsToday ?? 0} icon={UserPlus} tone="success" />
        <AdminMetricCard label="Searches today" value={data?.searchesToday ?? 0} icon={Search} />
        <AdminMetricCard label="AI calls today" value={data?.aiCallsToday ?? 0} icon={Brain} />
        <AdminMetricCard label="Paid users" value={data?.paidUsers ?? 0} />
        <AdminMetricCard label="Redemptions" value={data?.totalRedemptions ?? 0} icon={Ticket} hint={`${data?.totalCoupons ?? 0} coupons`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <AdminSection title="Sign-ups — last 14 days" icon={Activity} flush>
          <div className="space-y-2.5">
            {data?.signupsByDay.map((day) => (
              <div key={day.date} className="flex items-center gap-3 text-sm group">
                <span className="w-[4.5rem] text-xs text-muted-foreground tabular-nums font-medium">
                  {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <div className="admin-chart-bar flex-1">
                  <div
                    className="admin-chart-fill"
                    style={{ width: `${(day.count / maxSignup) * 100}%` }}
                  />
                </div>
                <span className="w-7 text-right tabular-nums font-semibold text-sm">{day.count}</span>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Plan distribution" icon={Users} flush>
          <div className="space-y-4">
            {data?.planDistribution.map((row) => {
              const pct = Math.round((row.count / totalPlans) * 100);
              return (
                <div key={row.planId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline" className={`capitalize ${PLAN_COLORS[row.planId] ?? ""}`}>
                      {row.planId}
                    </Badge>
                    <span className="text-sm tabular-nums">
                      <span className="font-semibold">{row.count}</span>
                      <span className="text-muted-foreground ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="admin-chart-bar">
                    <div className="admin-chart-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </AdminSection>
      </div>

      <AdminSection
        title="Admin audit log"
        description="Every support action across the platform"
        icon={ClipboardList}
        action={
          <span className="text-xs text-muted-foreground tabular-nums">
            {audit.data?.total ?? 0} events
          </span>
        }
        flush
      >
        {audit.isLoading ? (
          <AdminLoading label="Loading audit log…" />
        ) : (audit.data?.entries ?? []).length === 0 ? (
          <AdminEmptyState
            icon={ClipboardList}
            title="No audit events yet"
            description="Admin actions will appear here as you manage users, plans, and settings."
          />
        ) : (
          <>
            <div className="admin-table-shell">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.data?.entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <span className="inline-flex rounded-md bg-muted/50 px-2 py-0.5 text-xs font-medium">
                          {e.action.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[160px]">
                        {e.adminEmail ?? `#${e.adminUserId}`}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[160px]">
                        {e.targetEmail ?? `#${e.targetUserId}`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap text-right tabular-nums">
                        {new Date(e.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-border text-sm text-muted-foreground">
              <span>Page {auditPage} of {auditPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={auditPage >= auditPages} onClick={() => setAuditPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </AdminSection>
    </div>
  );
}
