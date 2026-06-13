import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { KeywordExplorer } from "@/components/intelligence/KeywordExplorer";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";
import { formatProductPrice } from "@shared/searchTypes";
import type { RegionCode } from "@shared/searchTypes";
import { ShoppingBag, Video } from "lucide-react";

export default function TikTokShopPage() {
  const [location] = useLocation();
  const [region, setRegion] = useState<RegionCode>("US");
  const [keyword, setKeyword] = useState("trending");
  const [activeKeyword, setActiveKeyword] = useState("trending");

  const trendsQuery = trpc.intelligence.getTikTokShopTrends.useQuery(
    { keyword: activeKeyword, region, limit: 24 },
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

  const runSearch = () => {
    setActiveKeyword(keyword.trim() || "trending");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="TikTok Shop Trends"
        description="Products trending on TikTok Shop — separate from TikTok Ads radar. Spot viral SKUs before they saturate."
        badge={
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Video className="w-3.5 h-3.5" />
            TikTok Shop search
          </span>
        }
      />

      <div className="rounded-xl border border-border bg-muted/15 p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">How to read this:</strong> Rising TikTok Shop
          listings signal viral demand on short-form commerce. Cross-check with Google Trends and
          Meta ads before committing inventory.
        </p>
      </div>

      <KeywordExplorer
        keyword={keyword}
        region={region}
        onKeywordChange={setKeyword}
        onRegionChange={setRegion}
        onSearch={runSearch}
      />

      {trendsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Could not load TikTok Shop trends. {trendsQuery.error.message}
          </AlertDescription>
        </Alert>
      ) : trendsQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : trendsQuery.data?.products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trendsQuery.data.products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-video bg-muted/30 relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2 text-[10px] capitalize">
                  {product.platform}
                </Badge>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-sm font-medium line-clamp-2 leading-snug">{product.title}</p>
                <p className="font-display font-semibold tabular-nums">
                  {formatProductPrice(product.price)}
                </p>
                {product.dataLabel ? (
                  <DataFreshnessBadge state={product.dataState} label={product.dataLabel} />
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {trendsQuery.data?.message ??
            "No TikTok Shop products found for this keyword. Try a broader search term."}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">TikTok Shop search · Region {region}</p>
    </div>
  );
}
