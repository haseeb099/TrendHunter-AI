import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { KeywordExplorer } from "@/components/intelligence/KeywordExplorer";
import { TikTokIntelPanel } from "@/components/intelligence/TikTokIntelPanel";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RegionCode } from "@shared/searchTypes";
import type { MarketDigestItem } from "@shared/intelligenceTypes";
import { Video } from "lucide-react";

export default function TikTokRadarPage() {
  const [location] = useLocation();
  const [region, setRegion] = useState<RegionCode>("US");
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");

  const listQuery = trpc.intelligence.listTikTokKeywords.useQuery({ region });

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
        title="TikTok Ad Library"
        description="See which brands are running TikTok ads in your niche — creative angles, advertiser counts, and gaps to exploit."
        badge={
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Video className="w-3.5 h-3.5" />
            TikTok Ads Library API
          </span>
        }
      />

      <div className="rounded-xl border border-border bg-muted/15 p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">How to read this:</strong> More active TikTok ads
          usually means hotter competition on short-form. Pair with Google Trends to spot rising
          demand with lighter ad pressure.
        </p>
      </div>

      {listQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Could not load TikTok keywords. {listQuery.error.message}
          </AlertDescription>
        </Alert>
      ) : null}

      <KeywordExplorer
        keyword={keyword}
        region={region}
        onKeywordChange={setKeyword}
        onRegionChange={setRegion}
        onSearch={() => setActiveKeyword(keyword.trim())}
        suggestions={listQuery.data?.map((i) => i.keyword)}
        placeholder="Search niche or product keyword for TikTok ads…"
      />

      {activeKeyword ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <section className="card-elevated p-5 sm:p-6 space-y-6">
            <h2 className="font-display font-semibold capitalize">{activeKeyword}</h2>
            <TikTokIntelPanel keyword={activeKeyword} region={region} />
          </section>
          <aside className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Most TikTok ads in {region}
            </p>
            {listQuery.data?.slice(0, 8).map((item) => (
              <TikTokKeywordCard
                key={item.keyword}
                item={item}
                selected={item.keyword.toLowerCase() === activeKeyword.toLowerCase()}
                onSelect={(kw) => {
                  setKeyword(kw);
                  setActiveKeyword(kw);
                }}
              />
            ))}
          </aside>
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="font-display font-semibold">Keywords with most TikTok ads — {region}</h2>
          {listQuery.isLoading ? (
            <Spinner className="mx-auto" />
          ) : listQuery.data && listQuery.data.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listQuery.data.map((item) => (
                <TikTokKeywordCard
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
              No TikTok ad data yet for this region. Search a keyword above or scan live (2 credits) for the latest results.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function TikTokKeywordCard({
  item,
  onSelect,
  selected,
}: {
  item: Pick<MarketDigestItem, "keyword" | "activeAdCount" | "advertiserCount" | "pending">;
  onSelect: (keyword: string) => void;
  selected?: boolean;
}) {
  return (
    <Card
      className={`p-3 cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/30 ${
        selected ? "border-primary bg-primary/5" : ""
      }`}
      onClick={() => onSelect(item.keyword)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.keyword);
        }
      }}
    >
      <p className="font-medium capitalize text-sm truncate">{item.keyword}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {item.pending ? (
          <Badge variant="outline" className="text-[10px]">
            Loading…
          </Badge>
        ) : (
          <>
            <Badge variant="secondary" className="text-[10px]">
              {item.activeAdCount ?? 0} ads
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {item.advertiserCount ?? 0} advertisers
            </Badge>
          </>
        )}
      </div>
    </Card>
  );
}
