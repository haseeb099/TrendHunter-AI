import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowRightLeft,
  Gauge,
  Layers,
  Search,
  ShieldCheck,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";

type MetricTone = "default" | "success" | "warning" | "danger";

function toneForHigherBetter(actual: number, target: number): MetricTone {
  if (actual >= target) return "success";
  if (actual >= target * 0.8) return "warning";
  return "danger";
}

function toneForLowerBetter(actual: number, target: number): MetricTone {
  if (actual <= target) return "success";
  if (actual <= target * 1.25) return "warning";
  return "danger";
}

export default function AdminResearchQualityTab() {
  const qualityQuery = trpc.admin.getResearchQuality.useQuery();
  const analyticsQuery = trpc.admin.getPlatformAnalytics.useQuery();
  const healthQuery = trpc.system.deepHealth.useQuery();

  if (qualityQuery.isLoading) return <AdminLoading label="Loading research quality…" />;
  if (qualityQuery.isError) {
    return (
      <AdminEmptyState
        title="Could not load research quality"
        description={qualityQuery.error.message}
      />
    );
  }

  const scorecard = qualityQuery.data?.scorecard;
  if (!scorecard) {
    return (
      <AdminEmptyState
        title="No scorecard data"
        description="Research quality metrics are unavailable."
      />
    );
  }

  const { targets } = scorecard;
  const analytics = analyticsQuery.data;
  const providerChecks = healthQuery.data?.checks.providers ?? {};
  const latencies = Object.entries(providerChecks)
    .filter(([, check]) => check.latencyMs != null)
    .map(([name, check]) => ({ name, latencyMs: check.latencyMs as number }));
  const avgLatencyMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((sum, row) => sum + row.latencyMs, 0) / latencies.length)
      : null;

  return (
    <div className="space-y-8 admin-stagger">
      <AdminPageHeader
        title="Research quality"
        description="Autonomous research engine scorecard — snapshot freshness, marketplace coverage, explainability, and rank stability vs internal targets."
        icon={Gauge}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <AdminMetricCard
          label="Data freshness"
          value={`${scorecard.dataFreshnessPct}%`}
          icon={Zap}
          hint="Snapshots within TTL"
          tone={toneForHigherBetter(scorecard.dataFreshnessPct, targets.dataFreshness)}
        />
        <AdminMetricCard
          label="Marketplace coverage"
          value={scorecard.avgProvidersPerQuery}
          icon={Layers}
          hint="Avg providers per query"
          tone={toneForHigherBetter(scorecard.avgProvidersPerQuery, targets.marketplaceCoverage)}
        />
        <AdminMetricCard
          label="Zero-result rate"
          value={`${scorecard.zeroResultRatePct}%`}
          icon={Search}
          hint="Failed searches (sample)"
          tone={toneForLowerBetter(scorecard.zeroResultRatePct, targets.zeroResultRate)}
        />
        <AdminMetricCard
          label="Explainability"
          value={`${scorecard.explainabilityPct}%`}
          icon={ShieldCheck}
          hint="Features computed <24h"
          tone={toneForHigherBetter(scorecard.explainabilityPct, targets.explainability)}
        />
        <AdminMetricCard
          label="Rank stability"
          value={`${scorecard.rankStabilityPct}%`}
          icon={TrendingUp}
          hint="Query-pair overlap"
          tone={toneForHigherBetter(scorecard.rankStabilityPct, targets.rankStability)}
        />
      </div>

      <AdminSection
        title="Target comparison"
        description="S23 internal benchmarks from COMPETITOR-BENCHMARK.md"
        icon={Gauge}
        flush
      >
        <div className="admin-table-shell">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Metric</th>
                <th className="px-5 py-3 font-medium">Current</th>
                <th className="px-5 py-3 font-medium">Target</th>
                <th className="px-5 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  {
                    label: "Snapshots within TTL",
                    actual: `${scorecard.dataFreshnessPct}%`,
                    target: `≥ ${targets.dataFreshness}%`,
                    met: scorecard.dataFreshnessPct >= targets.dataFreshness,
                  },
                  {
                    label: "Avg providers per query",
                    actual: String(scorecard.avgProvidersPerQuery),
                    target: `≥ ${targets.marketplaceCoverage}`,
                    met: scorecard.avgProvidersPerQuery >= targets.marketplaceCoverage,
                  },
                  {
                    label: "Zero-result rate",
                    actual: `${scorecard.zeroResultRatePct}%`,
                    target: `< ${targets.zeroResultRate}%`,
                    met: scorecard.zeroResultRatePct < targets.zeroResultRate,
                  },
                  {
                    label: "Results with explanation",
                    actual: `${scorecard.explainabilityPct}%`,
                    target: `${targets.explainability}%`,
                    met: scorecard.explainabilityPct >= targets.explainability,
                  },
                  {
                    label: "Rank stability (query pairs)",
                    actual: `${scorecard.rankStabilityPct}%`,
                    target: `≥ ${targets.rankStability}%`,
                    met: scorecard.rankStabilityPct >= targets.rankStability,
                  },
                ] as const
              ).map((row) => (
                <tr key={row.label} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3">{row.label}</td>
                  <td className="px-5 py-3 tabular-nums font-medium">{row.actual}</td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">{row.target}</td>
                  <td className="px-5 py-3 text-right">
                    <Badge variant={row.met ? "default" : "outline"} className="text-[10px]">
                      {row.met ? "On target" : "Below target"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <div className="grid lg:grid-cols-2 gap-4">
        <AdminSection
          title="Research funnel"
          description="Today's platform activity — discover usage and AI-assisted flows"
          icon={ArrowRightLeft}
          flush
        >
          {analyticsQuery.isLoading ? (
            <AdminLoading label="Loading funnel stats…" />
          ) : (
            <div className="grid grid-cols-2 gap-3 p-5 sm:p-6">
              <AdminMetricCard
                label="Searches today"
                value={analytics?.searchesToday ?? 0}
                icon={Search}
              />
              <AdminMetricCard
                label="AI calls today"
                value={analytics?.aiCallsToday ?? 0}
                icon={Activity}
              />
              <AdminMetricCard
                label="Active users (7d)"
                value={analytics?.activeUsers7d ?? 0}
              />
              <AdminMetricCard
                label="Zero-result rate"
                value={`${scorecard.zeroResultRatePct}%`}
                hint="From recent search events"
                tone={toneForLowerBetter(scorecard.zeroResultRatePct, targets.zeroResultRate)}
              />
            </div>
          )}
        </AdminSection>

        <AdminSection
          title="Provider speed"
          description="Live health-check latency for configured research providers"
          icon={Timer}
          flush
        >
          {healthQuery.isLoading ? (
            <AdminLoading label="Running health checks…" />
          ) : latencies.length === 0 ? (
            <div className="p-5 sm:p-6">
              <AdminEmptyState
                title="No latency data"
                description="Configure external providers to measure response times."
              />
            </div>
          ) : (
            <div className="space-y-3 p-5 sm:p-6">
              {avgLatencyMs != null ? (
                <AdminMetricCard
                  label="Avg provider latency"
                  value={`${avgLatencyMs} ms`}
                  icon={Timer}
                  tone={
                    avgLatencyMs <= 500
                      ? "success"
                      : avgLatencyMs <= 1500
                        ? "warning"
                        : "danger"
                  }
                />
              ) : null}
              <div className="space-y-2">
                {latencies.map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between gap-3 text-sm rounded-lg border border-border px-3 py-2"
                  >
                    <span className="capitalize">{row.name.replace(/_/g, " ")}</span>
                    <span className="tabular-nums font-medium">{row.latencyMs} ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AdminSection>
      </div>
    </div>
  );
}
