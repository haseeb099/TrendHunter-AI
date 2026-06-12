import { Button } from "@/components/ui/button";

import { Spinner } from "@/components/ui/spinner";

import { trpc } from "@/lib/trpc";

import { getDashboardPath } from "@/config/dashboardNav";

import type { RegionCode } from "@shared/searchTypes";

import { ExternalLink, LineChart, Megaphone, Radar, Video } from "lucide-react";

import { Link } from "wouter";

import {

  LineChart as RechartsLine,

  Line,

  ResponsiveContainer,

  Tooltip,

} from "recharts";



type MiniIntelPanelProps = {

  keyword: string;

  region?: RegionCode;

};



export function MiniIntelPanel({ keyword, region = "US" }: MiniIntelPanelProps) {

  const summaryQuery = trpc.intelligence.getProductIntel.useQuery(

    { keyword, region },

    { enabled: Boolean(keyword.trim()) }

  );



  const trendQuery = trpc.intelligence.getTrendPulse.useQuery(

    { keyword, region, live: false },

    { enabled: Boolean(keyword.trim()) }

  );



  if (!keyword.trim()) {

    return (

      <p className="text-sm text-muted-foreground">

        Select a product to see a quick intel snapshot.

      </p>

    );

  }



  if (summaryQuery.isLoading) {

    return (

      <div className="flex justify-center py-6">

        <Spinner />

      </div>

    );

  }



  const summary = summaryQuery.data;

  const signal = trendQuery.data?.signal;

  const sparkData =

    signal?.interestOverTime.slice(-12).map((p) => ({

      value: p.value,

    })) ?? [];



  const trendsHref = `${getDashboardPath("trendpulse")}?keyword=${encodeURIComponent(keyword)}&region=${region}`;

  const adsHref = `${getDashboardPath("adradar")}?keyword=${encodeURIComponent(keyword)}&region=${region}`;

  const tiktokHref = `${getDashboardPath("tiktokradar")}?keyword=${encodeURIComponent(keyword)}&region=${region}`;

  const shopHref = `${getDashboardPath("tiktokshop")}?keyword=${encodeURIComponent(keyword)}&region=${region}`;



  return (

    <div className="space-y-4">

      <div className="grid grid-cols-2 gap-3">

        <div className="rounded-lg border border-border bg-muted/20 p-3">

          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">

            Trend momentum

          </p>

          {sparkData.length > 2 ? (

            <div className="h-10 w-full mb-1">

              <ResponsiveContainer width="100%" height="100%">

                <RechartsLine data={sparkData}>

                  <Tooltip content={() => null} />

                  <Line

                    type="monotone"

                    dataKey="value"

                    stroke="hsl(var(--primary))"

                    dot={false}

                    strokeWidth={2}

                  />

                </RechartsLine>

              </ResponsiveContainer>

            </div>

          ) : null}

          <p className="font-display text-xl font-bold tabular-nums">

            {summary?.trendMomentum != null ? Math.round(summary.trendMomentum) : "—"}

          </p>

          <p className="text-[11px] text-muted-foreground capitalize">

            {summary?.trendLabel ?? "No data"}

          </p>

        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">

          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">

            Ad saturation

          </p>

          <p className="font-display text-xl font-bold tabular-nums">

            {summary?.activeAdCount != null ? summary.activeAdCount : "—"}

          </p>

          <p className="text-[11px] text-muted-foreground">

            {summary?.advertiserCount != null

              ? `${summary.advertiserCount} advertisers`

              : "Meta ads in niche"}

          </p>

        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3 col-span-2">

          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">

            TikTok ad pressure

          </p>

          <p className="font-display text-xl font-bold tabular-nums">

            {summary?.tiktokActiveAdCount != null ? summary.tiktokActiveAdCount : "—"}

          </p>

          <p className="text-[11px] text-muted-foreground">

            {summary?.tiktokAdvertiserCount != null

              ? `${summary.tiktokAdvertiserCount} TikTok advertisers`

              : "Short-form ad competition"}

          </p>

        </div>

      </div>



      <div className="flex flex-col gap-2">

        <Link href={trendsHref}>

          <Button size="sm" variant="outline" className="w-full justify-between">

            <span className="inline-flex items-center gap-2">

              <LineChart className="w-3.5 h-3.5" />

              View full Google Trends

            </span>

            <ExternalLink className="w-3 h-3 opacity-60" />

          </Button>

        </Link>

        <Link href={adsHref}>

          <Button size="sm" variant="outline" className="w-full justify-between">

            <span className="inline-flex items-center gap-2">

              <Radar className="w-3.5 h-3.5" />

              View full Meta Ad Library

            </span>

            <ExternalLink className="w-3 h-3 opacity-60" />

          </Button>

        </Link>

        <Link href={tiktokHref}>

          <Button size="sm" variant="outline" className="w-full justify-between">

            <span className="inline-flex items-center gap-2">

              <Megaphone className="w-3.5 h-3.5" />

              View TikTok Ads radar

            </span>

            <ExternalLink className="w-3 h-3 opacity-60" />

          </Button>

        </Link>

        <Link href={shopHref}>

          <Button size="sm" variant="outline" className="w-full justify-between">

            <span className="inline-flex items-center gap-2">

              <Video className="w-3.5 h-3.5" />

              View TikTok Shop trends

            </span>

            <ExternalLink className="w-3 h-3 opacity-60" />

          </Button>

        </Link>

      </div>

    </div>

  );

}

