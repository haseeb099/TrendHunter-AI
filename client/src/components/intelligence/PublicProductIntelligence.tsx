import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { PublicTrendDisplay } from "./PublicTrendDisplay";
import type { RegionCode } from "@shared/searchTypes";
import { Megaphone, Video } from "lucide-react";
import { Link } from "wouter";
import { getRegisterUrl } from "@/const";
import { Button } from "@/components/ui/button";

type PublicProductIntelligenceProps = {
  keyword: string;
  region?: RegionCode;
};

/** Cached market intel for guests — uses public API only (no credits). */
export function PublicProductIntelligence({
  keyword,
  region = "US",
}: PublicProductIntelligenceProps) {
  const query = trpc.intelligence.getPublicTrend.useQuery(
    { keyword, region },
    { enabled: Boolean(keyword.trim()), retry: 1 }
  );

  if (!keyword.trim()) {
    return <p className="text-sm text-muted-foreground">Select a product to view market intel.</p>;
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Spinner className="w-4 h-4" />
        Loading market intel…
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">
        Could not load intel. {query.error.message}
      </p>
    );
  }

  const data = query.data;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Google Trends
        </p>
        <PublicTrendDisplay trend={data?.trend} />
      </div>

      {data?.ads ? (
        <div className="rounded-lg border border-border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Megaphone className="w-4 h-4 text-primary" />
            Meta ads snapshot
          </div>
          <p className="text-sm text-muted-foreground">
            {data.ads.activeAdCount} active ads from {data.ads.advertiserCount} advertisers (cached).
          </p>
          {data.ads.sampleCreatives.length > 0 ? (
            <div className="space-y-1.5">
              {data.ads.sampleCreatives.map((c) => (
                <p key={c.id} className="text-xs text-muted-foreground line-clamp-2">
                  <span className="font-medium text-foreground">{c.advertiserName}:</span>{" "}
                  {c.bodyText ?? "—"}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {data?.tiktok ? (
        <div className="rounded-lg border border-border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Video className="w-4 h-4 text-primary" />
            TikTok intel
            <Badge variant="secondary" className="text-[10px]">
              {data.tiktok.source === "searchapi" ? "Ad Library" : "Organic"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.tiktok.activeAdCount} creatives from {data.tiktok.advertiserCount} accounts (cached).
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Sign up for live refresh, competitor spy, and full Social Kit generation.
        </p>
        <Link href={getRegisterUrl()}>
          <Button size="sm">Create free account</Button>
        </Link>
      </div>
    </div>
  );
}
