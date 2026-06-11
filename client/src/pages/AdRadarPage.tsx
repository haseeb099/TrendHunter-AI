import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { KeywordExplorer } from "@/components/intelligence/KeywordExplorer";
import { AdRadarPanel } from "@/components/intelligence/AdRadarPanel";
import { MarketDigestCard } from "@/components/intelligence/MarketDigestCard";
import { IntelligenceVerdict } from "@/components/intelligence/IntelligenceVerdict";
import { DataCoverageBanner } from "@/components/intelligence/DataCoverageBanner";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RegionCode } from "@shared/searchTypes";
import { Radar } from "lucide-react";

export default function AdRadarPage() {
  const [location] = useLocation();
  const [region, setRegion] = useState<RegionCode>("US");
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");

  const configQuery = trpc.system.getConfig.useQuery();
  const listQuery = trpc.intelligence.listAdKeywords.useQuery({ region });
  const intelQuery = trpc.intelligence.getProductIntel.useQuery(
    { keyword: activeKeyword, region },
    { enabled: Boolean(activeKeyword.trim()) }
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kw = params.get("keyword") ?? params.get("q");
    const reg = params.get("region");
    if (kw) {
      setKeyword(kw);
      setActiveKeyword(kw);
    }
    if (reg) setRegion(reg as RegionCode);
  }, [location]);

  const metaConfigured = configQuery.data?.dataPlatform?.metaAdsConfigured ?? false;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meta Ad Library"
        description="See competitor Facebook & Instagram ads without leaving DropHunter — creative hooks, advertiser counts, and market gaps."
        badge={
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radar className="w-3.5 h-3.5" />
            Meta Ad Library API
          </span>
        }
      />

      <DataCoverageBanner pageId="ad-radar" />

      {!metaConfigured ? (
        <Alert>
          <AlertDescription>
            Add <code className="text-xs">META_ACCESS_TOKEN</code> to your environment to enable
            live Meta Ad Library scans. Cached data appears after daily ingest.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-xl border border-border bg-muted/15 p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">How to read this:</strong> High active ad counts mean
          more competitors are spending on Meta. Study their hooks, then differentiate. Low counts
          with rising Google Trends = opportunity.
        </p>
      </div>

      {listQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load ad keywords. {listQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <KeywordExplorer
        keyword={keyword}
        region={region}
        onKeywordChange={setKeyword}
        onRegionChange={setRegion}
        onSearch={() => setActiveKeyword(keyword.trim())}
        suggestions={listQuery.data?.map((i) => i.keyword)}
        placeholder="Search niche or product keyword for ads…"
      />

      {activeKeyword ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <section className="card-elevated p-5 sm:p-6 space-y-6">
            <h2 className="font-display font-semibold capitalize">{activeKeyword}</h2>
            <IntelligenceVerdict summary={intelQuery.data} stale={intelQuery.data?.stale} />
            <AdRadarPanel keyword={activeKeyword} region={region} />
          </section>
          <aside className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Most ads in {region}
            </p>
            {listQuery.data?.slice(0, 8).map((item) => (
              <MarketDigestCard
                key={item.keyword}
                item={item}
                onSelect={(kw) => {
                  setKeyword(kw);
                  setActiveKeyword(kw);
                }}
                selected={item.keyword.toLowerCase() === activeKeyword.toLowerCase()}
              />
            ))}
          </aside>
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="font-display font-semibold">Keywords with most ads — {region}</h2>
          {listQuery.isLoading ? (
            <Spinner className="mx-auto" />
          ) : listQuery.data && listQuery.data.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listQuery.data.map((item) => (
                <MarketDigestCard
                  key={item.keyword}
                  item={item}
                  onSelect={(kw) => {
                    setKeyword(kw);
                    setActiveKeyword(kw);
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No ad snapshots cached yet. Configure Meta token and run ingest, or scan live (2 credits).
            </p>
          )}
        </section>
      )}
    </div>
  );
}
