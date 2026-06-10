import type { TrendSignal } from "@shared/intelligenceTypes";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PublicTrendDisplayProps = {
  trend: TrendSignal | null | undefined;
};

function TrendIcon({ label }: { label?: string | null }) {
  if (label === "rising") return <TrendingUp className="w-4 h-4 text-success" />;
  if (label === "declining") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

/** Read-only trend chart for public / unauthenticated pages */
export function PublicTrendDisplay({ trend }: PublicTrendDisplayProps) {
  if (!trend) {
    return (
      <p className="text-sm text-muted-foreground">
        Trend data is refreshed daily. Check back after the next ingest run, or sign up for live
        refresh with credits.
      </p>
    );
  }

  const chartData = trend.interestOverTime.slice(-52).map((p) => ({
    date: p.date?.slice(0, 7) ?? "",
    value: p.value,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrendIcon label={trend.momentumLabel} />
        <span className="font-medium text-sm capitalize">{trend.momentumLabel}</span>
        {trend.changePercent90d != null ? (
          <Badge variant="secondary" className="text-[10px]">
            {trend.changePercent90d > 0 ? "+" : ""}
            {trend.changePercent90d}% / 90d
          </Badge>
        ) : null}
        <Badge variant="outline" className="text-[10px]">
          Score {Math.round(trend.momentumScore)}
        </Badge>
      </div>

      {chartData.length > 2 ? (
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveEnd" />
              <YAxis tick={{ fontSize: 10 }} width={28} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {trend.risingQueries.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Rising searches</p>
          <div className="flex flex-wrap gap-1.5">
            {trend.risingQueries.slice(0, 8).map((q) => (
              <Badge key={q} variant="secondary" className="text-[10px]">
                {q}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
