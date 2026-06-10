import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import type { ProductOffer } from "@shared/searchTypes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { ProviderStatusBar } from "@/components/ProviderStatusBar";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";
import type { ProductDrawerTab } from "@/components/product-workspace/types";
import type { ProductValidationResult } from "@/components/product-workspace/types";
import { SearchFilterDrawer } from "@/components/SearchFilterDrawer";
import { Search, Filter, Info, Sparkles, Compass, Zap } from "lucide-react";
import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import type { ProductHuntFilters, ProductSearchResult, RegionCode } from "@shared/searchTypes";

type SearchPlatform = "all" | "ebay" | "amazon" | "shopify" | "tiktok";

export default function ProductSearch() {
  const [location] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"discover" | "search">("discover");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [platform, setPlatform] = useState<SearchPlatform>("all");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [huntFilters, setHuntFilters] = useState<ProductHuntFilters>({
    region: "US",
    sort: "trend_score",
  });
  const [detailProduct, setDetailProduct] = useState<ProductSearchResult | null>(null);
  const [drawerTab, setDrawerTab] = useState<ProductDrawerTab>("overview");
  const [liveSearch, setLiveSearch] = useState(false);

  const openProductDrawer = (product: ProductSearchResult, tab: ProductDrawerTab = "overview") => {
    setDetailProduct(product);
    setDrawerTab(tab);
  };

  const filterOptions = trpc.search.getFilterOptions.useQuery();
  const providersQuery = trpc.search.getProviderStatus.useQuery();
  const savedSearchesQuery = trpc.search.getSavedSearches.useQuery(undefined, {
    enabled: activeTab === "search",
  });
  const saveSearchMutation = trpc.search.saveSearch.useMutation({
    onSuccess: async () => {
      await utils.search.getSavedSearches.invalidate();
      toast.success("Search saved");
    },
  });
  const deleteSavedSearchMutation = trpc.search.deleteSavedSearch.useMutation({
    onSuccess: async () => {
      await utils.search.getSavedSearches.invalidate();
      toast.success("Saved search removed");
    },
  });

  const [regionInitialized, setRegionInitialized] = useState(false);
  useEffect(() => {
    if (!regionInitialized && filterOptions.data?.defaultRegion) {
      setHuntFilters((f) => ({ ...f, region: filterOptions.data!.defaultRegion as RegionCode }));
      setRegionInitialized(true);
    }
  }, [filterOptions.data?.defaultRegion, regionInitialized]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q?.trim()) {
      setQuery(q.trim());
      setSubmittedQuery(q.trim());
      setActiveTab("search");
    }
  }, [location]);

  const mergedFilters = useMemo<ProductHuntFilters>(
    () => ({
      ...huntFilters,
      priceRange: { min: priceMin, max: priceMax },
    }),
    [huntFilters, priceMin, priceMax]
  );

  const categoriesQuery = trpc.trending.getCategories.useQuery(
    { region: huntFilters.region },
    { enabled: activeTab === "discover" }
  );

  const recordDiscoverView = trpc.analytics.recordDiscoverView.useMutation();

  const trendingQuery = trpc.trending.getFeed.useQuery(
    { region: huntFilters.region, category: huntFilters.category },
    { enabled: activeTab === "discover" }
  );

  useEffect(() => {
    if (activeTab === "discover" && trendingQuery.data) {
      recordDiscoverView.mutate({
        region: huntFilters.region,
        category: huntFilters.category,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record per feed fetch
  }, [activeTab, trendingQuery.dataUpdatedAt]);

  const searchQuery = trpc.search.searchProducts.useQuery(
    {
      query: submittedQuery,
      platform,
      filters: mergedFilters,
      live: liveSearch,
    },
    { enabled: activeTab === "search" && submittedQuery.length > 0, retry: false }
  );

  useEffect(() => {
    if (searchQuery.data?.creditsUsed && searchQuery.data.creditsUsed > 0) {
      void utils.credits.getWallet.invalidate();
    }
  }, [searchQuery.data?.creditsUsed, searchQuery.dataUpdatedAt, utils.credits.getWallet]);

  const addToWatchlist = trpc.watchlist.addToWatchlist.useMutation({
    onSuccess: async () => {
      await utils.watchlist.getWatchlist.invalidate();
      toast.success("Added to watchlist");
    },
    onError: (error) => toast.error(error.message || "Failed to add to watchlist"),
  });

  const addToPipeline = trpc.pipeline.createPipelineItem.useMutation({
    onSuccess: async () => {
      await utils.pipeline.getPipelineItems.invalidate();
      await utils.analytics.getDashboardMetrics.invalidate();
      toast.success("Added to pipeline");
    },
    onError: (error) => toast.error(error.message || "Failed to add to pipeline"),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setActiveTab("search");
    setSubmittedQuery(trimmed);
  };

  const handleAddToWatchlist = (product: ProductSearchResult, offer?: ProductOffer) => {
    addToWatchlist.mutate({
      productId: product.id,
      productTitle: product.title,
      productImage: product.image ?? undefined,
      platform: product.platform,
      price: product.price,
      sourceUrl: product.sourceUrl ?? undefined,
      region: product.region,
      supplierPlatform: offer?.supplierPlatform,
      landedCost: offer?.landedCost,
      notes: offer
        ? `Best offer: ${offer.supplierPlatform} ${offer.warehouse ?? ""} · landed ${offer.landedCost.toFixed(2)}`
        : undefined,
    });
  };

  const handleAddToPipeline = (product: ProductSearchResult, offer?: ProductOffer) => {
    const estimatedProfit =
      offer && product.price > 0 ? product.price - offer.landedCost : undefined;
    addToPipeline.mutate({
      productId: product.id,
      productTitle: product.title,
      productImage: product.image ?? undefined,
      platform: product.platform,
      price: product.price,
      sourceUrl: product.sourceUrl ?? undefined,
      region: product.region,
      supplierPlatform: offer?.supplierPlatform,
      landedCost: offer?.landedCost,
      estimatedProfit,
      notes: offer
        ? `Offer: ${offer.supplierPlatform} ${offer.warehouse ?? ""} · SKU ${offer.supplierSku ?? offer.id} · landed ${offer.landedCost.toFixed(2)}`
        : undefined,
      stage: "testing",
    });
  };

  const handlePipelineWithValidation = ({
    product,
    validation,
    offer,
  }: {
    product: ProductSearchResult;
    validation: ProductValidationResult;
    offer?: ProductOffer;
  }) => {
    const estimatedProfit =
      offer && product.price > 0 ? product.price - offer.landedCost : undefined;
    addToPipeline.mutate({
      productId: product.id,
      productTitle: product.title,
      productImage: product.image ?? undefined,
      platform: product.platform,
      price: product.price,
      sourceUrl: product.sourceUrl ?? undefined,
      region: product.region,
      supplierPlatform: offer?.supplierPlatform,
      landedCost: offer?.landedCost,
      estimatedProfit,
      validationScore: validation.overallScore,
      stage: validation.overallScore >= 75 ? "scaling" : "testing",
      notes: `AI validation: trend ${validation.trendScore}, saturation ${validation.saturationScore}${offer ? ` · ${offer.supplierPlatform} landed ${offer.landedCost.toFixed(2)}` : ""}`,
    });
  };

  const handleSaveSearch = () => {
    if (!submittedQuery.trim()) {
      toast.error("Run a search first");
      return;
    }
    saveSearchMutation.mutate({
      query: submittedQuery,
      filters: { ...mergedFilters, platform },
    });
  };

  const loadSavedSearch = (query: string, filters: unknown) => {
    setQuery(query);
    setSubmittedQuery(query);
    setActiveTab("search");
    const f = (filters ?? {}) as ProductHuntFilters & { platform?: SearchPlatform };
    if (f.platform) setPlatform(f.platform);
    if (f.priceRange) {
      setPriceMin(f.priceRange.min);
      setPriceMax(f.priceRange.max);
    }
    const { platform: _p, ...rest } = f;
    setHuntFilters(rest);
  };

  const activeData = activeTab === "discover" ? trendingQuery.data : searchQuery.data;
  const isLoading = activeTab === "discover" ? trendingQuery.isFetching : searchQuery.isFetching;
  const activeError = activeTab === "discover" ? trendingQuery.error : searchQuery.error;

  const activeProviders = providersQuery.data?.filter((p) => p.configured && p.id !== "mock") ?? [];
  const freeProviders = activeProviders.filter((p) => p.tier === "free");
  const paidProviders = activeProviders.filter((p) => p.tier === "paid");
  const tiktokConfigured = providersQuery.data?.find((p) => p.id === "tiktok")?.configured ?? false;

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (huntFilters.region) chips.push(`Region: ${huntFilters.region}`);
    if (huntFilters.category) chips.push(`Category: ${huntFilters.category}`);
    if (huntFilters.shipFrom?.length) chips.push(`Ship: ${huntFilters.shipFrom.join(", ")}`);
    if (huntFilters.minRating) chips.push(`Rating ≥ ${huntFilters.minRating}`);
    if (huntFilters.maxShippingDays) chips.push(`Ship ≤ ${huntFilters.maxShippingDays}d`);
    return chips;
  }, [huntFilters]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Product Search"
        description="Discover and search across free catalogs, TikTok, CJ suppliers — plus paid sources when keys are added."
        badge={
          activeProviders.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap">
              {freeProviders.length > 0 ? (
                <Badge variant="secondary" className="text-success border-success/20 bg-success/10">
                  {freeProviders.length} free
                </Badge>
              ) : null}
              {paidProviders.length > 0 ? (
                <Badge variant="secondary" className="text-primary">
                  {paidProviders.length} live
                </Badge>
              ) : null}
            </div>
          ) : (
            <Badge variant="outline" className="text-warning">
              Demo mode
            </Badge>
          )
        }
      />

      <ProviderStatusBar providers={providersQuery.data} isLoading={providersQuery.isLoading} />

      {providersQuery.data && activeProviders.length === 0 && (
        <Alert className="border-border bg-muted/40">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-muted-foreground">
            No data sources active. Free catalogs should load automatically — restart the server if
            this persists. Add eBay / SerpAPI when approved.
          </AlertDescription>
        </Alert>
      )}

      {providersQuery.data && freeProviders.length > 0 && paidProviders.length === 0 && (
        <Alert className="border-success/25 bg-success/5">
          <Info className="h-4 w-4 text-success" />
          <AlertDescription>
            Running on free catalogs (DummyJSON, FakeStore) plus your
            configured TikTok/CJ keys. SerpAPI is paused — re-enable when you have quota. eBay &
            AliExpress will activate when approved.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "discover" | "search")}>
        <TabsList>
          <TabsTrigger value="discover">
            <Compass className="w-4 h-4 mr-2" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="w-4 h-4 mr-2" />
            Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-6 mt-6">
          {trendingQuery.data && !trendingQuery.isFetching ? (
            <div className="flex justify-end">
              <DataFreshnessBadge
                dataMode={trendingQuery.data.dataMode ?? (trendingQuery.data.isDemo ? "demo" : "cached")}
                cachedAt={trendingQuery.data.cachedAt}
                stale={trendingQuery.data.stale}
              />
            </div>
          ) : null}
          {categoriesQuery.data?.categories && categoriesQuery.data.categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={!huntFilters.category ? "default" : "outline"}
                onClick={() => setHuntFilters((f) => ({ ...f, category: undefined }))}
              >
                All categories
              </Button>
              {categoriesQuery.data.categories.map((c) => (
                <Button
                  key={c.value}
                  type="button"
                  size="sm"
                  variant={huntFilters.category === c.value ? "default" : "outline"}
                  onClick={() => setHuntFilters((f) => ({ ...f, category: c.value }))}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          ) : null}

          <Card className="surface-elevated p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Region</Label>
                <Select
                  value={huntFilters.region ?? filterOptions.data?.defaultRegion ?? "US"}
                  onValueChange={(v) => {
                    setHuntFilters((f) => ({ ...f, region: v as RegionCode }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.data?.regions.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setFiltersOpen(true)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  More filters
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <Card className="surface-elevated p-0 overflow-hidden">
            <form onSubmit={handleSearch}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 sm:p-5 border-b border-border bg-muted/20">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search products (e.g., wireless headphones)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="input-elegant pl-10 h-11 bg-card"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!submittedQuery || saveSearchMutation.isPending}
                  className="h-11 shrink-0"
                  onClick={handleSaveSearch}
                >
                  Save search
                </Button>
                <div className="flex items-center gap-2 shrink-0 rounded-lg border border-border px-3 h-11 bg-card">
                  <Switch
                    id="live-search"
                    checked={liveSearch}
                    onCheckedChange={setLiveSearch}
                  />
                  <Label htmlFor="live-search" className="text-xs cursor-pointer flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    Live (1 credit)
                  </Label>
                </div>
                <Button
                  type="submit"
                  disabled={searchQuery.isFetching}
                  className="h-11 px-6 shrink-0 lg:min-w-[132px]"
                >
                  {searchQuery.isFetching ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 sm:p-5">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={platform} onValueChange={(v) => setPlatform(v as SearchPlatform)}>
                    <SelectTrigger className="w-full h-10 input-elegant">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="ebay">eBay</SelectItem>
                      <SelectItem value="amazon">Amazon</SelectItem>
                      <SelectItem value="shopify">Shopify / Retail</SelectItem>
                      <SelectItem value="tiktok">
                        {tiktokConfigured ? "TikTok Shop" : "TikTok Shop (demo)"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Min price</Label>
                  <Input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(Number(e.target.value))}
                    className="input-elegant h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max price</Label>
                  <Input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="input-elegant h-10"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 border-border"
                    onClick={() => setFiltersOpen(true)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          {savedSearchesQuery.data && savedSearchesQuery.data.length > 0 ? (
            <Card className="surface-elevated p-4">
              <p className="text-sm font-medium mb-3">Saved searches</p>
              <div className="flex flex-wrap gap-2">
                {savedSearchesQuery.data.map((s) => (
                  <div key={s.id} className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => loadSavedSearch(s.query, s.filters)}
                    >
                      {s.query}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => deleteSavedSearchMutation.mutate({ id: s.id })}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      {activeFilterChips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <Badge key={chip} variant="secondary">
              {chip}
            </Badge>
          ))}
        </div>
      ) : null}

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="text-center space-y-3">
            <Spinner className="w-8 h-8 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              {activeTab === "discover" ? "Loading trending products..." : "Searching marketplaces..."}
            </p>
          </div>
        </div>
      )}

      {activeError && (
        <Alert variant="destructive">
          <AlertDescription>{activeError.message}</AlertDescription>
        </Alert>
      )}

      {activeData?.warnings?.map((warning) => (
        <Alert key={warning} className="border-warning/30 bg-warning/5">
          <Info className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ))}

      {activeData && !isLoading && (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-display text-xl font-semibold">
              {activeData.results.length} result{activeData.results.length !== 1 ? "s" : ""}
            </h2>
            <div className="flex gap-2 flex-wrap items-center">
              <DataFreshnessBadge
                dataMode={activeData.dataMode ?? (activeData.isDemo ? "demo" : "cached")}
                cachedAt={activeData.cachedAt}
                stale={activeData.stale}
                creditsUsed={activeData.creditsUsed}
              />
              {!activeData.isDemo && activeData.sources.length > 0
                ? activeData.sources.map((source) => (
                    <Badge key={source} variant="outline" className="text-[10px] capitalize">
                      {source.replace("_", " ")}
                    </Badge>
                  ))
                : null}
            </div>
          </div>

          {activeData.results.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {activeData.results.map((product) => (
                <ProductCard
                  key={`${product.platform}-${product.id}`}
                  product={product}
                  onSave={handleAddToWatchlist}
                  onPipeline={handleAddToPipeline}
                  onViewDetails={openProductDrawer}
                  savePending={addToWatchlist.isPending}
                  pipelinePending={addToPipeline.isPending}
                  showTrendBadge={activeTab === "discover"}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="No products found"
              description="Try different keywords, region, or widen your filters."
            />
          )}
        </>
      )}

      {activeTab === "search" && !submittedQuery && !searchQuery.isFetching && (
        <EmptyState
          icon={Sparkles}
          title="Start your product search"
          description="Enter a keyword above to search across configured marketplaces."
        />
      )}

      <SearchFilterDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={huntFilters}
        onApply={setHuntFilters}
        priceMin={priceMin}
        priceMax={priceMax}
        onPriceRangeChange={(min, max) => {
          setPriceMin(min);
          setPriceMax(max);
        }}
      />

      <ProductDetailDrawer
        product={detailProduct}
        open={Boolean(detailProduct)}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        initialTab={drawerTab}
        onAddToPipeline={handleAddToPipeline}
        onAddToWatchlist={handleAddToWatchlist}
        onPipelineWithValidation={handlePipelineWithValidation}
        pipelinePending={addToPipeline.isPending}
        savePending={addToWatchlist.isPending}
      />
    </div>
  );
}
