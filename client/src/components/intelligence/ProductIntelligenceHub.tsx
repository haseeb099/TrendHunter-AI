import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";

import { trpc } from "@/lib/trpc";

import { TrendPulsePanel } from "./TrendPulsePanel";

import { AdRadarPanel } from "./AdRadarPanel";

import { TikTokIntelPanel } from "./TikTokIntelPanel";

import { DataFreshnessBadge } from "./DataFreshnessBadge";

import { IntelligenceVerdict } from "./IntelligenceVerdict";

import { usePlan } from "@/_core/hooks/usePlan";

import {
  Megaphone,
  Video,
  LayoutGrid,
  Sparkles,
  Users,
  TrendingUp,
  Lock,
  ExternalLink,
  LineChart,
  Radar,
} from "lucide-react";

import { Link } from "wouter";

import { getDashboardPath } from "@/config/dashboardNav";

import type { RegionCode } from "@shared/searchTypes";

import { Spinner } from "@/components/ui/spinner";
import { IntelAlertsPanel } from "./IntelAlertsPanel";

type ProductIntelligenceHubProps = {
  keyword: string;
  region?: RegionCode;
  productId?: string;
  productBenefit?: string;
  compact?: boolean;
  showDeepLinks?: boolean;
};

export function ProductIntelligenceHub({
  keyword,
  region = "US",
  productId,
  productBenefit,
  compact = false,
  showDeepLinks = false,
}: ProductIntelligenceHubProps) {
  const [subTab, setSubTab] = useState("overview");
  const { canAccess } = usePlan();
  const canSocial = canAccess("social");
  const canSpy = canAccess("competitors");

  const summaryQuery = trpc.intelligence.getProductIntel.useQuery(
    { keyword, region },
    { enabled: Boolean(keyword.trim()) }
  );

  const trendQuery = trpc.intelligence.getTrendPulse.useQuery(
    { keyword, region, live: false },
    { enabled: Boolean(keyword.trim()) && subTab === "google" }
  );

  const adsQuery = trpc.intelligence.getAdRadar.useQuery(
    { keyword, region, live: false },
    { enabled: Boolean(keyword.trim()) && subTab === "meta" }
  );

  const tiktokQuery = trpc.intelligence.getTikTokRadar.useQuery(
    { keyword, region, live: false },
    { enabled: Boolean(keyword.trim()) && subTab === "tiktok" }
  );

  const summary = summaryQuery.data;

  const subPanelFreshness = (() => {
    if (subTab === "google" && trendQuery.data?.signal) {
      return {
        dataMode: trendQuery.data.signal.isLive ? ("live" as const) : ("cached" as const),
        cachedAt: trendQuery.data.signal.fetchedAt,
        stale: trendQuery.data.signal.stale,
        creditsUsed: trendQuery.data.creditsUsed,
      };
    }
    if (subTab === "meta" && adsQuery.data?.snapshot) {
      return {
        dataMode: adsQuery.data.snapshot.isLive ? ("live" as const) : ("cached" as const),
        cachedAt: adsQuery.data.snapshot.fetchedAt,
        stale: adsQuery.data.snapshot.stale,
        creditsUsed: adsQuery.data.creditsUsed,
      };
    }
    if (subTab === "tiktok" && tiktokQuery.data?.snapshot) {
      return {
        dataMode: tiktokQuery.data.snapshot.isLive ? ("live" as const) : ("cached" as const),
        cachedAt: tiktokQuery.data.snapshot.fetchedAt,
        stale: tiktokQuery.data.snapshot.stale,
        creditsUsed: tiktokQuery.data.creditsUsed,
      };
    }
    if (subTab === "overview" && summary?.fetchedAt) {
      return { dataMode: "cached" as const, cachedAt: summary.fetchedAt };
    }
    return null;
  })();

  const socialHref = `${getDashboardPath("social")}?productTitle=${encodeURIComponent(keyword)}${
    productBenefit ? `&benefit=${encodeURIComponent(productBenefit)}` : ""
  }&region=${region}${productId ? `&productId=${encodeURIComponent(productId)}` : ""}`;

  const spyHref = `${getDashboardPath("competitors")}?keyword=${encodeURIComponent(keyword)}`;
  const trendsHref = `${getDashboardPath("trendpulse")}?keyword=${encodeURIComponent(keyword)}&region=${region}`;
  const adsHref = `${getDashboardPath("adradar")}?keyword=${encodeURIComponent(keyword)}&region=${region}`;

  if (!keyword.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a product or keyword to view market intelligence.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Product intelligence
        </p>
        {subPanelFreshness ? (
          <DataFreshnessBadge
            dataMode={subPanelFreshness.dataMode}
            cachedAt={subPanelFreshness.cachedAt}
            stale={"stale" in subPanelFreshness ? subPanelFreshness.stale : undefined}
            creditsUsed={subPanelFreshness.creditsUsed}
          />
        ) : summaryQuery.isLoading ? (
          <Spinner className="w-3.5 h-3.5" />
        ) : null}
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-muted/40 p-1">
          <TabsTrigger value="overview" className="text-xs gap-1">
            <LayoutGrid className="w-3.5 h-3.5" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="google" className="text-xs gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Google
          </TabsTrigger>
          <TabsTrigger value="meta" className="text-xs gap-1">
            <Megaphone className="w-3.5 h-3.5" />
            Meta
          </TabsTrigger>
          <TabsTrigger value="tiktok" className="text-xs gap-1">
            <Video className="w-3.5 h-3.5" />
            TikTok
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {summaryQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <>
              <IntelligenceVerdict summary={summary} stale={summary?.stale} />

              <div className="grid grid-cols-2 gap-2 text-center">
                <MetricTile
                  label="Trend score"
                  value={summary?.trendMomentum != null ? String(Math.round(summary.trendMomentum)) : "—"}
                  sub={summary?.trendLabel ? capitalize(summary.trendLabel) : "No data"}
                />
                <MetricTile
                  label="Meta ads"
                  value={summary?.activeAdCount != null ? String(summary.activeAdCount) : "—"}
                  sub={
                    summary?.advertiserCount != null
                      ? `${summary.advertiserCount} advertisers`
                      : "No data"
                  }
                />
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setSubTab("google")}>
              Trend chart
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSubTab("meta")}>
              Ad creatives
            </Button>
            {showDeepLinks ? (
              <>
                <Link href={trendsHref}>
                  <Button size="sm" variant="ghost">
                    <LineChart className="w-3.5 h-3.5" />
                    Full Google page
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </Button>
                </Link>
                <Link href={adsHref}>
                  <Button size="sm" variant="ghost">
                    <Radar className="w-3.5 h-3.5" />
                    Full Meta page
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </Button>
                </Link>
              </>
            ) : null}
            {canSocial ? (
              <Link href={socialHref}>
                <Button size="sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  Social Kit
                </Button>
              </Link>
            ) : (
              <Button size="sm" variant="secondary" disabled>
                <Lock className="w-3.5 h-3.5" />
                Social (Pro+)
              </Button>
            )}
            {canSpy ? (
              <Link href={spyHref}>
                <Button size="sm" variant="outline">
                  <Users className="w-3.5 h-3.5" />
                  Competitors
                </Button>
              </Link>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="google" className="mt-4">
          <TrendPulsePanel keyword={keyword} region={region} compact={compact} />
          {!compact ? (
            <Link href={trendsHref} className="inline-block mt-3">
              <Button size="sm" variant="link" className="px-0 h-auto text-xs">
                Open full Google Trends workspace
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          ) : null}
        </TabsContent>

        <TabsContent value="meta" className="mt-4">
          <AdRadarPanel keyword={keyword} region={region} compact={compact} />
          {!compact ? (
            <Link href={adsHref} className="inline-block mt-3">
              <Button size="sm" variant="link" className="px-0 h-auto text-xs">
                Open full Meta Ad Library workspace
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          ) : null}
        </TabsContent>

        <TabsContent value="tiktok" className="mt-4">
          <TikTokIntelPanel keyword={keyword} region={region} compact={compact} />
        </TabsContent>
      </Tabs>

      {!compact ? <IntelAlertsPanel keyword={keyword} region={region} /> : null}
      {!compact ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Cached reads are free. Live refresh: Google 1 credit · Meta 2 credits. Open{" "}
          <Link href={getDashboardPath("intel")} className="text-primary hover:underline">
            Intel Center
          </Link>{" "}
          for trending keywords across your region.
        </p>
      ) : null}
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold tabular-nums mt-0.5">{value}</p>
      <p className="text-[11px] text-muted-foreground capitalize">{sub}</p>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
