import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  ArrowRightLeft,
  DollarSign,
  Percent,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminRevenueTab() {
  const revenueQuery = trpc.admin.getRevenue.useQuery();

  if (revenueQuery.isLoading) return <AdminLoading label="Loading revenue metrics…" />;
  if (revenueQuery.isError) {
    return (
      <AdminEmptyState
        title="Could not load revenue"
        description={revenueQuery.error.message}
      />
    );
  }

  const data = revenueQuery.data;
  if (!data) {
    return (
      <AdminEmptyState
        title="No revenue data"
        description="Stripe subscription aggregates are unavailable."
      />
    );
  }

  return (
    <div className="space-y-8 admin-stagger">
      <AdminPageHeader
        title="Revenue"
        description="MRR and subscription health from Stripe-linked accounts and webhook events — no need to open the Stripe Dashboard."
        icon={DollarSign}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <AdminMetricCard
          label="MRR"
          value={formatUsd(data.mrr)}
          icon={DollarSign}
          hint={`${data.activeStripeSubscriptions} active Stripe subs`}
          tone="success"
        />
        <AdminMetricCard
          label="Trial → paid"
          value={`${data.trialToPaidRate}%`}
          icon={TrendingUp}
          hint={`${data.trialToPaidCount} converted subscribers`}
        />
        <AdminMetricCard
          label="Conversions (30d)"
          value={data.conversionsLast30d}
          icon={Users}
          hint="New paid subs with Stripe ID"
          tone={data.conversionsLast30d > 0 ? "success" : "default"}
        />
        <AdminMetricCard
          label="Churn (30d)"
          value={data.churnLast30d}
          icon={TrendingDown}
          hint={`${data.churnRate30d}% churn rate`}
          tone={data.churnLast30d > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <AdminSection title="MRR by plan" description="Active Stripe subscriptions by tier">
          {data.mrrByPlan.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active paid Stripe subscriptions yet.</p>
          ) : (
            <div className="space-y-2">
              {data.mrrByPlan.map((row) => (
                <div
                  key={row.planId}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {row.planId}
                    </Badge>
                    <span className="text-muted-foreground">{row.subscribers} subs</span>
                  </div>
                  <span className="font-semibold tabular-nums">{formatUsd(row.mrr)}</span>
                </div>
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Coupon attribution" description="Promo codes and redemptions">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <AdminMetricCard
              label="Coupons"
              value={data.couponStats.totalCoupons}
              icon={Ticket}
            />
            <AdminMetricCard
              label="Redemptions"
              value={data.couponStats.totalRedemptions}
              icon={Percent}
            />
            <AdminMetricCard
              label="Last 30d"
              value={data.couponStats.redemptionsLast30d}
              icon={ArrowRightLeft}
            />
          </div>
          {data.couponStats.topCoupons.length > 0 ? (
            <div className="space-y-2">
              {data.couponStats.topCoupons.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-mono font-medium">{c.code}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{c.couponType}</span>
                  </div>
                  <span className="tabular-nums">{c.redemptions}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No coupon redemptions yet.</p>
          )}
        </AdminSection>
      </div>

      {data.stripeWebhookEventsLast30d.length > 0 ? (
        <AdminSection
          title="Stripe webhooks (30d)"
          description="Event volume from stripe_webhook_events table"
        >
          <div className="flex flex-wrap gap-2">
            {data.stripeWebhookEventsLast30d.map((e) => (
              <Badge key={e.eventType} variant="secondary" className="font-mono text-xs">
                {e.eventType}: {e.count}
              </Badge>
            ))}
          </div>
        </AdminSection>
      ) : null}
    </div>
  );
}
