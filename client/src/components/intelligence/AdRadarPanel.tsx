import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { Megaphone, RefreshCw, Users } from "lucide-react";
import type { RegionCode } from "@shared/searchTypes";
import { DataFreshnessBadge } from "./DataFreshnessBadge";
import { toast } from "sonner";

type AdRadarPanelProps = {
  keyword: string;
  region?: RegionCode;
  compact?: boolean;
};

export function AdRadarPanel({ keyword, region = "US", compact = false }: AdRadarPanelProps) {
  const utils = trpc.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const query = trpc.intelligence.getAdRadar.useQuery(
    { keyword, region, live: false },
    { enabled: Boolean(keyword.trim()) }
  );

  const snapshot = query.data?.snapshot;
  const configured = query.data?.configured ?? false;

  const handleLiveRefresh = async () => {
    if (!keyword.trim()) return;
    setRefreshing(true);
    try {
      const result = await utils.intelligence.getAdRadar.fetch({
        keyword,
        region,
        live: true,
      });
      utils.intelligence.getAdRadar.setData({ keyword, region, live: false }, result);
      await utils.credits.getWallet.invalidate();
      toast.success(
        result.creditsUsed ? `Ad scan complete (−${result.creditsUsed} credits)` : "Ad scan complete"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (!keyword.trim()) {
    return <p className="text-sm text-muted-foreground">Enter a keyword to scan Meta Ad Library.</p>;
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Spinner className="w-4 h-4" />
        Loading ad radar…
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="space-y-3 py-2">
        <p className="text-sm text-muted-foreground">
          {configured
            ? "No cached ads yet. Run daily ingest or scan live (2 credits)."
            : "Add META_ACCESS_TOKEN to enable Meta Ad Library."}
        </p>
        {configured ? (
          <Button size="sm" variant="outline" onClick={handleLiveRefresh} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Scan live (2 credits)
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1">
            <Megaphone className="w-4 h-4 text-primary" />
            <strong>{snapshot.activeAdCount}</strong> active ads
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {snapshot.advertiserCount} advertisers
          </span>
        </div>
        <DataFreshnessBadge
          dataMode={snapshot.isLive ? "live" : "cached"}
          cachedAt={snapshot.fetchedAt}
          stale={snapshot.stale}
          creditsUsed={query.data?.creditsUsed}
        />
      </div>

      {snapshot.gaps.length > 0 && !compact ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Opportunities</p>
          {snapshot.gaps.map((g) => (
            <p key={g} className="text-sm">
              • {g}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2">
        {snapshot.creatives.slice(0, compact ? 2 : 6).map((c) => (
          <Card key={c.id} className="p-3 space-y-1">
            <div className="flex justify-between gap-2">
              <p className="text-xs font-medium">{c.advertiserName}</p>
              <div className="flex gap-1">
                {c.platforms.slice(0, 2).map((p) => (
                  <Badge key={p} variant="outline" className="text-[9px] capitalize">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {c.bodyText ?? c.ctaText ?? "No creative text"}
            </p>
          </Card>
        ))}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={handleLiveRefresh}
        disabled={refreshing || !configured}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        Scan live (2 credits)
      </Button>
    </div>
  );
}
