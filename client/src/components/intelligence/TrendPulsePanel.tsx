import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RegionCode } from "@shared/searchTypes";
import type { TrendWindow } from "@shared/intelligenceTypes";
import { DataFreshnessBadge } from "./DataFreshnessBadge";
import { TrendWindowSelector } from "./TrendWindowSelector";
import { useTrendWindow } from "@/_core/hooks/useTrendWindow";
import { toast } from "sonner";

type TrendPulsePanelProps = {
  keyword: string;
  region?: RegionCode;
  compact?: boolean;
  timeframe?: TrendWindow;
  onTimeframeChange?: (window: TrendWindow) => void;
};

function TrendIcon({ label }: { label?: string | null }) {
  if (label === "rising") return <TrendingUp className="w-4 h-4 text-success" />;
  if (label === "declining") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function changeForWindow(
  signal: {
    changePercent7d: number | null;
    changePercent30d: number | null;
    changePercent90d: number | null;
  },
  window: TrendWindow
) {
  if (window === "7d") return signal.changePercent7d;
  if (window === "30d") return signal.changePercent30d;
  return signal.changePercent90d;
}

export function TrendPulsePanel({
  keyword,
  region = "US",
  compact = false,
  timeframe: controlledTimeframe,
  onTimeframeChange,
}: TrendPulsePanelProps) {
  const { window: storedWindow, setWindow: setStoredWindow } = useTrendWindow();
  const timeframe = controlledTimeframe ?? storedWindow;
  const setTimeframe = onTimeframeChange ?? setStoredWindow;

  const utils = trpc.useUtils();
  const query = trpc.intelligence.getTrendPulse.useQuery(
    { keyword, region, live: false, timeframe },
    { enabled: Boolean(keyword.trim()) }
  );

  const signal = query.data?.signal;
  const [refreshing, setRefreshing] = useState(false);
  const changePercent = signal ? changeForWindow(signal, timeframe) : null;

  const handleLiveRefresh = async () => {
    if (!keyword.trim()) return;
    setRefreshing(true);
    try {
      const result = await utils.intelligence.getTrendPulse.fetch({
        keyword,
        region,
        live: true,
        timeframe,
      });
      utils.intelligence.getTrendPulse.setData({ keyword, region, live: false, timeframe }, result);
      await utils.credits.getWallet.invalidate();
      toast.success(
        result.creditsUsed ? `Trend refreshed (−${result.creditsUsed} credit)` : "Trend refreshed"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (!keyword.trim()) {
    return <p className="text-sm text-muted-foreground">Enter a product or keyword to see trends.</p>;
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Spinner className="w-4 h-4" />
        Loading trend pulse…
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="space-y-3 py-2">
        <p className="text-sm text-muted-foreground">
          No trend data yet. Daily ingest will populate this, or refresh live (1 credit).
        </p>
        <Button size="sm" variant="outline" onClick={handleLiveRefresh} disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Live refresh (1 credit)
        </Button>
      </div>
    );
  }

  const chartData = signal.interestOverTime.slice(-52).map((p) => ({
    date: p.date?.slice(0, 7) ?? "",
    value: p.value,
  }));

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TrendWindowSelector value={timeframe} onChange={setTimeframe} />
        <DataFreshnessBadge
          dataMode={signal.isLive ? "live" : "cached"}
          cachedAt={signal.fetchedAt}
          stale={signal.stale}
          creditsUsed={query.data?.creditsUsed}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TrendIcon label={signal.momentumLabel} />
        <span className="font-medium text-sm capitalize">{signal.momentumLabel}</span>
        {changePercent != null ? (
          <Badge variant="secondary" className="text-[10px]">
            {changePercent > 0 ? "+" : ""}
            {changePercent}% / {timeframe}
          </Badge>
        ) : null}
        <Badge variant="outline" className="text-[10px]">
          Score {Math.round(signal.momentumScore)}
        </Badge>
      </div>

      {!compact && chartData.length > 2 ? (
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={28} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {signal.risingQueries.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Rising queries</p>
          <div className="flex flex-wrap gap-1.5">
            {signal.risingQueries.slice(0, compact ? 4 : 8).map((q) => (
              <Badge key={q} variant="secondary" className="text-[10px]">
                {q}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <Button size="sm" variant="outline" onClick={handleLiveRefresh} disabled={refreshing}>
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        Live refresh (1 credit)
      </Button>
    </div>
  );
}
