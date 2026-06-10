import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { KeywordExplorer } from "@/components/intelligence/KeywordExplorer";
import { TrendPulsePanel } from "@/components/intelligence/TrendPulsePanel";
import { MarketDigestCard } from "@/components/intelligence/MarketDigestCard";
import { IntelligenceVerdict } from "@/components/intelligence/IntelligenceVerdict";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RegionCode } from "@shared/searchTypes";
import { LineChart } from "lucide-react";

export default function TrendPulsePage() {
  const [location] = useLocation();
  const [region, setRegion] = useState<RegionCode>("US");
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");

  const listQuery = trpc.intelligence.listTrendKeywords.useQuery({ region });
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Google Trends"
        description="Understand search demand in plain language — is interest rising, stable, or falling? What related queries are spiking?"
        badge={
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <LineChart className="w-3.5 h-3.5" />
            Powered by SerpAPI · cached daily
          </span>
        }
      />

      <div className="rounded-xl border border-border bg-muted/15 p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">How to read this:</strong> The momentum score (0–100)
          combines recent vs older search interest. <em>Rising</em> means more people are searching
          than 90 days ago. Use rising queries as ad angles and product titles.
        </p>
      </div>

      {listQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load trend keywords. {listQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <KeywordExplorer
        keyword={keyword}
        region={region}
        onKeywordChange={setKeyword}
        onRegionChange={setRegion}
        onSearch={() => setActiveKeyword(keyword.trim())}
        suggestions={listQuery.data?.map((i) => i.keyword)}
        placeholder="Search any product or niche keyword…"
      />

      {activeKeyword ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <section className="card-elevated p-5 sm:p-6 space-y-6">
            <h2 className="font-display font-semibold capitalize">{activeKeyword}</h2>
            <IntelligenceVerdict summary={intelQuery.data} />
            <TrendPulsePanel keyword={activeKeyword} region={region} />
          </section>
          <aside className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Also trending in {region}
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
                showAds={false}
              />
            ))}
          </aside>
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="font-display font-semibold">Tracked keywords — {region}</h2>
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
                  showAds={false}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No trend data cached for this region. Run daily ingest or analyze any keyword above.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
