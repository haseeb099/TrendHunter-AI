import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { getChartTheme } from "@/lib/chartTheme";
import { BarChart3, TrendingUp, DollarSign, Eye } from "lucide-react";
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

export default function AnalyticsDashboard() {
  const { theme } = useTheme();
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
      <Card className="surface p-12 text-center">
        <p className="text-muted-foreground">Unable to load analytics</p>
      </Card>
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description={`Pipeline performance and profit trends${storageQuery.data ? ` · Storage: ${storageQuery.data.backend === "s3" ? "S3" : "Local"}` : ""}`}
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Saved calc revenue" value={`$${data.totalRevenue.toLocaleString()}`} icon={DollarSign} />
        <StatCard
          label="Total profit"
          value={`$${data.totalProfit.toLocaleString()}`}
          icon={TrendingUp}
          valueClassName="text-success"
        />
        <StatCard label="Average ROI" value={`${data.averageMargin}%`} icon={BarChart3} />
        <StatCard label="Active products" value={String(data.activeProducts)} icon={Eye} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          label="Discover tab views"
          value={String(data.discoverViews ?? 0)}
          icon={Eye}
        />
        <StatCard
          label="Search → pipeline"
          value={String(data.searchToPipeline ?? 0)}
          icon={BarChart3}
        />
        <StatCard
          label="Validate → pipeline"
          value={String(data.validateToPipeline ?? 0)}
          icon={TrendingUp}
        />
      </div>

      <Card className="surface p-6">
        <h3 className="text-xl font-semibold mb-4">Pipeline Activity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
            <XAxis dataKey="month" stroke={chart.axisStroke} tick={{ fill: chart.axisStroke }} />
            <YAxis stroke={chart.axisStroke} tick={{ fill: chart.axisStroke }} />
            <Tooltip contentStyle={chart.tooltipStyle} />
            <Legend wrapperStyle={chart.legendStyle} />
            <Line type="monotone" dataKey="products" name="Products" stroke={chart.colors.violet} strokeWidth={2} />
            <Line type="monotone" dataKey="revenue" name="Revenue ($)" stroke={chart.colors.emerald} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="surface p-6">
        <h3 className="text-xl font-semibold mb-4">Profit by Product</h3>
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
      </Card>

      <div className="grid md:grid-cols-4 gap-4">
        {pipelineStages.map((stage) => (
          <StatCard key={stage.label} label={stage.label} value={String(stage.count)} />
        ))}
      </div>
    </div>
  );
}
