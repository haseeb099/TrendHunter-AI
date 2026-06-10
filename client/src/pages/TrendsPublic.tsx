import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import type { RegionCode } from "@shared/searchTypes";
import { trpc } from "@/lib/trpc";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PublicTrendDisplay } from "@/components/intelligence/PublicTrendDisplay";
import { TikTokIntelPanel } from "@/components/intelligence/TikTokIntelPanel";
import { getRegisterUrl } from "@/const";
import { slugToKeyword } from "@shared/keywordUtils";

export default function TrendsPublic() {
  const [, params] = useRoute("/trends/:slug");
  const slug = params?.slug ?? "";
  const keyword = slugToKeyword(slug);
  const [region, setRegion] = useState<RegionCode>("US");

  useEffect(() => {
    const reg = new URLSearchParams(window.location.search).get("region")?.toUpperCase();
    if (reg === "US" || reg === "UK" || reg === "EU" || reg === "GLOBAL") {
      setRegion(reg);
    }
  }, [slug]);

  useEffect(() => {
    if (keyword) {
      document.title = `${keyword} — Trending Dropshipping Product | DropHunter AI`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute(
          "content",
          `See Google Trends and Meta ad activity for "${keyword}" — free product research data from DropHunter AI.`
        );
      }
    }
  }, [keyword]);

  const trendQuery = trpc.intelligence.getPublicTrend.useQuery(
    { keyword, region },
    { enabled: Boolean(keyword.trim()), retry: 1 }
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6 flex items-center justify-between gap-4">
        <Link href="/">
          <AppLogo />
        </Link>
        <Link href={getRegisterUrl()}>
          <Button size="sm">Start free trial</Button>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-8">
        <div>
          <Badge variant="secondary" className="mb-3">
            Public trend report
          </Badge>
          <h1 className="font-display text-3xl sm:text-4xl font-bold capitalize">{keyword}</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Demand signals and competitor ad activity for dropshippers — updated daily.
          </p>
          {trendQuery.data?.updatedAt ? (
            <p className="text-xs text-muted-foreground mt-2">
              Data as of {new Date(trendQuery.data.updatedAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>

        {trendQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : trendQuery.error ? (
          <div className="card-elevated p-6 text-sm text-muted-foreground">
            Could not load trend data. Try again later or sign up for full research tools.
          </div>
        ) : (
          <div className="card-elevated p-6 space-y-8">
            <PublicTrendDisplay trend={trendQuery.data?.trend} />
            {keyword ? (
              <div className="border-t border-border pt-6">
                <h2 className="font-display font-semibold mb-4">TikTok Ad activity</h2>
                <TikTokIntelPanel keyword={keyword} region={region} publicMode />
              </div>
            ) : null}
            {trendQuery.data?.ads ? (
              <div className="border-t border-border pt-6">
                <h2 className="font-display font-semibold mb-2">Meta Ad activity</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {trendQuery.data.ads.activeAdCount} active ads from{" "}
                  {trendQuery.data.ads.advertiserCount} advertisers
                </p>
                <div className="space-y-2">
                  {trendQuery.data.ads.sampleCreatives.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium">{c.advertiserName}</p>
                      <p className="text-muted-foreground line-clamp-2">{c.bodyText}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <h2 className="font-display text-xl font-semibold">Research this niche in DropHunter</h2>
          <p className="text-sm text-muted-foreground">
            Validate products, scan competitors, and build your pipeline with AI — cached data free,
            live refresh with credits.
          </p>
          <Link href={getRegisterUrl()}>
            <Button>Get started free</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
