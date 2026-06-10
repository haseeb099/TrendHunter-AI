import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { getChartTheme } from "@/lib/chartTheme";
import { BarChart3, TrendingUp, DollarSign, Eye, Activity, ArrowRightLeft } from "lucide-react";
import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/EmptyState";
import { usePlan } from "@/_core/hooks/usePlan";
import { PlanFeatureGate } from "@/components/workspace/PlanFeatureGate";

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-elevated overflow-hidden">
      <div className="border-b border-border px-5 py-4 sm:px-6 bg-muted/15">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default function AnalyticsDashboard() {
  const { theme } = useTheme();
  const { canAccess } = usePlan();
  const hasAdvanced = canAccess("analytics_advanced");
  const chart = useMemo(() => getChartTheme(), [theme]);
  const { data, isLoading, error } = trpc.analytics.getDashboardMetrics.useQuery();
  const storageQuery = trpc.upload.getStatus.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Unable to load analytics"
        description="Check your connection and try refreshing the page."
      />
    );
  }

  const trendData = data.trendData.map((row) => ({
    month: row.month,
    products: row.products,
    revenue: row.revenue,
  }));

  const profitData =
    data.profitByProduct.length > 0
      ? data.profitByProduct
      : [{ product: "No data yet", profit: 0, revenue: 0 }];

  const pipelineStages = [
    { label: "Testing", count: data.pipelineByStage.testing },
    { label: "Scaling", count: data.pipelineByStage.scaling },
    { label: "Paused", count: data.pipelineByStage.paused },
    { label: "Dropped", count: data.pipelineByStage.dropped },
  ];

  const hasActivity =
    data.totalRevenue > 0 ||
    data.activeProducts > 0 ||
    (data.discoverViews ?? 0) > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description={`Pipeline performance, profit trends, and research funnel${storageQuery.data ? ` · Storage: ${storageQuery.data.backend === "s3" ? "S3" : "Local"}` : ""}`}
      />

      <div>
        <p className="metric-label mb-3">Financial overview</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Saved calc revenue"
            value={`$${data.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
          />
          <StatCard
            label="Total profit"
            value={`$${data.totalProfit.toLocaleString()}`}
            icon={TrendingUp}
            valueClassName="text-success"
          />
          <StatCard label="Average ROI" value={`${data.averageMargin}%`} icon={BarChart3} />
          <StatCard label="Active products" value={String(data.activeProducts)} icon={Eye} />
        </div>
      </div>

      {hasAdvanced ? (
        <div>
          <p className="metric-label mb-3">Research funnel</p>
          <div className="grid md:grid-cols-3 gap-4">
            <StatCard
              label="Discover views"
              value={String(data.discoverViews ?? 0)}
              icon={Eye}
              trend="Product detail opens"
            />
            <StatCard
              label="Search → pipeline"
              value={String(data.searchToPipeline ?? 0)}
              icon={ArrowRightLeft}
              trend="From Discover"
            />
            <StatCard
              label="Validate → pipeline"
              value={String(data.validateToPipeline ?? 0)}
              icon={Activity}
              trend="After AI validation"
            />
          </div>
        </div>
      ) : (
        <PlanFeatureGate
          feature="analytics_advanced"
          title="Advanced analytics on Business+"
          description="Upgrade to Business to unlock research funnel metrics, trend charts, and profit breakdowns."
        />
      )}

      {hasAdvanced && hasActivity ? (
        <>
          <ChartPanel
            title="Pipeline activity"
            description="Products added and revenue from saved profit calculations over time"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis dataKey="month" stroke={chart.axisStroke} tick={{ fill: chart.axisStroke }} />
                <YAxis stroke={chart.axisStroke} tick={{ fill: chart.axisStroke }} />
                <Tooltip contentStyle={chart.tooltipStyle} />
                <Legend wrapperStyle={chart.legendStyle} />
                <Line
                  type="monotone"
                  dataKey="products"
                  name="Products"
                  stroke={chart.colors.violet}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue ($)"
                  stroke={chart.colors.emerald}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Profit by product" description="Revenue vs net profit from saved scenarios">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis dataKey="product" stroke={chart.axisStroke} tick={{ fill: chart.axisStroke }} />
                <YAxis stroke={chart.axisStroke} tick={{ fill: chart.axisStroke }} />
                <Tooltip contentStyle={chart.tooltipStyle} />
                <Legend wrapperStyle={chart.legendStyle} />
                <Bar dataKey="revenue" name="Revenue" fill={chart.colors.blue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill={chart.colors.emerald} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="No activity data yet"
          description="Save profit calculations, add products to your pipeline, and browse Discover to populate these charts."
        />
      )}

      <div>
        <p className="metric-label mb-3">Pipeline stages</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pipelineStages.map((stage) => (
            <StatCard key={stage.label} label={stage.label} value={String(stage.count)} />
          ))}
        </div>
      </div>
    </div>
  );
}
