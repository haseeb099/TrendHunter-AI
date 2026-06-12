import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendWindowSelector } from "@/components/intelligence/TrendWindowSelector";
import { useTrendWindow } from "@/_core/hooks/useTrendWindow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";
import type { ProductDrawerTab } from "@/components/product-workspace/types";
import { MarketDigestCard } from "@/components/intelligence/MarketDigestCard";
import { KeywordExplorer } from "@/components/intelligence/KeywordExplorer";
import { ProductIntelligenceHub } from "@/components/intelligence/ProductIntelligenceHub";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { getDashboardPath } from "@/config/dashboardNav";
import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { IntelAlertsPanel } from "@/components/intelligence/IntelAlertsPanel";
import { ProviderStatusBar } from "@/components/intelligence/ProviderStatusBar";
import { DataCoverageBanner } from "@/components/intelligence/DataCoverageBanner";
import { ArrowRight, Info, LineChart, Radar, ShoppingBag, Sparkles, Video } from "lucide-react";
import { Link } from "wouter";

export default function IntelligenceCenter() {
  const [region, setRegion] = useState<RegionCode>("US");
  const [category, setCategory] = useState<string | undefined>();
  const { window: trendWindow, setWindow: setTrendWindow } = useTrendWindow();
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [detailProduct, setDetailProduct] = useState<ProductSearchResult | null>(null);
  const [drawerTab, setDrawerTab] = useState<ProductDrawerTab>("overview");

  const categoriesQuery = trpc.trending.getCategories.useQuery({ region });
  const digestQuery = trpc.intelligence.getMarketDigest.useQuery({ region, category });
  const trendingQuery = trpc.trending.getFeed.useQuery({
    region,
    category,
    timeframe: trendWindow,
  });

  const handleAnalyze = (kw: string) => {
    setActiveKeyword(kw);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Market Intelligence Center"
        description="Google Trends, Meta Ad Library, and trending products — explained in plain language. No more jumping between websites."
        badge={
          digestQuery.data?.lastIngestAt ? (
            <Badge variant="outline" className="text-[10px]">
              Updated {new Date(digestQuery.data.lastIngestAt).toLocaleDateString()}
            </Badge>
          ) : null
        }
      />

      <ProviderStatusBar />

      <DataCoverageBanner pageId="intel-center" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SourceCard
          icon={LineChart}
          title="Google Trends"
          desc="See if people are searching more or less for a product. Rising = growing demand."
          href={getDashboardPath("trendpulse")}
        />
        <SourceCard
          icon={Radar}
          title="Meta Ad Library"
          desc="See how many Facebook/Instagram ads competitors run. Fewer ads can mean less competition."
          href={getDashboardPath("adradar")}
        />
        <SourceCard
          icon={Video}
          title="TikTok Ads"
          desc="Brands running TikTok ads in your niche — creative angles and advertiser counts."
          href={getDashboardPath("tiktokradar")}
        />
        <SourceCard
          icon={ShoppingBag}
          title="TikTok Shop"
          desc="Viral products on TikTok Shop commerce — spot SKUs before they saturate."
          href={getDashboardPath("tiktokshop")}
        />
        <SourceCard
          icon={Sparkles}
          title="Trending products"
          desc="Hot items across marketplaces in your region — save to pipeline or dig into intel."
          href={getDashboardPath("search")}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card/40 p-3 sm:p-4">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Category
          </span>
          <Select
            value={category ?? "all"}
            onValueChange={(v) => setCategory(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoriesQuery.data?.categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Trend period
          </span>
          <TrendWindowSelector
            value={trendWindow}
            onChange={setTrendWindow}
            className="w-full min-w-[220px]"
          />
        </div>
      </div>

      <KeywordExplorer
        keyword={keyword}
        region={region}
        onKeywordChange={(kw) => {
          setKeyword(kw);
          setActiveKeyword(kw);
        }}
        onRegionChange={setRegion}
        suggestions={
          digestQuery.data?.rising.map((r) => r.keyword) ??
          digestQuery.data?.metaHot.map((r) => r.keyword)
        }
      />

      <IntelAlertsPanel
        keyword={activeKeyword || keyword}
        region={region}
        category={category}
        onCategoryChange={setCategory}
      />

      {activeKeyword ? (
        <section className="card-elevated p-5 sm:p-6">
          <h2 className="font-display font-semibold text-lg mb-4 capitalize">
            Deep dive: {activeKeyword}
          </h2>
          <ProductIntelligenceHub
            keyword={activeKeyword}
            region={region}
            showDeepLinks
          />
        </section>
      ) : null}

      {digestQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Could not load market digest. {digestQuery.error.message}
          </AlertDescription>
        </Alert>
      ) : null}

      {digestQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <DigestSection
            title="Rising search demand"
            hint="Keywords where Google Trends shows growing interest — good candidates to research."
            items={digestQuery.data?.rising ?? []}
            emptyMessage="No rising keywords cached yet. Run daily ingest or search a product in Google Trends."
            onSelect={(kw) => {
              setKeyword(kw);
              handleAnalyze(kw);
            }}
            activeKeyword={activeKeyword}
            viewAllHref={`${getDashboardPath("trendpulse")}?region=${region}`}
          />

          <DigestSection
            title="Most advertised on Meta"
            hint="Keywords with the highest active ad counts — competitive niches to study or differentiate."
            items={digestQuery.data?.metaHot ?? []}
            emptyMessage="No Meta ad data yet. Add META_ACCESS_TOKEN and run ingest."
            onSelect={(kw) => {
              setKeyword(kw);
              handleAnalyze(kw);
            }}
            activeKeyword={activeKeyword}
            showAds
            viewAllHref={`${getDashboardPath("adradar")}?region=${region}`}
          />

          <DigestSection
            title="Opportunities"
            hint="Rising demand with relatively few competitor ads — sweet spot for testing."
            items={digestQuery.data?.opportunities ?? []}
            emptyMessage="No opportunity matches yet — check back after ingest populates trend + ad data."
            onSelect={(kw) => {
              setKeyword(kw);
              handleAnalyze(kw);
            }}
            activeKeyword={activeKeyword}
            viewAllHref={getDashboardPath("intel")}
          />
        </>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display font-semibold text-lg">Trending products</h2>
            <p className="text-sm text-muted-foreground">
              What&apos;s selling now in {region}
              {category
                ? ` · ${categoriesQuery.data?.categories.find((c) => c.value === category)?.label ?? category}`
                : ""}{" "}
              — open any product for full intel in the side panel.
            </p>
          </div>
          <Link href={getDashboardPath("search")}>
            <Button variant="outline" size="sm">
              Open Discover
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        {trendingQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Could not load trending products. {trendingQuery.error.message}
            </AlertDescription>
          </Alert>
        ) : trendingQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {trendingQuery.data?.results.slice(0, 6).map((product) => (
              <ProductCard
                key={`${product.platform}-${product.id}`}
                product={product}
                showTrendBadge
                onViewDetails={(p) => {
                  setDetailProduct(p);
                  setDrawerTab("overview");
                }}
              />
            ))}
          </div>
        )}
      </section>

      <ProductDetailDrawer
        product={detailProduct}
        open={Boolean(detailProduct)}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        initialTab={drawerTab}
      />

      <AlertBox />
    </div>
  );
}

function SourceCard({
  icon: Icon,
  title,
  desc,
  href,
}: {
  icon: typeof LineChart;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="card-elevated p-4 h-full hover:border-primary/30 transition-colors cursor-pointer group">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
          <Icon className="w-4 h-4" />
        </div>
        <p className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}

function DigestSection({
  title,
  hint,
  items,
  emptyMessage,
  onSelect,
  activeKeyword,
  showAds,
  viewAllHref,
}: {
  title: string;
  hint: string;
  items: Parameters<typeof MarketDigestCard>[0]["item"][];
  emptyMessage: string;
  onSelect: (kw: string) => void;
  activeKeyword: string;
  showAds?: boolean;
  viewAllHref: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-semibold text-lg">{title}</h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        <Link href={viewAllHref}>
          <Button variant="ghost" size="sm">
            View all
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      {items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <MarketDigestCard
              key={`${item.keyword}-${item.source}`}
              item={item}
              onSelect={onSelect}
              selected={activeKeyword.toLowerCase() === item.keyword.toLowerCase()}
              showAds={showAds}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

function AlertBox() {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 flex gap-3 text-sm">
      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div className="text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Cached data is free.</strong> Browse trends and ads
          without spending credits. Use live refresh (1–2 credits) only when you need the latest
          pull from Google or Meta.
        </p>
        <p>Data refreshes daily via ingest. Pro users can also trigger live scans per keyword.</p>
      </div>
    </div>
  );
}
