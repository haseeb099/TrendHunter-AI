import { useEffect, useMemo, useRef, useState } from "react";
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
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";
import type { ProductDrawerTab } from "@/components/product-workspace/types";
import type { ProductValidationResult } from "@/components/product-workspace/types";
import { SearchFilterDrawer } from "@/components/SearchFilterDrawer";
import { Search, Filter, Info, Sparkles, Compass, Zap, Database, RotateCcw } from "lucide-react";
import { DiscoverToolbar } from "@/components/discover/DiscoverToolbar";
import { ResultsPagination } from "@/components/ResultsPagination";
import { useTrendWindow } from "@/_core/hooks/useTrendWindow";
import { useAuth } from "@/_core/hooks/useAuth";
import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import type { ProductHuntFilters, ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { useOnboarding } from "@/_core/hooks/useOnboarding";
import { ProviderStatusBar } from "@/components/intelligence/ProviderStatusBar";
import { toastTrpcError } from "@/lib/trpcErrors";

const LIVE_SEARCH_PREF_KEY = "trendhunter:liveSearch";

function readLiveSearchPref(): boolean {
  try {
    return localStorage.getItem(LIVE_SEARCH_PREF_KEY) === "true";
  } catch {
    return false;
  }
}

function persistLiveSearchPref(value: boolean) {
  try {
    localStorage.setItem(LIVE_SEARCH_PREF_KEY, String(value));
  } catch {
    /* ignore */
  }
}

type SearchPlatform =
  | "all"
  | "ebay"
  | "amazon"
  | "shopify"
  | "tiktok"
  | "aliexpress"
  | "cj";

const SEARCH_PLATFORMS: SearchPlatform[] = [
  "all",
  "ebay",
  "amazon",
  "shopify",
  "tiktok",
  "aliexpress",
  "cj",
];

function isSearchPlatform(value: string): value is SearchPlatform {
  return (SEARCH_PLATFORMS as readonly string[]).includes(value);
}

const PAGE_SIZE_OPTIONS = [24, 48, 96, 200] as const;

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
  const [liveSearch, setLiveSearch] = useState(readLiveSearchPref);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(48);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsAnchorRef = useRef<HTMLDivElement>(null);
  const { completeStep } = useOnboarding();
  const { window: trendWindow, setWindow: setTrendWindow, label: trendWindowLabel } = useTrendWindow();
  const { isAuthenticated } = useAuth();
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");

  const handleLiveSearchChange = (checked: boolean) => {
    setLiveSearch(checked);
    persistLiveSearchPref(checked);
  };

  const openProductDrawer = (product: ProductSearchResult, tab: ProductDrawerTab = "overview") => {
    setDetailProduct(product);
    setDrawerTab(tab);
  };

  const filterOptions = trpc.search.getFilterOptions.useQuery();
  const marketplaceCoverage = trpc.search.getMarketplaceCoverage.useQuery(undefined, {
    enabled: activeTab === "search",
  });
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
    const platformParam = params.get("platform");
    if (platformParam && isSearchPlatform(platformParam)) {
      setPlatform(platformParam);
    }
    if (params.get("live") === "true") {
      setLiveSearch(true);
      persistLiveSearchPref(true);
    }
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

  const discoverFilters = useMemo<ProductHuntFilters>(
    () => ({
      ...mergedFilters,
      query: discoverQuery.trim() || undefined,
    }),
    [mergedFilters, discoverQuery]
  );

  const categoryTreeQuery = trpc.search.getCategoryTree.useQuery(
    { region: huntFilters.region },
    { enabled: activeTab === "discover" }
  );

  const recordDiscoverView = trpc.analytics.recordDiscoverView.useMutation();

  const paginationParams = useMemo(
    () => ({ limit: pageSize, cursor: (currentPage - 1) * pageSize }),
    [pageSize, currentPage]
  );

  const trendingQuery = trpc.trending.getFeed.useQuery(
    {
      region: huntFilters.region,
      category: huntFilters.category,
      filters: discoverFilters,
      pagination: paginationParams,
      timeframe: trendWindow,
    },
    { enabled: activeTab === "discover" }
  );

  useEffect(() => {
    if (activeTab === "discover" && trendingQuery.data && trendingQuery.data.results.length > 0) {
      completeStep("discover");
    }
  }, [activeTab, trendingQuery.data?.results.length, completeStep]);

  useEffect(() => {
    if (activeTab === "discover" && isAuthenticated && trendingQuery.data) {
      recordDiscoverView.mutate({
        region: huntFilters.region,
        category: huntFilters.category,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record per feed fetch
  }, [activeTab, isAuthenticated, trendingQuery.dataUpdatedAt]);

  const searchQuery = trpc.search.searchProducts.useQuery(
    {
      query: submittedQuery,
      platform,
      filters: mergedFilters,
      live: liveSearch,
      pagination: paginationParams,
    },
    { enabled: activeTab === "search" && submittedQuery.length > 0, retry: false }
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    submittedQuery,
    platform,
    liveSearch,
    pageSize,
    huntFilters.region,
    huntFilters.category,
    huntFilters.subcategory,
    huntFilters.productType,
    huntFilters.sort,
    huntFilters.shipFrom,
    huntFilters.minRating,
    huntFilters.maxShippingDays,
    priceMin,
    priceMax,
    trendWindow,
    discoverQuery,
  ]);

  useEffect(() => {
    if (searchQuery.data?.creditsUsed && searchQuery.data.creditsUsed > 0) {
      void utils.credits.getWallet.invalidate();
    }
  }, [searchQuery.data?.creditsUsed, searchQuery.dataUpdatedAt, utils.credits.getWallet]);

  const addToWatchlist = trpc.watchlist.addToWatchlist.useMutation({
    onSuccess: async () => {
      await utils.watchlist.getWatchlist.invalidate();
      completeStep("watchlist");
      toast.success("Added to watchlist");
    },
    onError: (error) => toast.error(error.message || "Failed to add to watchlist"),
  });

  const addToPipeline = trpc.pipeline.createPipelineItem.useMutation({
    onSuccess: async () => {
      await utils.pipeline.getPipelineItems.invalidate();
      await utils.analytics.getDashboardMetrics.invalidate();
      completeStep("pipeline");
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    resultsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activeData = activeTab === "discover" ? trendingQuery.data : searchQuery.data;
  const isInitialLoading =
    (activeTab === "discover" ? trendingQuery.isFetching : searchQuery.isFetching) &&
    !activeData;
  const isPageLoading =
    (activeTab === "discover" ? trendingQuery.isFetching : searchQuery.isFetching) &&
    Boolean(activeData);
  const activeError = activeTab === "discover" ? trendingQuery.error : searchQuery.error;
  const refetchActive = activeTab === "discover" ? trendingQuery.refetch : searchQuery.refetch;
  const noSearchProvidersConfigured =
    activeTab === "search" &&
    marketplaceCoverage.data &&
    marketplaceCoverage.data.search.filter((p) => p.configured).length === 0;
  const displayResults = activeData?.results ?? [];
  const totalCount = activeData?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showingStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingEnd = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);

  useEffect(() => {
    if (currentPage > totalPages && totalCount > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, totalCount]);

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (huntFilters.region) chips.push(`Region: ${huntFilters.region}`);
    if (huntFilters.category) chips.push(`Category: ${huntFilters.category}`);
    if (huntFilters.subcategory) chips.push(`Subcategory: ${huntFilters.subcategory}`);
    if (huntFilters.productType) chips.push(`Type: ${huntFilters.productType}`);
    if (activeTab === "discover" && discoverQuery.trim()) {
      chips.push(`Search: ${discoverQuery.trim()}`);
    }
    if (priceMin > 0 || priceMax < 1000) chips.push(`Price: $${priceMin}–$${priceMax}`);
    if (huntFilters.shipFrom?.length) chips.push(`Ship: ${huntFilters.shipFrom.join(", ")}`);
    if (huntFilters.minRating) chips.push(`Rating ≥ ${huntFilters.minRating}`);
    if (huntFilters.maxShippingDays) chips.push(`Ship ≤ ${huntFilters.maxShippingDays}d`);
    if (huntFilters.sort && huntFilters.sort !== "trend_score") {
      chips.push(`Sort: ${huntFilters.sort.replace("_", " ")}`);
    }
    return chips;
  }, [huntFilters, priceMin, priceMax, activeTab, discoverQuery]);

  const discoverNeedsIngest =
    activeTab === "discover" &&
    !trendingQuery.isFetching &&
    trendingQuery.data &&
    trendingQuery.data.results.length === 0 &&
    trendingQuery.data.warnings?.some((w) => w.toLowerCase().includes("ingest"));

  const resultsPanel = (
    <div ref={resultsAnchorRef} className="space-y-4 scroll-mt-24">
      {activeFilterChips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <Badge key={chip} variant="secondary" className="text-xs">
              {chip}
            </Badge>
          ))}
        </div>
      ) : null}

      {isInitialLoading ? (
        <div className="flex justify-center py-12">
          <div className="space-y-3 text-center">
            <Spinner className="mx-auto h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              {activeTab === "discover" ? "Loading trending products..." : "Searching marketplaces..."}
            </p>
          </div>
        </div>
      ) : null}

      {activeError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{activeError.message}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                void refetchActive().catch((err) => toastTrpcError(err));
              }}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {noSearchProvidersConfigured ? (
        <EmptyState
          icon={Database}
          title="No search providers configured"
          description="Connect at least one marketplace API in your environment to run live searches. Cached catalog results may still appear after daily ingest."
        >
          <ProviderStatusBar compact className="mt-4 max-w-xl mx-auto" />
        </EmptyState>
      ) : null}

      {activeData?.warnings?.map((warning) => (
        <Alert key={warning} className="border-warning/30 bg-warning/5">
          <Info className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ))}

      {discoverNeedsIngest ? (
        <EmptyState
          icon={Compass}
          title="Trending products are updating"
          description="We're refreshing trending products for your region and category. Check back shortly — new picks appear throughout the day."
        />
      ) : null}

      {activeData && !isInitialLoading && !discoverNeedsIngest ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="font-display text-lg font-semibold sm:text-xl">
                {totalCount === 0
                  ? "No products"
                  : `Showing ${showingStart}–${showingEnd} of ${totalCount} product${totalCount !== 1 ? "s" : ""}`}
              </h2>
              {totalPages > 1 ? (
                <p className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v) as (typeof PAGE_SIZE_OPTIONS)[number])}
              >
                <SelectTrigger className="h-9 w-[128px] text-xs">
                  <SelectValue placeholder="Per page" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeTab === "search" ? (
                <DataFreshnessBadge
                  dataMode={activeData.dataMode ?? "cached"}
                  cachedAt={activeData.cachedAt}
                  stale={activeData.stale}
                  creditsUsed={activeData.creditsUsed}
                />
              ) : null}
              {activeTab === "search" && activeData.sources.length > 0
                ? activeData.sources.map((source) => (
                    <Badge key={source} variant="outline" className="text-[10px] capitalize">
                      {source.replace("_", " ")}
                    </Badge>
                  ))
                : null}
            </div>
          </div>

          {displayResults.length > 0 ? (
            <div
              className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${
                isPageLoading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {displayResults.map((product) => (
                <ProductCard
                  key={`${product.platform}-${product.id}`}
                  product={product}
                  onSave={handleAddToWatchlist}
                  onPipeline={handleAddToPipeline}
                  onViewDetails={openProductDrawer}
                  savePending={addToWatchlist.isPending}
                  pipelinePending={addToPipeline.isPending}
                  showTrendBadge={activeTab === "discover"}
                  showRankReason
                  showDataFreshness={activeTab === "search"}
                  showSourceMeta={activeTab === "search"}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState
                icon={Search}
                title="No products found"
                description="Try different keywords, region, or widen your filters."
              />
              {activeData.recoverySuggestions && activeData.recoverySuggestions.length > 0 ? (
                <Card className="space-y-3 p-4">
                  <p className="text-sm font-medium">Try these related searches</p>
                  <div className="flex flex-wrap gap-2">
                    {activeData.recoverySuggestions.map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuery(suggestion);
                          setSubmittedQuery(suggestion);
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                  {activeTab === "search" ? (
                    <p className="text-xs text-muted-foreground">
                      Live search uses 1 credit when providers return results.
                    </p>
                  ) : null}
                </Card>
              ) : null}
            </div>
          )}

          {isPageLoading ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Loading page…
            </div>
          ) : null}

          <ResultsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            disabled={isPageLoading}
          />
        </>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Product Search"
        description="Discover trending products and search connected marketplaces — cached by default, live on demand."
      />

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

        <TabsContent value="discover" className="mt-6">
          <div className="overflow-hidden rounded-xl border border-border bg-card/30">
            <DiscoverToolbar
              tree={categoryTreeQuery.data?.tree ?? []}
              loading={categoryTreeQuery.isLoading}
              regions={filterOptions.data?.regions ?? []}
              region={huntFilters.region ?? "US"}
              onRegionChange={(code) => setHuntFilters((f) => ({ ...f, region: code }))}
              searchQuery={discoverQuery}
              onSearchQueryChange={setDiscoverQuery}
              selectedCategory={huntFilters.category}
              selectedSubcategory={huntFilters.subcategory}
              selectedProductType={huntFilters.productType}
              trendWindow={trendWindow}
              onTrendWindowChange={setTrendWindow}
              categorySheetOpen={categorySheetOpen}
              onCategorySheetOpenChange={setCategorySheetOpen}
              onCategorySelect={(selection) =>
                setHuntFilters((f) => ({
                  ...f,
                  category: selection.category,
                  subcategory: selection.subcategory,
                  productType: selection.productType,
                }))
              }
              onOpenFilters={() => setFiltersOpen(true)}
            />
            <div className="space-y-4 p-4 sm:p-5">
              {trendingQuery.data && !trendingQuery.isFetching ? (
                <p className="text-xs text-muted-foreground">Trending · {trendWindowLabel}</p>
              ) : null}
              {resultsPanel}
            </div>
          </div>
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
                    onCheckedChange={handleLiveSearchChange}
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

              <div className="px-4 sm:px-5 pb-4 flex items-start gap-2 text-xs text-muted-foreground border-b border-border bg-muted/10">
                {liveSearch ? (
                  <>
                    <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" />
                    <span>
                      Live search queries marketplaces now and uses <strong>1 credit</strong> per search.
                    </span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>
                      <strong>Cached search (default)</strong> — free, instant results from saved snapshots.
                      Enable Live when you need fresh marketplace data.
                    </span>
                  </>
                )}
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
                        TikTok Shop
                      </SelectItem>
                      <SelectItem value="aliexpress">AliExpress</SelectItem>
                      <SelectItem value="cj">CJ Dropshipping</SelectItem>
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

      {activeTab === "search" ? resultsPanel : null}

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
