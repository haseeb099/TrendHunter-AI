import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Sparkles, Video, RefreshCw, Users, ExternalLink } from "lucide-react";
import type { RegionCode } from "@shared/searchTypes";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "wouter";
import { getDashboardPath } from "@/config/dashboardNav";
import { DataFreshnessBadge } from "./DataFreshnessBadge";
import { toast } from "sonner";

type TikTokIntelPanelProps = {
  keyword: string;
  region?: RegionCode;
  compact?: boolean;
  publicMode?: boolean;
};

export function TikTokIntelPanel({
  keyword,
  region = "US",
  compact = false,
  publicMode = false,
}: TikTokIntelPanelProps) {
  const utils = trpc.useUtils();
  const [refreshing, setRefreshing] = useState(false);

  const publicQuery = trpc.intelligence.getPublicTrend.useQuery(
    { keyword, region },
    { enabled: publicMode && Boolean(keyword.trim()) }
  );

  const radarQuery = trpc.intelligence.getTikTokRadar.useQuery(
    { keyword, region, live: false },
    { enabled: !publicMode && Boolean(keyword.trim()) }
  );

  const snapshot = publicMode ? mapPublicTikTok(publicQuery.data?.tiktok) : radarQuery.data?.snapshot;
  const configured = publicMode ? Boolean(publicQuery.data?.tiktok) : (radarQuery.data?.configured ?? false);
  const provider = radarQuery.data?.provider;
  const isLoading = publicMode ? publicQuery.isLoading : radarQuery.isLoading;

  const handleLiveRefresh = async () => {
    if (publicMode || !keyword.trim()) return;
    setRefreshing(true);
    try {
      const result = await utils.intelligence.getTikTokRadar.fetch({
        keyword,
        region,
        live: true,
      });
      utils.intelligence.getTikTokRadar.setData({ keyword, region, live: false }, result);
      await utils.credits.getWallet.invalidate();
      toast.success(
        result.creditsUsed
          ? `TikTok intel refreshed (${result.creditsUsed} credit${result.creditsUsed === 1 ? "" : "s"})`
          : "TikTok intel refreshed"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (!keyword.trim()) {
    return <p className="text-sm text-muted-foreground">Enter a product to see TikTok intel.</p>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Spinner className="w-4 h-4" />
        Loading TikTok intel…
      </div>
    );
  }

  const isAdLibrary = snapshot?.source === "searchapi";
  const isOrganic = snapshot?.source === "scrapecreators";

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">TikTok {isAdLibrary ? "Ad Library" : "content intel"}</p>
          {snapshot?.source ? (
            <Badge variant="secondary" className="text-[10px]">
              {isAdLibrary ? "SearchAPI" : isOrganic ? "Organic" : "Cached"}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {snapshot?.fetchedAt ? (
            <DataFreshnessBadge dataMode="cached" cachedAt={snapshot.fetchedAt} stale={false} />
          ) : null}
          {!publicMode && configured ? (
            <Button
              size="sm"
              variant="outline"
              disabled={refreshing}
              onClick={() => void handleLiveRefresh()}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Live (2 credits)
            </Button>
          ) : null}
        </div>
      </div>

      {!configured && !snapshot ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground space-y-1">
          <p>
            Add <code className="text-[10px]">SEARCHAPI_KEY</code> for TikTok Ad Library data, or{" "}
            <code className="text-[10px]">TIKTOK_SHOP_API_KEY</code> for organic TikTok content via
            ScrapeCreators. Cached data appears after daily ingest.
          </p>
          {provider ? <p>Active provider: {provider}</p> : null}
        </div>
      ) : null}

      {snapshot ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">
              {snapshot.activeAdCount} {isAdLibrary ? "ads" : "videos"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3" />
              {snapshot.advertiserCount} {isAdLibrary ? "advertisers" : "creators"}
            </Badge>
          </div>

          {snapshot.gaps.length > 0 && !compact ? (
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              {snapshot.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          ) : null}

          {snapshot.creatives.length > 0 ? (
            <div className="space-y-2">
              {snapshot.creatives.slice(0, compact ? 3 : 6).map((creative) => (
                <Card key={creative.id} className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium truncate">{creative.advertiserName}</p>
                    {creative.videoUrl ? (
                      <a
                        href={creative.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : null}
                  </div>
                  {creative.bodyText ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">{creative.bodyText}</p>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No TikTok data cached yet. Run ingest or refresh live when configured.
        </p>
      )}

      {!publicMode ? (
        <Link href={`${getDashboardPath("social")}?productTitle=${encodeURIComponent(keyword)}`}>
          <Button size="sm" variant="outline" className="w-full sm:w-auto">
            <Sparkles className="w-3.5 h-3.5" />
            Generate TikTok content
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

function mapPublicTikTok(
  tiktok:
    | {
        activeAdCount: number;
        advertiserCount: number;
        source: string;
        sampleCreatives: Array<{
          id: string;
          advertiserName: string;
          bodyText: string | null;
          videoUrl?: string | null;
        }>;
      }
    | null
    | undefined
) {
  if (!tiktok) return null;
  return {
    activeAdCount: tiktok.activeAdCount,
    advertiserCount: tiktok.advertiserCount,
    source: tiktok.source as "searchapi" | "scrapecreators" | "cached",
    gaps: [] as string[],
    fetchedAt: new Date().toISOString(),
    creatives: tiktok.sampleCreatives.map((c) => ({
      id: c.id,
      advertiserName: c.advertiserName,
      bodyText: c.bodyText,
      videoUrl: c.videoUrl ?? null,
      coverUrl: null,
      firstShown: null,
      lastShown: null,
      isActive: true,
    })),
  };
}
